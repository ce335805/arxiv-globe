import * as Three from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

const DEG2RAD = Math.PI / 180;

export const isLandPixelVisible = (
    long: number,
    lat: number,
    imageData: ImageData | null
): boolean => {
    if (!imageData) return false;

    const imgWidth = imageData.width;
    const imgHeight = imageData.height;

    const pixelRow = Math.floor((imgHeight / 180) * (-lat + 90));
    const pixelColumn = Math.floor((imgWidth / 360) * ((long + 180) % 360));

    return (
        imageData.data[pixelRow * imgWidth * 4 + pixelColumn * 4 + 3] > 120
    );
};

export const drawLandmassOnGlobe = (
    imageData: ImageData | null
): Three.Mesh | null => {
    if (!imageData) {
        console.error("Image data not loaded");
        return null;
    }

    const geometries: Three.BufferGeometry[] = [];
    const rows = 200; // Latitude resolution
    const dotDensity = 100; // Dots per unit of circumference

    for (let lat = -90; lat <= 90; lat += 180 / rows) {
        const radius = Math.cos(Math.abs(lat) * DEG2RAD);
        const circumference = radius * Math.PI * 2;
        const dotsForLat = Math.floor(circumference * dotDensity);

        for (let x = 0; x < dotsForLat; x += 1) {
            // Generate longitude in standard range -180 to 180
            const long = (x * 360) / dotsForLat - 180;

            if (!isLandPixelVisible(long, lat, imageData)) {
                continue;
            }

            const geometryCircle = new Three.CircleGeometry(0.002, 5);

            // Use latLonToVector3 for consistent coordinate conversion
            const position = latLonToVector3(lat, long, 1.001);

            const m = new Three.Matrix4();
            const vecX = new Three.Vector3(1, 0, 0);
            m.makeRotationAxis(vecX, -lat * DEG2RAD);
            geometryCircle.applyMatrix4(m);

            const vecY = new Three.Vector3(0, 1, 0);
            m.makeRotationAxis(vecY, (long + 180) * DEG2RAD);
            geometryCircle.applyMatrix4(m);

            m.makeTranslation(position.x, position.y, position.z);
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

    return landMesh; // Return the landMesh for further use
};

/**
 * Convert latitude and longitude to 3D Cartesian coordinates on a sphere.
 *
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lon - Longitude in degrees (-180 to 180)
 * @param radius - Sphere radius (default 1.005 to sit slightly above globe surface)
 * @returns Vector3 position on the sphere
 */
export const latLonToVector3 = (
    lat: number,
    lon: number,
    radius: number = 1.005
): Three.Vector3 => {
    const phi = (90 - lat) * DEG2RAD; // Convert latitude to phi (polar angle)
    const theta = (lon + 180) * DEG2RAD; // Convert longitude to theta (azimuthal angle)

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new Three.Vector3(x, y, z);
};

/**
 * Create affiliation markers as pulsing points on the globe.
 *
 * @param affiliations - Array of affiliation coordinates
 * @param options - Visual options for markers
 * @returns Three.Group containing all markers
 */
export const createAffiliationMarkers = (
    affiliations: Array<{ latitude: number; longitude: number; geocoded?: boolean }>,
    options?: {
        color?: number;
        size?: number;
        radius?: number;
    }
): Three.Group => {
    const {
        color = 0xff6b6b, // Coral red
        size = 0.015,
        radius = 1.005
    } = options || {};

    const markerGroup = new Three.Group();

    affiliations.forEach((affiliation) => {
        // Only create markers for successfully geocoded affiliations
        if (affiliation.geocoded === false) {
            return;
        }

        // Convert lat/lon to 3D position
        const position = latLonToVector3(
            affiliation.latitude,
            affiliation.longitude,
            radius
        );

        // Create sphere geometry for marker
        const geometry = new Three.SphereGeometry(size, 16, 16);

        // Use emissive material for glow effect
        const material = new Three.MeshBasicMaterial({
            color: color,
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
 *
 * @param scene - Three.js scene
 * @param markerGroup - Group containing markers to remove
 */
export const removeMarkers = (
    scene: Three.Scene,
    markerGroup: Three.Group
): void => {
    // Remove from scene
    scene.remove(markerGroup);

    // Dispose of geometries and materials to free memory
    markerGroup.traverse((child) => {
        if (child instanceof Three.Mesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });

    // Clear the group
    markerGroup.clear();
};

/**
 * Update pulsing animation for markers.
 * Call this in the render loop.
 *
 * @param markerGroup - Group containing markers to animate
 * @param time - Current time in seconds
 */
export const updateMarkerPulse = (
    markerGroup: Three.Group,
    time: number
): void => {
    const pulseSpeed = 2.0; // Frequency of pulse
    const pulseAmount = 0.3; // How much to scale (1.0 to 1.3)

    // Calculate pulse scale using sine wave
    const scale = 1.0 + Math.sin(time * pulseSpeed) * pulseAmount;

    // Apply scale to all markers in group
    markerGroup.children.forEach((marker) => {
        if (marker instanceof Three.Mesh) {
            marker.scale.setScalar(scale);
        }
    });
};

/**
 * Calculate the arc height for a curve based on the distance between two points.
 * Arc height is proportional to the angular distance (great circle distance).
 *
 * @param point1 - First 3D position vector
 * @param point2 - Second 3D position vector
 * @param minHeight - Minimum arc height (default 0.15)
 * @param maxHeight - Maximum arc height (default 0.8)
 * @returns Arc height as a scalar value
 */
export const calculateArcHeight = (
    point1: Three.Vector3,
    point2: Three.Vector3,
    minHeight: number = 0.4,
    maxHeight: number = 2.
): number => {
    // Normalize both vectors
    const p1Normalized = point1.clone().normalize();
    const p2Normalized = point2.clone().normalize();

    // Calculate dot product
    const dotProduct = p1Normalized.dot(p2Normalized);

    // Clamp dot product to avoid numerical errors with acos
    const clampedDot = Math.max(-1, Math.min(1, dotProduct));

    // Calculate angular distance (0 to π)
    const angle = Math.acos(clampedDot);

    // Map angle to height range
    const height = minHeight + (angle / Math.PI) * (maxHeight - minHeight);

    return height;
};

/**
 * Calculate the control point for a quadratic bezier curve between two points on a sphere.
 * The control point is positioned above the midpoint at a height proportional to distance.
 *
 * @param point1 - Start position on sphere surface
 * @param point2 - End position on sphere surface
 * @param arcHeight - Height of the arc above the sphere
 * @returns Vector3 control point position
 */
export const calculateBezierControlPoint = (
    point1: Three.Vector3,
    point2: Three.Vector3,
    arcHeight: number
): Three.Vector3 => {
    // Calculate midpoint
    const midpoint = new Three.Vector3()
        .addVectors(point1, point2)
        .multiplyScalar(0.5);

    // Normalize to get direction from globe center
    const direction = midpoint.clone().normalize();

    // Position control point by extending along the direction
    // (1 + arcHeight) extends it above the sphere surface
    const controlPoint = direction.multiplyScalar(1 + arcHeight);

    return controlPoint;
};

/**
 * Create glowing bezier curves connecting markers in sequence.
 * Curves are rendered as 3D tubes with emissive materials for a glowing effect.
 *
 * @param affiliations - Array of affiliation coordinates (must be in connection order)
 * @param options - Visual and geometric options for curves
 * @returns Three.Group containing all curve meshes
 */
export const createCurvesBetweenMarkers = (
    affiliations: Array<{ latitude: number; longitude: number; geocoded?: boolean }>,
    options?: {
        color?: number;
        tubeRadius?: number;
        tubularSegments?: number;
        radialSegments?: number;
        emissiveIntensity?: number;
        markerRadius?: number;
        closeLoop?: boolean;
    }
): Three.Group => {
    const {
        color = 0x64b5f6,
        tubeRadius = 0.003,
        tubularSegments = 64,
        radialSegments = 8,
        emissiveIntensity = 0.6,
        markerRadius = 1.005,
        closeLoop = true
    } = options || {};

    const curveGroup = new Three.Group();

    // Filter to only geocoded affiliations
    const validAffiliations = affiliations.filter(
        (affiliation) => affiliation.geocoded !== false
    );

    if (validAffiliations.length < 2) {
        console.warn("Need at least 2 geocoded affiliations to create curves");
        return curveGroup;
    }

    // Convert all lat/lon to Vector3 positions
    const positions = validAffiliations.map((affiliation) =>
        latLonToVector3(affiliation.latitude, affiliation.longitude, markerRadius)
    );

    // Create curves between consecutive pairs
    for (let i = 0; i < positions.length - 1; i++) {
        const point1 = positions[i];
        const point2 = positions[i + 1];

        // Calculate arc height based on distance
        const arcHeight = calculateArcHeight(point1, point2);

        // Calculate control point for bezier curve
        const controlPoint = calculateBezierControlPoint(point1, point2, arcHeight);

        // Create quadratic bezier curve
        const curve = new Three.QuadraticBezierCurve3(point1, controlPoint, point2);

        // Generate tube geometry from curve
        const tubeGeometry = new Three.TubeGeometry(
            curve,
            tubularSegments,
            tubeRadius,
            radialSegments,
            false
        );

        // Create material with glow effect
        const material = new Three.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            emissive: color,
            emissiveIntensity: emissiveIntensity,
            metalness: 0.0,
            roughness: 0.5
        });

        // Create mesh and add to group
        const tubeMesh = new Three.Mesh(tubeGeometry, material);
        curveGroup.add(tubeMesh);
    }

    // If closeLoop is true, connect last point back to first
    if (closeLoop && positions.length > 2) {
        const point1 = positions[positions.length - 1];
        const point2 = positions[0];

        const arcHeight = calculateArcHeight(point1, point2);
        const controlPoint = calculateBezierControlPoint(point1, point2, arcHeight);
        const curve = new Three.QuadraticBezierCurve3(point1, controlPoint, point2);

        const tubeGeometry = new Three.TubeGeometry(
            curve,
            tubularSegments,
            tubeRadius,
            radialSegments,
            false
        );

        const material = new Three.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            emissive: color,
            emissiveIntensity: emissiveIntensity,
            metalness: 0.0,
            roughness: 0.5
        });

        const tubeMesh = new Three.Mesh(tubeGeometry, material);
        curveGroup.add(tubeMesh);
    }

    return curveGroup;
};

/**
 * Remove curves from scene and dispose of resources.
 *
 * @param scene - Three.js scene
 * @param curveGroup - Group containing curves to remove
 */
export const removeCurves = (
    scene: Three.Scene,
    curveGroup: Three.Group
): void => {
    // Remove from scene
    scene.remove(curveGroup);

    // Dispose of geometries and materials to free memory
    curveGroup.traverse((child) => {
        if (child instanceof Three.Mesh) {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });

    // Clear the group
    curveGroup.clear();
};
