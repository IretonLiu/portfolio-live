'use client'

import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree, createPortal, extend } from '@react-three/fiber'
import {
    useFBO,
    Stats,
    OrbitControls,
    PerspectiveCamera,
} from '@react-three/drei'
import * as THREE from 'three'
import { AxesHelper } from 'three'
import { Globe } from './Globe'
import { Ocean } from './Ocean'
import { CloudCompositor } from './CloudCompositor'
import { Leva } from 'leva'
import { Effects } from '@react-three/drei'
import { RaySphereIntersection } from './Utils'
import { easing } from 'maath'
import { MapPointer } from './Pointer'

const applySharedUniforms = (
    material: THREE.ShaderMaterial,
    t: number,
    delta: number,
    tHit: number,
    hitPoint: THREE.Vector3,
    cameraPos: THREE.Vector3
) => {
    material.uniforms.uTime.value = t
    material.uniforms.uCameraPos.value.copy(cameraPos)

    if (tHit > 0) {
        material.uniforms.uMousePoint.value.copy(hitPoint)
        material.uniforms.uMouseHit.value = 1.0

        // Dampen the blend radius
        easing.damp(
            material.uniforms.uBlendRadius,
            'value',
            3.0, // Target
            0.25, // Smooth time
            delta
        )
    } else {
        material.uniforms.uMousePoint.value.set(999, 999, 999)
        material.uniforms.uMouseHit.value = 0.0
        easing.damp(
            material.uniforms.uBlendRadius,
            'value',
            0.0, // Target
            0.25, // Smooth time
            delta
        )
    }
}

const radius = 3.0
export const Scene = () => {
    const globeRef = useRef<THREE.Mesh>(null)
    const cloudRef = useRef<THREE.Mesh>(null)
    const lightRef = useRef<THREE.DirectionalLight>(null)
    const { camera, gl, size, scene } = useThree()
    const virtualScene = useMemo(() => new THREE.Scene(), [])

    // Create FBO with depth buffer
    const fbo = useFBO(size.width, size.height, {
        depthBuffer: true,
        depthTexture: new THREE.DepthTexture(size.width, size.height),
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
    })
    const [lightPos] = useState(() => new THREE.Vector3(10, 10, 10).normalize())
    const [rayOrigin] = useState(() => new THREE.Vector3(), [])
    const [rayDir] = useState(() => new THREE.Vector3(), [])
    const [sphereCenter] = useState(() => new THREE.Vector3(0, 0, 0), [])
    const [hitPoint] = useState(() => new THREE.Vector3(), [])
    const [sharedUniform] = useState(() => {
        return {
            uMousePoint: { value: new THREE.Vector3(999, 999, 999) },
            uMouseHit: { value: 0.0 },
            uBlendRadius: { value: 0 },
            uTime: { value: 0 },
            uLightDir: { value: new THREE.Vector3() },
            uCameraPos: { value: new THREE.Vector3() },
        }
    }, [])

    const isRaycastActive = useRef(false)
    useEffect(() => {
        const handleMove = () => {
            isRaycastActive.current = true
            // We only need to know this once, so we clean up immediately
            window.removeEventListener('pointermove', handleMove)
        }

        window.addEventListener('pointermove', handleMove)

        // Cleanup in case component unmounts before moving
        return () => window.removeEventListener('pointermove', handleMove)
    }, [])

    useFrame((state, delta) => {
        // ------------------------------------------------
        // STEP 1: FORCE CAMERA UPDATE
        // ------------------------------------------------
        // We ensure the camera matrix is 100% up-to-date with OrbitControls
        // before we do ANY rendering.

        state.camera.updateMatrixWorld()
        const t = state.clock.getElapsedTime() * 0.001

        rayOrigin.copy(state.camera.position)
        if (isRaycastActive.current) {
            rayDir
                .set(state.mouse.x, state.mouse.y, 0.5)
                .unproject(state.camera)
                .sub(rayOrigin)
                .normalize()
        } else {
            rayDir
                .set(999, 999, -1)
                .transformDirection(state.camera.matrixWorld)
        }

        const tHit = RaySphereIntersection(
            rayOrigin,
            rayDir,
            sphereCenter,
            radius
        )

        if (tHit > 0) {
            hitPoint.copy(rayOrigin).addScaledVector(rayDir, tHit)
        }

        if (globeRef.current) {
            applySharedUniforms(
                globeRef.current.material as THREE.ShaderMaterial,
                t,
                delta,
                tHit,
                hitPoint,
                state.camera.position
            )
        }
        // Do the same for clouds
        if (cloudRef.current) {
            const cloudMaterial = cloudRef.current
                .material as THREE.ShaderMaterial
            applySharedUniforms(
                cloudMaterial,
                t,
                delta,
                tHit,
                hitPoint,
                state.camera.position
            )
            cloudMaterial.uniforms.uInverseProjectionMatrix.value.copy(
                camera.projectionMatrixInverse
            )
            cloudMaterial.uniforms.uInverseViewMatrix.value.copy(
                camera.matrixWorld
            )
        }
        // ------------------------------------------------
        // STEP 2: RENDER GLOBE TO FBO (Background)
        // ------------------------------------------------
        gl.setRenderTarget(fbo)
        gl.clear()
        gl.render(virtualScene, camera)

        // ------------------------------------------------
        // STEP 3: RENDER SCREEN (Foreground)
        // ------------------------------------------------
        gl.setRenderTarget(null)
        // We manually render the main scene (containing CloudCompositor)
        // This guarantees it uses the EXACT same camera position as Step 2.
        gl.render(scene, camera)
    }, 1)

    return (
        <>
            <Stats showPanel={0} className="fixed top-0 left-0 z-20" />
            <PerspectiveCamera
                makeDefault
                position={[0, 0, 15]}
                near={0.1}
                far={100}
                fov={45}
                target={[0, 0, 0]}
            >
                <directionalLight
                    ref={lightRef}
                    intensity={1.0} // Set to 0 if you only want the map/matrix, not the light
                    position={[2, 2, 2]}
                ></directionalLight>
            </PerspectiveCamera>

            <OrbitControls
                makeDefault
                enablePan={false}
                enableZoom={false}
                minDistance={8}
                maxDistance={20}
            />
            {/* Pass 1: Globe rendered into virtual scene */}
            {createPortal(<Globe ref={globeRef} />, virtualScene)}
            <CloudCompositor
                ref={cloudRef}
                diffuseTexture={fbo.texture}
                depthTexture={fbo.depthTexture}
                lithosphereRadius={3.0}
            />
        </>
    )
}
