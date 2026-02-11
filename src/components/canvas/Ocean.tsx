'use client'

import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { oceanVertexShader, oceanFragmentShader } from './shaders/oceanShaders'

interface OceanProps {
    tDepth: THREE.Texture
    tDiffuse: THREE.Texture
}

export const Ocean: React.FC<OceanProps> = ({ tDepth, tDiffuse }) => {
    const meshRef = useRef<THREE.Mesh>(null)
    const { camera } = useThree()

    const [displacementMap, waveNormalA, waveNormalB] = useTexture([
        '/assets/textures/displacement.png',
        '/assets/textures/wave_a.png',
        '/assets/textures/wave_b.png',
    ])

    useMemo(() => {
        ;[displacementMap, waveNormalA, waveNormalB].forEach((t) => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping
        })
    }, [displacementMap, textureMap, waveNormalA, waveNormalB])

    const geometry = useMemo(() => {
        return new THREE.IcosahedronGeometry(3.0, 10) // Hydrosphere geometry
    }, [])

    const uniforms = useMemo(
        () => ({
            tDiffuse: { value: null },
            tDepth: { value: null },
            uLightColor: { value: new THREE.Color(0xf9f9f9) },
            uSigmaA: { value: new THREE.Vector3(0.2, 0.04, 0.015) },
            uDisplacementMap: { value: displacementMap },
            uTexture: { value: textureMap },
            uNormalMapA: { value: waveNormalA },
            uNormalMapB: { value: waveNormalB },
            uTime: { value: 0.0 },
            uDispScale: { value: 1.0 },
            iResolution: { value: new THREE.Vector2() }, // Set in frame
            uSphereCenter: { value: new THREE.Vector3(0, 0, 0) },
            uSphereRadius: { value: 3.0 },
            uCameraNear: { value: camera.near },
            uCameraFar: { value: camera.far },
            uCameraPos: { value: new THREE.Vector3() },
            uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
            uViewMatrixInverse: { value: new THREE.Matrix4() },
        }),
        [
            tDiffuse,
            tDepth,
            displacementMap,
            textureMap,
            waveNormalA,
            waveNormalB,
            camera,
        ]
    )

    useFrame((state) => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.ShaderMaterial
            const t = state.clock.getElapsedTime() * 0.001

            const lightDir = new THREE.Vector3(
                Math.sin(t),
                Math.cos(t),
                Math.sin(t * 0.5)
            ).normalize()

            material.uniforms.tDepth.value = tDepth
            material.uniforms.tDiffuse.value = tDiffuse

            material.uniforms.uLightDir.value.copy(lightDir)
            material.uniforms.uCameraPos.value.copy(state.camera.position)
            material.uniforms.uTime.value = t
            material.uniforms.uViewMatrixInverse.value.copy(
                state.camera.matrixWorld
            )

            material.uniforms.iResolution.value.set(
                state.size.width,
                state.size.height
            )
            material.uniforms.uCameraNear.value = state.camera.near
            material.uniforms.uCameraFar.value = state.camera.far

            // Update textures if they change (FBO flip)
            material.uniforms.tDepth.value = tDepth
            material.uniforms.tDiffuse.value = tDiffuse
        }
    })

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <shaderMaterial
                vertexShader={oceanVertexShader}
                fragmentShader={oceanFragmentShader}
                uniforms={uniforms}
                transparent={true}
                side={THREE.FrontSide} // Render front face
            />
        </mesh>
    )
}
