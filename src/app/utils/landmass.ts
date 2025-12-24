import * as Three from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { DEG2RAD, latLonToVector3 } from "./coordinates";

/**
 * Check if a pixel at the given coordinates represents land on the world map.
 *
 * @param long - Longitude in degrees (-180 to 180)
 * @param lat - Latitude in degrees (-90 to 90)
 * @param imageData - Image data from the world map texture
 * @returns true if the pixel represents land
 */
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

/**
 * Create a mesh representing landmasses on the globe surface.
 * Uses the world map image to determine land positions and creates
 * small circles at each land point.
 *
 * @param imageData - Image data from the world map texture
 * @returns Mesh containing all landmass circles, or null if no image data
 */
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

            // Calculate the radial direction (normalized position from center)
            const radialDirection = position.clone().normalize();

            // Create quaternion to rotate circle normal (+Z) to radial direction
            const initialNormal = new Three.Vector3(0, 0, 1);
            const quaternion = new Three.Quaternion();
            quaternion.setFromUnitVectors(initialNormal, radialDirection);

            // Apply rotation to align circle with radial direction
            const rotationMatrix = new Three.Matrix4();
            rotationMatrix.makeRotationFromQuaternion(quaternion);
            geometryCircle.applyMatrix4(rotationMatrix);

            // Translate to final position
            const translationMatrix = new Three.Matrix4();
            translationMatrix.makeTranslation(position.x, position.y, position.z);
            geometryCircle.applyMatrix4(translationMatrix);

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

    return landMesh;
};
