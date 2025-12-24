import * as Three from "three";

export const DEG2RAD = Math.PI / 180;

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
