"use client";

import React from "react";
import type { Affiliation } from "../types/paper";
import { useGlobeScene } from "../hooks/useGlobeScene";
import { useAffiliationVisualization } from "../hooks/useAffiliationVisualization";

interface GlobeProps {
    affiliations?: Affiliation[];
}

/**
 * Globe component that renders an interactive 3D globe with affiliation markers.
 * Uses Three.js for WebGL rendering and displays paper affiliations as pulsing
 * markers connected by bezier curves.
 */
const Globe: React.FC<GlobeProps> = ({ affiliations }) => {
    // Set up the Three.js scene, camera, renderer, and globe
    const {
        containerRef,
        sceneRef,
        globeGroupRef,
        targetRotationYRef,
        isRotatingRef,
        setMarkerGroup,
    } = useGlobeScene();

    // Handle affiliation visualization (markers, curves, rotation)
    useAffiliationVisualization({
        affiliations,
        sceneRef,
        globeGroupRef,
        targetRotationYRef,
        isRotatingRef,
        setMarkerGroup,
    });

    return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
};

export default Globe;
