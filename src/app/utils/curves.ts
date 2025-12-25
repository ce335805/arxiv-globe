import * as Three from "three";
import { latLonToVector3 } from "./coordinates";

// Default curve appearance
const CURVE_COLOR = 0x64b5f6; // Light blue
const TUBE_RADIUS = 0.003;
const MARKER_RADIUS = 1.005;

/**
 * Calculate the arc height based on the angular distance between two points.
 */
const calculateArcHeight = (point1: Three.Vector3, point2: Three.Vector3): number => {
    const p1 = point1.clone().normalize();
    const p2 = point2.clone().normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, p1.dot(p2))));
    return 0.4 + (angle / Math.PI) * 1.6; // Range: 0.4 to 2.0
};

/**
 * Calculate the control point for a bezier curve between two points.
 */
const calculateControlPoint = (point1: Three.Vector3, point2: Three.Vector3, arcHeight: number): Three.Vector3 => {
    const midpoint = new Three.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    return midpoint.normalize().multiplyScalar(1 + arcHeight);
};

/**
 * Create a tube mesh for a curve.
 */
const createTubeMesh = (curve: Three.Curve<Three.Vector3>): Three.Mesh => {
    const geometry = new Three.TubeGeometry(curve, 64, TUBE_RADIUS, 8, false);
    const material = new Three.MeshStandardMaterial({
        color: CURVE_COLOR,
        transparent: true,
        opacity: 0.7,
        emissive: CURVE_COLOR,
        emissiveIntensity: 0.6,
        metalness: 0.0,
        roughness: 0.5
    });
    return new Three.Mesh(geometry, material);
};

/**
 * Create bezier curves connecting affiliations in sequence.
 */
export const createCurvesBetweenMarkers = (
    affiliations: Array<{ latitude: number; longitude: number }>,
    closeLoop: boolean = false
): Three.Group => {
    const curveGroup = new Three.Group();

    if (affiliations.length < 2) {
        return curveGroup;
    }

    // Convert all positions
    const positions = affiliations.map((aff) =>
        latLonToVector3(aff.latitude, aff.longitude, MARKER_RADIUS)
    );

    // Create curves between consecutive pairs
    for (let i = 0; i < positions.length - 1; i++) {
        const p1 = positions[i];
        const p2 = positions[i + 1];
        const arcHeight = calculateArcHeight(p1, p2);
        const controlPoint = calculateControlPoint(p1, p2, arcHeight);
        const curve = new Three.QuadraticBezierCurve3(p1, controlPoint, p2);
        curveGroup.add(createTubeMesh(curve));
    }

    // Close loop if requested and more than 2 points
    if (closeLoop && positions.length > 2) {
        const p1 = positions[positions.length - 1];
        const p2 = positions[0];
        const arcHeight = calculateArcHeight(p1, p2);
        const controlPoint = calculateControlPoint(p1, p2, arcHeight);
        const curve = new Three.QuadraticBezierCurve3(p1, controlPoint, p2);
        curveGroup.add(createTubeMesh(curve));
    }

    return curveGroup;
};

/**
 * Remove curves from scene and dispose of resources.
 */
export const removeCurves = (scene: Three.Scene, curveGroup: Three.Group): void => {
    scene.remove(curveGroup);

    curveGroup.traverse((child) => {
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

    curveGroup.clear();
};

/**
 * Create a self-loop curve for a single affiliation.
 */
export const createSelfLoopCurve = (
    affiliation: { latitude: number; longitude: number }
): Three.Group => {
    const curveGroup = new Three.Group();
    const position = latLonToVector3(affiliation.latitude, affiliation.longitude, MARKER_RADIUS);
    const radialDir = position.clone().normalize();

    // Calculate tangent direction
    let tangent: Three.Vector3;
    if (Math.abs(radialDir.y) > 0.99) {
        tangent = new Three.Vector3(1, 0, 0).cross(radialDir).normalize();
    } else {
        tangent = new Three.Vector3(0, 1, 0).cross(radialDir).normalize();
    }

    const loopHeight = 0.5;

    // Control points for the loop
    const control1 = position.clone()
        .add(tangent.clone().multiplyScalar(loopHeight))
        .add(radialDir.clone().multiplyScalar(loopHeight * 0.5));

    const control2 = position.clone()
        .add(tangent.clone().multiplyScalar(-loopHeight))
        .add(radialDir.clone().multiplyScalar(loopHeight * 0.5));

    const curve = new Three.CubicBezierCurve3(position, control1, control2, position);
    curveGroup.add(createTubeMesh(curve));

    return curveGroup;
};
