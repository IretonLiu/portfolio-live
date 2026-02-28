'use client'

import React, { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { globeVertexShader, globeFragmentShader } from './shaders/globeShaders'
import { easing } from 'maath'
import { forwardRef } from 'react'
import { useGlobeRotationStore } from '../../store/useStore'
// axes helper

const PBR_PARAMS = {
    metallic: 0.0,
    roughness: 0.5,
    emissive: '#000000',
}

const LIGHT_PARAMS = {
    color: '#ffffff',
    intensity: 1.0,
}

export const Globe = forwardRef(({ position, lightPosition }, ref) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null)

    // leva for pbr parameters

    // Load textures
    const [displacementMap, textureMap, waveNormalA, waveNormalB] = useTexture([
        '/assets/textures/depth_image.png',
        '/assets/textures/texture_vibrant_low_res.png',
        '/assets/textures/wave_a.png',
        '/assets/textures/wave_b.png',
    ])
    waveNormalA.wrapS = waveNormalA.wrapT = THREE.RepeatWrapping
    waveNormalB.wrapS = waveNormalB.wrapT = THREE.RepeatWrapping
    const geometry = useMemo(() => {
        //let geom = new THREE.IcosahedronGeometry(3, 16)
        let geom = new THREE.SphereGeometry(3, 128, 128)
        geom.computeTangents() // Compute tangents for normal mapping if needed
        geom.computeVertexNormals() // Ensure normals are computed for lighting
        // log position
        return geom
    }, [])

    const targetEuler = useMemo(() => new THREE.Euler(), [])

    useFrame((state, delta) => {
        console.log(waveNormalA.wrapS)
        const material = ref.current?.material as THREE.ShaderMaterial
        state.camera.updateMatrixWorld() // Ensure camera matrices are up to date
        if (material) {
            material.uniforms.uTime.value += delta * 0.01 // Slow down time for a more subtle effect
            material.uniforms.uCameraPos.value.copy(state.camera.position)
        }
        const target = useGlobeRotationStore.getState().targetGlobeRotation
        if (ref.current) {
            targetEuler.set(target.phi, target.theta, 0)
            easing.dampE(ref.current.rotation, targetEuler, 0.1, delta)
        }
    })

    const uniforms = useMemo(() => {
        const customUniforms = {
            uTime: { value: 0.0 },
            uMouseHit: { value: 0.0 }, // 0 = no hit, 1 = hit
            uMousePoint: { value: new THREE.Vector3(999, 999, 999) }, // Initialise it way off-screen
            uBlendRadius: { value: 0.0 }, // Radius for blending effect around hit point
            uTexture: { value: textureMap },
            uDisplacementMap: { value: displacementMap },
            uNormalMapA: { value: waveNormalA },
            uNormalMapB: { value: waveNormalB },
            uLightPos: { value: lightPosition },
            uCameraPos: { value: new THREE.Vector3() },
            materialParams: {
                value: {
                    emissive: new THREE.Color(PBR_PARAMS.emissive),
                    metallic: PBR_PARAMS.metallic,
                    roughness: PBR_PARAMS.roughness,
                    F0: new THREE.Color(0.04, 0.04, 0.04), // Default for non-metals
                },
            },
            lightParams: {
                value: {
                    color: new THREE.Color(LIGHT_PARAMS.color),
                    intensity: LIGHT_PARAMS.intensity,
                },
            },
        }
        // be careful with where to merge this, don't do it inside somewhere that will change frequently, like resize
        return THREE.UniformsUtils.merge([
            THREE.UniformsLib.lights,
            customUniforms,
        ])
    }, [displacementMap, textureMap, waveNormalA, waveNormalB])

    return (
        <>
            <mesh
                ref={ref}
                geometry={geometry}
                position={position}
                receiveShadow
            >
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={globeVertexShader}
                    fragmentShader={globeFragmentShader}
                    side={THREE.FrontSide}
                    lights={true}
                    defines={{
                        USE_SHADOWMAP: '',
                        MAX_SPOT_LIGHTS: 1,
                    }}
                    uniforms={uniforms}
                />
            </mesh>
        </>
    )
})

Globe.displayName = 'Globe'
export default Globe
