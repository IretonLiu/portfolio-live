'use client'

import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { globeVertexShader, globeFragmentShader } from './shaders/globeShaders'
import { useControls } from 'leva'
import { easing } from 'maath'
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
export const Globe = () => {
    const meshRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const lightRef = useRef()
    // leva for pbr parameters
    const { metallic, roughness, emissive } = useControls(
        'Material Parameters',
        {
            metallic: { value: 0.0, min: 0, max: 1, step: 0.01 },
            roughness: { value: 1.0, min: 0, max: 1, step: 0.01 },
            emissive: { value: '#222222' },
        }
    )
    // light parameters
    const { color, intensity } = useControls('Light Parameters', {
        color: { value: '#ffffff' },
        intensity: { value: 1.0, min: 0, max: 10, step: 0.1 },
    })

    // Load textures
    const [displacementMap, textureMap, waveNormalA, waveNormalB] = useTexture([
        '/assets/textures/depth_image.png',
        '/assets/textures/texture_vibrant_low_res.png',
        '/assets/textures/wave_a.png',
        '/assets/textures/wave_b.png',
    ])

    useMemo(() => {
        ;[displacementMap, textureMap, waveNormalA, waveNormalB].forEach(
            (t) => {
                t.wrapS = t.wrapT = THREE.RepeatWrapping
            }
        )
    }, [displacementMap, textureMap, waveNormalA, waveNormalB])
    const geometry = useMemo(() => {
        //let geom = new THREE.IcosahedronGeometry(3, 16)
        let geom = new THREE.SphereGeometry(3, 128, 128)
        geom.computeTangents() // Compute tangents for normal mapping if needed
        geom.computeVertexNormals() // Ensure normals are computed for lighting
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
            uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
            uCameraPos: { value: new THREE.Vector3() },
            materialParams: {
                value: {
                    emissive: new THREE.Color(emissive),
                    metallic: metallic,
                    roughness: roughness,
                    F0: new THREE.Color(0.04, 0.04, 0.04), // Default for non-metals
                },
            },
            lightParams: {
                value: {
                    color: new THREE.Color(color),
                    intensity: intensity,
                },
            },
            uShadowMap: { value: null }, // The Depth Texture from the light
            uShadowMatrix: { value: new THREE.Matrix4() },
        }),
        [displacementMap, textureMap]
    )

    const rayOrigin = useMemo(() => new THREE.Vector3(), [])
    const rayDir = useMemo(() => new THREE.Vector3(), [])
    const sphereCenter = useMemo(() => new THREE.Vector3(), [])
    const hitPoint = useMemo(() => new THREE.Vector3(), [])
    var hit = false
    var blendRadius = 0.0 // Radius for blending effect around hit point
    useFrame((state, delta) => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.ShaderMaterial
            const t = state.clock.getElapsedTime() * 0.01 // Slow rotation

            const lightDir = new THREE.Vector3(
                Math.sin(t),
                1,
                Math.cos(t)
            ).normalize()
            lightRef.current.position.copy(lightDir.clone()) // Position light in the direction of lightDir
            lightRef.current.updateMatrixWorld() // Update light's world matrix
            material.uniforms.uTime.value = t
            material.uniforms.uLightDir.value.copy(lightDir)
            material.uniforms.uCameraPos.value.copy(state.camera.position)

            rayOrigin.copy(state.camera.position)
            rayDir
                .set(state.mouse.x, state.mouse.y, 0.5)
                .unproject(state.camera)
                .sub(rayOrigin)
                .normalize()

            sphereCenter.set(0, 0, 0) // Assuming the globe is centered at the origin
            const radius = 3 // Radius of the globe
            const tHit = RaySphereIntersection(
                rayOrigin,
                rayDir,
                sphereCenter,
                radius
            )
            if (tHit > 0) {
                hitPoint.copy(rayOrigin).add(rayDir.multiplyScalar(tHit))
                material.uniforms.uMousePoint.value.copy(hitPoint)
                hit = true
                easing.damp(
                    material.uniforms.uBlendRadius,
                    'value', // The property we want to animate
                    hit ? 1.5 : 0.0, // The Target
                    0.25, // Smooth time (seconds to reach target)
                    delta // Time since last frame
                )
                material.uniforms.uMouseHit.value = 1.0 // Indicate a hit
                // start an animation
            } else {
                material.uniforms.uMousePoint.value.set(0, 0, 0) // Reset to default
                material.uniforms.uMouseHit.value = 0.0 // Indicate no hit
                material.uniforms.uBlendRadius.value = 0.0 // Reset blend radius
                blendRadius = 0.0
                hit = false
            }

            if (
                lightRef.current &&
                lightRef.current.shadow &&
                lightRef.current.shadow.matrix
            ) {
                const shadow = lightRef.current.shadow
                const shadowMatrix = shadow.matrix
                material.uniforms.uShadowMatrix.value.copy(shadowMatrix)
                if (shadow.map) {
                    const texture = shadow.map.texture
                    material.uniforms.uShadowMap.value = texture
                }
            }
        }
    })
    return (
        <>
            <directionalLight
                ref={lightRef}
                castShadow
                intensity={1.0} // Set to 0 if you only want the map/matrix, not the light
                position={[2, 2, 2]}
                shadow-bias={-0.001}
                shadow-mapSize={[2048, 2048]} // 4K Texture for shadows (crispness)
                shadow-radius={10} // Soft shadow edges
            >
                <orthographicCamera
                    attach="shadow-camera"
                    args={[-10, 10, 10, -10, 0.1, 50]}
                />
            </directionalLight>

            <mesh
                position={[0, -10, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <planeGeometry args={[100, 100]} />
                <shadowMaterial opacity={0.5} />
            </mesh>

            <mesh ref={meshRef} geometry={geometry} castShadow>
                <shaderMaterial
                    useRef={materialRef}
                    vertexShader={globeVertexShader}
                    fragmentShader={globeFragmentShader}
                    uniforms={uniforms}
                />
            </mesh>
        </>
    )
}
