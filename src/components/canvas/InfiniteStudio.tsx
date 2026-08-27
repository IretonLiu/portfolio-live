import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { vertexShader, fragmentShader } from './shaders/infiniteStudioShaders'
import { useFrame, useThree } from '@react-three/fiber'

interface InfiniteStudioProps {
    cameraPosition: THREE.Vector3
    globePosition: THREE.Vector3
    lightPosition: THREE.Vector3
}
export const InfiniteStudio = ({
    cameraPosition,
    globePosition,
    lightPosition,
}: InfiniteStudioProps) => {
    const { size } = useThree()
    const ref = useRef<THREE.Mesh>(null)
    const uniforms = useMemo(
        () => ({
            iResolution: { value: new THREE.Vector2() },
            uTime: { value: 0.0 },
            uGlobePos: { value: globePosition },
            uCameraPos: { value: cameraPosition },
            uLightPos: { value: lightPosition },
            uInverseProjectionMatrix: { value: new THREE.Matrix4() },
            uInverseViewMatrix: { value: new THREE.Matrix4() },
        }),
        []
    )
    useFrame((state, delta) => {
        const material = ref.current?.material as THREE.ShaderMaterial
        state.camera.updateMatrixWorld() // Ensure camera matrices are up to date

        if (material) {
            material.uniforms.uTime.value += delta
            material.uniforms.iResolution.value.set(size.width, size.height)

            material.uniforms.uCameraPos.value.copy(state.camera.position)
            material.uniforms.uInverseProjectionMatrix.value.copy(
                state.camera.projectionMatrixInverse
            )
            material.uniforms.uInverseViewMatrix.value.copy(
                state.camera.matrixWorld
            )
        }
    })

    return (
        <mesh ref={ref}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
            />
        </mesh>
    )
}

InfiniteStudio.displayName = 'InfiniteStudio'
export default InfiniteStudio
