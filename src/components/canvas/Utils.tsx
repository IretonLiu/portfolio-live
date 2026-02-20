export function RaySphereIntersection(
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number
) {
    const oc = rayOrigin.clone().sub(sphereCenter)
    const a = rayDirection.dot(rayDirection)
    const b = 2.0 * oc.dot(rayDirection)
    const c = oc.dot(oc) - sphereRadius * sphereRadius
    const discriminant = b * b - 4.0 * a * c

    if (discriminant < 0) {
        return -1 // No intersection
    } else {
        return (-b - Math.sqrt(discriminant)) / (2.0 * a) // Return nearest intersection
    }
}
