import * as THREE from 'three'
import React, { forwardRef } from 'react'
import { vertexShader, fragmentShader } from './shaders/infiniteStudioShaders'
import { useFrame } from '@react-three/fiber'

export const InfiniteStudio = forwardRef(
    ({ cameraPosition, globePosition, lightPosition }, ref) => {
        useFrame((state, delta) => {
            const material = ref.current?.material as THREE.ShaderMaterial
            state.camera.updateMatrixWorld() // Ensure camera matrices are up to date

            if (material) {
                material.uniforms.uTime.value += delta
            }
            material.uniforms.uCameraPos.value.copy(state.camera.position)
            material.uniforms.uInverseProjectionMatrix.value.copy(
                state.camera.projectionMatrixInverse
            )
            material.uniforms.uInverseViewMatrix.value.copy(
                state.camera.matrixWorld
            )
        })

        return (
            <mesh
                ref={ref}
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
                        uGlobePos: { value: globePosition },
                        uCameraPos: { value: cameraPosition },
                        uLightPos: { value: new THREE.Vector3(999, 999, 999) },
                        uWobbleMatrix: { value: new THREE.Matrix4() },
                        uInverseProjectionMatrix: {
                            value: new THREE.Matrix4(),
                        },
                        uInverseViewMatrix: { value: new THREE.Matrix4() },
                    }}
                />
            </mesh>
        )
    }
)
