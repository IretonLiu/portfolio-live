import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export default function ParallaxCamera({ amplitude = 1, damping = 0.05 }) {
    useFrame((state) => {
        // state.mouse.x/y are normalized pointers ranging from -1 to 1
        const targetX = state.pointer.x * amplitude
        const targetY = state.pointer.y * amplitude

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
