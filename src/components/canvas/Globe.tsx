'use client'

import React, { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { globeVertexShader, globeFragmentShader } from './shaders/globeShaders'
import { easing } from 'maath'
import { forwardRef } from 'react'
import { MapPointer } from './Pointer'
// axes helper

function RaySphereIntersection(
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
const PBR_PARAMS = {
    metallic: 0.0,
    roughness: 0.5,
    emissive: '#000000',
}

const LIGHT_PARAMS = {
    color: '#ffffff',
    intensity: 1.0,
}

export const Globe = forwardRef(({ lightRef, ...props }, ref) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const pointerHiddenRef = useRef(true)
    // leva for pbr parameters

    // Load textures
    const [displacementMap, textureMap, waveNormalA, waveNormalB] = useTexture([
        '/assets/textures/depth_image.png',
        '/assets/textures/texture_vibrant_low_res.png',
        '/assets/textures/wave_a.png',
        '/assets/textures/wave_b.png',
    ])

    // use layoueffect instead of useMemo to set the wrapping mode after the textures are loaded
    useLayoutEffect(() => {
        ;[displacementMap, textureMap, waveNormalA, waveNormalB].forEach(
            (t) => {
                t.wrapS = t.wrapT = THREE.RepeatWrapping
                // t.needsUpdate = true
            }
        )
    }, [displacementMap, textureMap, waveNormalA, waveNormalB])

    const geometry = useMemo(() => {
        //let geom = new THREE.IcosahedronGeometry(3, 16)
        let geom = new THREE.SphereGeometry(3, 128, 128)
        geom.computeTangents() // Compute tangents for normal mapping if needed
        geom.computeVertexNormals() // Ensure normals are computed for lighting
        // log position
        return geom
    }, [])

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0.0 },
            uMouseHit: { value: 0.0 }, // 0 = no hit, 1 = hit
            uMousePoint: { value: new THREE.Vector3(999, 999, 999) }, // Initialise it way off-screen
            uBlendRadius: { value: 0.0 }, // Radius for blending effect around hit point
            iResolution: { value: [window.innerWidth, window.innerHeight] },
            uTexture: { value: textureMap },
            uDisplacementMap: { value: displacementMap },
            uNormalMapA: { value: waveNormalA },
            uNormalMapB: { value: waveNormalB },
            uLightPos: { value: new THREE.Vector3(10, 10, 10) },
            uCameraPos: { value: new THREE.Vector3() },
            // big thing to watch out for here:
            // when updating the material parameters,
            // be sure to update the value property instead of the entire object, otherwise the reference will change and the shader will recompile
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
            uShadowMap: { value: null }, // The Depth Texture from the light
            uShadowMatrix: { value: new THREE.Matrix4() },
        }),
        [displacementMap, textureMap]
    )

    return (
        <>
            <mesh ref={ref} geometry={geometry}>
                <shaderMaterial
                    useRef={materialRef}
                    vertexShader={globeVertexShader}
                    fragmentShader={globeFragmentShader}
                    uniforms={uniforms}
                />
            </mesh>
        </>
    )
})
