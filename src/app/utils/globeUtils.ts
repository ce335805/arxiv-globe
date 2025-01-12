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
    scene: Three.Scene,
    imageData: ImageData | null
) => {
    if (!imageData) {
        console.error("Image data not loaded");
        return;
    }

    const geometries: Three.BufferGeometry[] = [];
    const rows = 160; // Latitude resolution
    const dotDensity = 80; // Dots per unit of circumference

    for (let lat = -90; lat <= 90; lat += 180 / rows) {
        const radius = Math.cos(Math.abs(lat) * DEG2RAD);
        const circumference = radius * Math.PI * 2;
        const dotsForLat = Math.floor(circumference * dotDensity);

        for (let x = 0; x < dotsForLat; x += 1) {
            const long = (x * 360) / dotsForLat;

            if (!isLandPixelVisible(long, lat, imageData)) {
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
