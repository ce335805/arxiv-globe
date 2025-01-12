"use client"; // Enables client-side rendering, required for three.js

import React, { useRef, useEffect } from "react";
import * as Three from "three";

const Globe: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

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

            // Create a sphere (globe)
            const geometry = new Three.SphereGeometry(1, 64, 64);
            const material = new Three.MeshPhongMaterial({
                color: 0x3A93C0,
                opacity: 1.,
                transparent: true,
                shininess: 5.
            });
            const sphere = new Three.Mesh(geometry, material);
            scene.add(sphere);

            const ambientLight = new Three.AmbientLight(0xffffff, 0.3);
            scene.add(ambientLight);

            const directionalLight1 = new Three.DirectionalLight(0xffffff, 0.3);
            directionalLight1.position.set(-1, 1, .8);
            scene.add(directionalLight1);

            const directionalLight2 = new Three.DirectionalLight(0xffffff, 0.3);
            directionalLight2.position.set(-1, .5, 1.5);
            scene.add(directionalLight2);

            const directionalLight3 = new Three.DirectionalLight(0xffffff, 0.3);
            directionalLight3.position.set(-1, 1.5, 1.5);
            scene.add(directionalLight3);

            const directionalLight5 = new Three.DirectionalLight(0xffffff, .4);
            directionalLight5.position.set(-1, 1., -2.);
            scene.add(directionalLight5);

            const directionalLight6 = new Three.DirectionalLight(0xffffff, 1.25);
            directionalLight6.position.set(-1, 0.3, -1.2);
            scene.add(directionalLight6);

            camera.position.z = 2.8;

            // Animation loop
            const renderScene = () => {
                sphere.rotation.x += 0.005;
                sphere.rotation.y += 0.001;
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
            };
        }
    }, []);

    return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
};

export default Globe;
