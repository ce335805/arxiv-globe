"use client";

import { useRef, useEffect, useCallback } from "react";
import * as Three from "three";
import { drawLandmassOnGlobe } from "../utils/landmass";
import { updateMarkerPulse } from "../utils/markers";

/**
 * Custom hook that sets up and manages the Three.js globe scene.
 */
export const useGlobeScene = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sceneRef = useRef<Three.Scene | null>(null);
    const globeGroupRef = useRef<Three.Group | null>(null);
    const targetRotationYRef = useRef<number>(0);
    const isRotatingRef = useRef<boolean>(false);
    const markerGroupRef = useRef<Three.Group | null>(null);

    const setMarkerGroup = useCallback((group: Three.Group | null) => {
        markerGroupRef.current = group;
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new Three.Scene();
        scene.background = new Three.Color(0xffffff);
        sceneRef.current = scene;

        // Camera setup
        const camera = new Three.PerspectiveCamera(70, width / height, 0.005, 10);
        camera.position.y = 0.35;
        camera.position.z = 2.3;

        // Renderer setup
        const renderer = new Three.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Create a group to hold the sphere and landmass
        const globeGroup = new Three.Group();
        scene.add(globeGroup);
        globeGroupRef.current = globeGroup;

        // Create the globe sphere
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
        const ambientLight = new Three.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight = new Three.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(-1, 1, 0.8);
        scene.add(directionalLight);

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
        let animationFrameId: number;
        const renderScene = () => {
            // Smooth rotation towards target or continuous rotation
            if (isRotatingRef.current) {
                const currentRotation = globeGroup.rotation.y;
                const targetRotation = targetRotationYRef.current;

                // Calculate the shortest angular distance
                let diff = targetRotation - currentRotation;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;

                // Interpolate with damping
                globeGroup.rotation.y += diff * 0.05;

                // Stop rotating when close enough
                if (Math.abs(diff) < 0.01) {
                    globeGroup.rotation.y = targetRotation;
                    isRotatingRef.current = false;
                }
            } else {
                // Continuous slow rotation
                globeGroup.rotation.y += 0.001;
            }

            // Update marker pulsing animation
            if (markerGroupRef.current) {
                updateMarkerPulse(markerGroupRef.current, Date.now() * 0.001);
            }

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(renderScene);
        };

        renderScene();

        // Resize handling
        const handleResize = () => {
            if (!container) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener("resize", handleResize);

        // Cleanup on unmount
        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
            if (container && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return {
        containerRef,
        sceneRef,
        globeGroupRef,
        targetRotationYRef,
        isRotatingRef,
        setMarkerGroup,
    };
};
