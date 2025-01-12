"use client"; // Enables client-side rendering, required for three.js

import React, {useRef, useEffect} from "react";
import * as Three from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const DEG2RAD = Math.PI / 180;

const Globe: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    let imageData: ImageData | null = null;

    // Function to check if a pixel represents land
    const isLandPixelVisible = (long: number, lat: number): boolean => {
        if (!imageData) return false;

        const imgWidth = imageData.width;
        const imgHeight = imageData.height;

        const pixelRow = Math.floor((imgHeight / 180) * (-lat + 90));
        const pixelColumn = Math.floor((imgWidth / 360) * ((long + 180) % 360));

        return (
            imageData.data[pixelRow * imgWidth * 4 + pixelColumn * 4 + 3] > 120 // Alpha channel threshold
        );
    };

    // Function to draw landmass on the globe
    const drawLandmassOnGlobe = (scene: Three.Scene) => {
        if (!imageData) {
            console.error("Image data not loaded");
            return;
        }

        let geometries: Three.BufferGeometry[] = [];
        const rows = 160; // Latitude resolution
        const dotDensity = 80; // Dots per unit of circumference

        for (let lat = -90; lat <= 90; lat += 180 / rows) {
            const radius = Math.cos(Math.abs(lat) * DEG2RAD);
            const circumference = radius * Math.PI * 2;
            const dotsForLat = Math.floor(circumference * dotDensity);

            for (let x = 0; x < dotsForLat; x += 1) {
                const long = (x * 360) / dotsForLat;

                if (!isLandPixelVisible(long, lat)) {
                    continue;
                }

                const geometryCircle = new Three.CircleGeometry(0.005, 5);

                const xCoord =
                    Math.sin(long * DEG2RAD) * Math.cos(lat * DEG2RAD) * 1.001;
                const yCoord = Math.sin(lat * DEG2RAD) * 1.001;
                const zCoord =
                    Math.cos(long * DEG2RAD) * Math.cos(lat * DEG2RAD) * 1.001;

                const m = new Three.Matrix4();
                const vecX = new Three.Vector3(1, 0, 0);
                m.makeRotationAxis(vecX, -lat * DEG2RAD);
                geometryCircle.applyMatrix4(m);

                const vecY = new Three.Vector3(0, 1, 0);
                m.makeRotationAxis(vecY, long * DEG2RAD);
                geometryCircle.applyMatrix4(m);

                m.makeTranslation(xCoord, yCoord, zCoord);
                geometryCircle.applyMatrix4(m);

                geometries.push(geometryCircle);
            }
        }

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(
            geometries,
            false
        );

        const materialCircle = new Three.MeshBasicMaterial({ color: 0xffffff });
        materialCircle.side = Three.DoubleSide;

        const landMesh = new Three.Mesh(mergedGeometry, materialCircle);
        scene.add(landMesh);
    };

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
            const renderer = new Three.WebGLRenderer({antialias: true});
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
                    drawLandmassOnGlobe(scene); // Draw landmass after image data is loaded
                }
            });

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

    return <div ref={containerRef} className="w-full h-full overflow-hidden"/>;
};

export default Globe;
