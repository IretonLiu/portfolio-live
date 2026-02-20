import * as THREE from 'three'
import React from 'react'
import { vertexShader, fragmentShader } from './shaders/infiniteStudioShaders'
import { useFrame } from '@react-three/fiber'

export const InfiniteStudio = () => {
    const meshRef = React.useRef<THREE.Mesh>(null)
    useFrame((state, delta) => {
        const material = meshRef.current?.material as THREE.ShaderMaterial
        if (material) {
            material.uniforms.uTime.value += delta
        }
    })
    return (
        <mesh
            ref={meshRef}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={[1, 1, 1]}
        >
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={{
                    iResolution: {
                        value: [window.innerWidth, window.innerHeight],
                    },
                    uTime: { value: 0.0 },
                    lightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
                }}
            />
        </mesh>
    )
}
