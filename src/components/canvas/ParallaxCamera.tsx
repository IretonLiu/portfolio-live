import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export default function ParallaxCamera({ amplitude = 2, damping = 0.05 }) {
    useFrame((state) => {
        // 1. Calculate the target position
        // state.mouse.x/y are normalized pointers ranging from -1 to 1
        const targetX = state.mouse.x * amplitude
        const targetY = state.mouse.y * amplitude

        // 2. Directly mutate the camera's memory addresses using Lerp
        state.camera.position.x = THREE.MathUtils.lerp(
            state.camera.position.x,
            targetX,
            damping
        )
        state.camera.position.y = THREE.MathUtils.lerp(
            state.camera.position.y,
            targetY,
            damping
        )
    })
    return null
}
