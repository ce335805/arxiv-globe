"use client"; // Enables client-side rendering, required for three.js

import React, { useRef, useEffect, useState } from "react";
import * as Three from "three";
import {
    drawLandmassOnGlobe,
    createAffiliationMarkers,
    updateMarkerPulse,
    createCurvesBetweenMarkers,
    removeCurves
} from "../utils/globeUtils";

const Globe: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [markerGroup, setMarkerGroup] = useState<Three.Group | null>(null);
    const [curveGroup, setCurveGroup] = useState<Three.Group | null>(null);
    let imageData: ImageData | null = null;

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Scene setup
            const scene = new Three.Scene();
            scene.background = new Three.Color(0xffffff); // Set background to white

            // Camera setup
            const camera = new Three.PerspectiveCamera(
                70,
                window.innerWidth / window.innerHeight,
                0.005,
                10
            );

            // Renderer setup
            const renderer = new Three.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            containerRef.current?.appendChild(renderer.domElement);

            // Create a group to hold the sphere and landmass
            const globeGroup = new Three.Group();
            scene.add(globeGroup);

            // Create a sphere (globe)
            const geometry = new Three.SphereGeometry(1, 64, 64);
            const material = new Three.MeshPhongMaterial({
                color: 0x3a93c0,
                opacity: 1.0,
                transparent: true,
                shininess: 5.0,
            });
            const sphere = new Three.Mesh(geometry, material);
            globeGroup.add(sphere); // Add sphere to the group

            // Add lighting
            const ambientLight = new Three.AmbientLight(0xffffff, .7);
            scene.add(ambientLight);

            const directionalLight1 = new Three.DirectionalLight(0xffffff, 1.5);
            directionalLight1.position.set(-1, 1, 0.8);
            scene.add(directionalLight1);

            camera.position.z = 2.8;

            // Load the world map image
            const imageLoader = new Three.ImageLoader();

            imageLoader.load("/worldmap.png", (image) => {
                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                canvas.width = image.width;
                canvas.height = image.height;
                context?.drawImage(image, 0, 0);

                const imgData = context?.getImageData(0, 0, canvas.width, canvas.height);

                if (imgData) {
                    imageData = imgData; // Save image data in a variable
                    console.log("Image data loaded and saved:", imgData);

                    const landmass = drawLandmassOnGlobe(imageData); // Get the landmass
                    if (landmass) globeGroup.add(landmass); // Add the landmass to the group

                    // Test data: Add affiliation markers
                    // These coordinates are from real places:
                    // - Graz, Austria (TU Graz)
                    // - Cambridge, MA (MIT)
                    // - London, UK
                    // - Tokyo, Japan
                    // - Sydney, Australia
                    const testAffiliations = [
                        { latitude: 47.0707, longitude: 15.4395, geocoded: true }, // Graz
                        { latitude: 42.3601, longitude: -71.0589, geocoded: true }, // MIT
                        { latitude: 51.5074, longitude: -0.1278, geocoded: true }, // London
                        { latitude: 35.6762, longitude: 139.6503, geocoded: true }, // Tokyo
                        { latitude: -33.8688, longitude: 151.2093, geocoded: true }  // Sydney
                    ];

                    const markers = createAffiliationMarkers(testAffiliations, {
                        color: 0xff6b6b, // Coral red
                        size: 0.015
                    });

                    globeGroup.add(markers);
                    setMarkerGroup(markers);
                    console.log("Added affiliation markers:", testAffiliations.length);

                    // Create curves connecting the markers
                    const curves = createCurvesBetweenMarkers(testAffiliations, {
                        color: 0x64b5f6,           // Light blue
                        tubeRadius: 0.003,         // Thin tube
                        tubularSegments: 64,       // Smooth curve
                        radialSegments: 8,         // Octagonal cross-section
                        emissiveIntensity: 0.6,    // Moderate glow
                        markerRadius: 1.005,       // Same as markers
                        closeLoop: true            // Connect back to start
                    });

                    globeGroup.add(curves);
                    setCurveGroup(curves);
                    console.log("Added curves between markers:", testAffiliations.length);
                }
            });

            // Animation loop
            const renderScene = () => {
                globeGroup.rotation.y += 0.005; // Rotate the entire group

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
                const width = window.innerWidth;
                const height = window.innerHeight;

                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            };

            window.addEventListener("resize", handleResize);

            // Cleanup on unmount
            return () => {
                window.removeEventListener("resize", handleResize);
                if (containerRef.current) {
                    containerRef.current.removeChild(renderer.domElement);
                }
                // Cleanup curves if they exist
                if (curveGroup && scene) {
                    removeCurves(scene, curveGroup);
                }
            };
        }
    }, []);

    return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
};

export default Globe;
