import * as Three from "three";
import { latLonToVector3 } from "./coordinates";

// Default marker appearance
const MARKER_COLOR = 0xff6b6b; // Coral red
const MARKER_SIZE = 0.015;
const MARKER_RADIUS = 1.005;

/**
 * Create affiliation markers as pulsing points on the globe.
 */
export const createAffiliationMarkers = (
    affiliations: Array<{ latitude: number; longitude: number }>
): Three.Group => {
    const markerGroup = new Three.Group();

    affiliations.forEach((affiliation) => {
        const position = latLonToVector3(
            affiliation.latitude,
            affiliation.longitude,
            MARKER_RADIUS
        );

        const geometry = new Three.SphereGeometry(MARKER_SIZE, 16, 16);
        const material = new Three.MeshBasicMaterial({
            color: MARKER_COLOR,
            transparent: true,
            opacity: 0.9
        });

        const marker = new Three.Mesh(geometry, material);
        marker.position.copy(position);
        markerGroup.add(marker);
    });

    return markerGroup;
};

/**
 * Remove markers from scene and dispose of resources.
 */
export const removeMarkers = (
    scene: Three.Scene,
    markerGroup: Three.Group
): void => {
    scene.remove(markerGroup);

    markerGroup.traverse((child) => {
        if (child instanceof Three.Mesh) {
            child.geometry?.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m) => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });

    markerGroup.clear();
};

/**
 * Update pulsing animation for markers. Call this in the render loop.
 */
export const updateMarkerPulse = (
    markerGroup: Three.Group,
    time: number
): void => {
    const scale = 1.0 + Math.sin(time * 2.0) * 0.3;

    markerGroup.children.forEach((marker) => {
        if (marker instanceof Three.Mesh) {
            marker.scale.setScalar(scale);
        }
    });
};
