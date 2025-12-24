"use client";

import { useEffect, useRef } from "react";
import * as Three from "three";
import type { Affiliation, ValidAffiliation } from "../types/paper";
import { latLonToVector3 } from "../utils/coordinates";
import { createAffiliationMarkers, removeMarkers } from "../utils/markers";
import { createCurvesBetweenMarkers, createSelfLoopCurve, removeCurves } from "../utils/curves";

interface UseAffiliationVisualizationProps {
    affiliations?: Affiliation[];
    sceneRef: React.RefObject<Three.Scene | null>;
    globeGroupRef: React.RefObject<Three.Group | null>;
    targetRotationYRef: React.RefObject<number>;
    isRotatingRef: React.RefObject<boolean>;
    setMarkerGroup: (group: Three.Group | null) => void;
}

/**
 * Type guard to check if an affiliation has valid geocoded coordinates.
 */
const isValidAffiliation = (aff: Affiliation): aff is ValidAffiliation => {
    return aff.geocoded && aff.latitude !== null && aff.longitude !== null;
};

/**
 * Filter affiliations to only include those with valid geocoded coordinates.
 */
const filterValidAffiliations = (affiliations: Affiliation[]): ValidAffiliation[] => {
    return affiliations.filter(isValidAffiliation);
};

/**
 * Custom hook that manages affiliation visualization on the globe.
 */
export const useAffiliationVisualization = ({
    affiliations,
    sceneRef,
    globeGroupRef,
    targetRotationYRef,
    isRotatingRef,
    setMarkerGroup,
}: UseAffiliationVisualizationProps): void => {
    const markerGroupRef = useRef<Three.Group | null>(null);
    const curveGroupRef = useRef<Three.Group | null>(null);

    useEffect(() => {
        const scene = sceneRef.current;
        const globeGroup = globeGroupRef.current;

        if (!scene || !globeGroup) return;

        // Clean up existing markers and curves
        if (markerGroupRef.current) {
            removeMarkers(scene, markerGroupRef.current);
            markerGroupRef.current = null;
            setMarkerGroup(null);
        }
        if (curveGroupRef.current) {
            removeCurves(scene, curveGroupRef.current);
            curveGroupRef.current = null;
        }

        // If no affiliations, just show the globe
        if (!affiliations || affiliations.length === 0) {
            return;
        }

        // Filter to only geocoded affiliations with valid coordinates
        const validAffiliations = filterValidAffiliations(affiliations);

        if (validAffiliations.length === 0) {
            console.warn("Globe: No valid geocoded affiliations to display");
            return;
        }

        // Calculate rotation to center the first affiliation
        const firstAffiliation = validAffiliations[0];
        const firstPosition = latLonToVector3(
            firstAffiliation.latitude,
            firstAffiliation.longitude,
            1.0
        );

        // Set target rotation and trigger animation
        targetRotationYRef.current = -Math.atan2(firstPosition.x, firstPosition.z);
        isRotatingRef.current = true;

        // Create new markers
        const markers = createAffiliationMarkers(validAffiliations);
        globeGroup.add(markers);
        markerGroupRef.current = markers;
        setMarkerGroup(markers);

        // Create curves based on number of affiliations
        let curves: Three.Group;
        if (validAffiliations.length === 1) {
            curves = createSelfLoopCurve(validAffiliations[0]);
        } else {
            curves = createCurvesBetweenMarkers(validAffiliations, validAffiliations.length > 2);
        }
        globeGroup.add(curves);
        curveGroupRef.current = curves;
    }, [affiliations, sceneRef, globeGroupRef, targetRotationYRef, isRotatingRef, setMarkerGroup]);
};
