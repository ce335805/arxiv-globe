"use client"; // Enables client-side rendering, required for three.js

import React, { useRef, useEffect, useState } from "react";
import * as Three from "three";
import type { Affiliation } from "../types/paper";
import {
    drawLandmassOnGlobe,
    createAffiliationMarkers,
    updateMarkerPulse,
    createCurvesBetweenMarkers,
    createSelfLoopCurve,
    removeCurves,
    removeMarkers,
    latLonToVector3
} from "../utils/globeUtils";

interface GlobeProps {
    affiliations?: Affiliation[];
}

const Globe: React.FC<GlobeProps> = ({ affiliations }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Three.Scene | null>(null);
    const globeGroupRef = useRef<Three.Group | null>(null);
    const [markerGroup, setMarkerGroup] = useState<Three.Group | null>(null);
    const [curveGroup, setCurveGroup] = useState<Three.Group | null>(null);
    const targetRotationYRef = useRef<number>(0);
    const isRotatingRef = useRef<boolean>(false);

    // One-time setup: scene, camera, renderer, globe, and landmass
    useEffect(() => {
        if (typeof window !== "undefined" && containerRef.current) {
            // Get container dimensions
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            // Scene setup
            const scene = new Three.Scene();
            scene.background = new Three.Color(0xffffff);
            sceneRef.current = scene;

            // Camera setup
            const camera = new Three.PerspectiveCamera(
                70,
                width / height,
                0.005,
                10
            );
            camera.position.z = 2.3;

            // Renderer setup
            const renderer = new Three.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            containerRef.current.appendChild(renderer.domElement);

            // Create a group to hold the sphere and landmass
            const globeGroup = new Three.Group();
            scene.add(globeGroup);
            globeGroupRef.current = globeGroup;

            // Create a sphere (globe)
            const geometry = new Three.SphereGeometry(1, 64, 64);
            const material = new Three.MeshPhongMaterial({
                color: 0x3a93c0,
                opacity: 1.0,
                transparent: true,
                shininess: 5.0,
            });
            const sphere = new Three.Mesh(geometry, material);
            globeGroup.add(sphere);

            // Add lighting
            const ambientLight = new Three.AmbientLight(0xffffff, .7);
            scene.add(ambientLight);

            const directionalLight1 = new Three.DirectionalLight(0xffffff, 1.5);
            directionalLight1.position.set(-1, 1, 0.8);
            scene.add(directionalLight1);

            // Load the world map image and draw landmass
            const imageLoader = new Three.ImageLoader();
            imageLoader.load("/worldmap.png", (image) => {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                canvas.width = image.width;
                canvas.height = image.height;
                context?.drawImage(image, 0, 0);

                const imgData = context?.getImageData(0, 0, canvas.width, canvas.height);

                if (imgData) {
                    const landmass = drawLandmassOnGlobe(imgData);
                    if (landmass) globeGroup.add(landmass);
                }
            });

            // Animation loop
            const renderScene = () => {
                // Smooth rotation towards target or continuous rotation
                if (isRotatingRef.current) {
                    // Smoothly interpolate towards target rotation
                    const currentRotation = globeGroup.rotation.y;
                    const targetRotation = targetRotationYRef.current;

                    // Calculate the shortest angular distance
                    let diff = targetRotation - currentRotation;
                    // Normalize to [-PI, PI]
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;

                    // Interpolate with damping (adjust 0.05 for faster/slower rotation)
                    const rotationSpeed = 0.05;
                    globeGroup.rotation.y += diff * rotationSpeed;

                    // Stop rotating when close enough (threshold: 0.01 radians)
                    if (Math.abs(diff) < 0.01) {
                        globeGroup.rotation.y = targetRotation;
                        isRotatingRef.current = false;
                    }
                } else {
                    // Continuous slow rotation when not animating to target
                    globeGroup.rotation.y += 0.001;
                }

                // Update marker pulsing animation
                if (markerGroup) {
                    updateMarkerPulse(markerGroup, Date.now() * 0.001);
                }

                renderer.render(scene, camera);
                requestAnimationFrame(renderScene);
            };

            renderScene();

            // Resize handling
            const handleResize = () => {
                if (!containerRef.current) return;

                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;

                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            };

            window.addEventListener("resize", handleResize);

            // Cleanup on unmount
            return () => {
                window.removeEventListener("resize", handleResize);
                if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                    containerRef.current.removeChild(renderer.domElement);
                }
            };
        }
    }, []);

    // Dynamic markers and curves based on affiliations prop
    useEffect(() => {
        const scene = sceneRef.current;
        const globeGroup = globeGroupRef.current;

        if (!scene || !globeGroup) return;

        // Clean up existing markers and curves
        if (markerGroup) {
            removeMarkers(scene, markerGroup);
            setMarkerGroup(null);
        }
        if (curveGroup) {
            removeCurves(scene, curveGroup);
            setCurveGroup(null);
        }

        // If no affiliations or empty array, just show the globe
        if (!affiliations || affiliations.length === 0) {
            console.log("Globe: No affiliations data");
            return;
        }

        // Log received affiliation data
        console.log("Globe: Received affiliations:", affiliations);

        // Filter to only geocoded affiliations with valid coordinates
        const validAffiliations: Affiliation[] = [];
        const skippedAffiliations: Array<{affiliation: Affiliation, reason: string}> = [];

        affiliations.forEach((aff) => {
            if (!aff.geocoded) {
                skippedAffiliations.push({
                    affiliation: aff,
                    reason: "geocoding failed (geocoded: false)"
                });
            } else if (aff.latitude === null || aff.longitude === null) {
                skippedAffiliations.push({
                    affiliation: aff,
                    reason: "missing coordinates (latitude or longitude is null)"
                });
            } else {
                validAffiliations.push(aff);
            }
        });

        // Log warnings for skipped affiliations
        if (skippedAffiliations.length > 0) {
            console.warn(`Globe: Skipping ${skippedAffiliations.length} affiliation(s) due to missing/invalid coordinates:`);
            skippedAffiliations.forEach(({ affiliation, reason }) => {
                console.warn(`  - ${affiliation.institution} (${affiliation.country}): ${reason}`);
            });
        }

        console.log(`Globe: Rendering ${validAffiliations.length} valid geocoded affiliation(s)`);

        if (validAffiliations.length === 0) {
            console.warn("Globe: No valid geocoded affiliations to display");
            return;
        }

        // Calculate rotation to center the first affiliation
        const firstAffiliation = validAffiliations[0];
        const firstPosition = latLonToVector3(
            firstAffiliation.latitude!,
            firstAffiliation.longitude!,
            1.0 // Use radius 1.0 for the globe surface
        );

        // Calculate the rotation needed to face this position towards the camera
        // Camera is at (0, 0, 2.8) looking at origin, so we want the point to face -Z direction
        // We need to negate the angle because we're rotating the globe, not the camera
        const targetRotationY = -Math.atan2(firstPosition.x, firstPosition.z);

        // Set target rotation and trigger animation
        targetRotationYRef.current = targetRotationY;
        isRotatingRef.current = true;

        console.log(`Globe: Rotating to center ${firstAffiliation.institution} at lat:${firstAffiliation.latitude}, lon:${firstAffiliation.longitude} (rotation: ${targetRotationY.toFixed(2)} rad)`);

        // Create new markers
        const markers = createAffiliationMarkers(validAffiliations, {
            color: 0xff6b6b, // Coral red
            size: 0.015
        });
        globeGroup.add(markers);
        setMarkerGroup(markers);

        // Create curves based on number of affiliations
        if (validAffiliations.length === 1) {
            // Special case: single affiliation - create a self-returning loop
            const curves = createSelfLoopCurve(validAffiliations[0], {
                color: 0x64b5f6,
                tubeRadius: 0.003,
                tubularSegments: 64,
                radialSegments: 8,
                emissiveIntensity: 0.6,
                markerRadius: 1.005,
                loopHeight: 0.3  // How far the loop extends from the surface
            });
            globeGroup.add(curves);
            setCurveGroup(curves);
        } else if (validAffiliations.length >= 2) {
            // Multiple affiliations - create normal curves
            const curves = createCurvesBetweenMarkers(validAffiliations, {
                color: 0x64b5f6,           // Light blue
                tubeRadius: 0.003,         // Thin tube
                tubularSegments: 64,       // Smooth curve
                radialSegments: 8,         // Octagonal cross-section
                emissiveIntensity: 0.6,    // Moderate glow
                markerRadius: 1.005,       // Same as markers
                closeLoop: validAffiliations.length > 2  // Only close loop if 3+ points
            });
            globeGroup.add(curves);
            setCurveGroup(curves);
        }
    }, [affiliations]);

    return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
};

export default Globe;
