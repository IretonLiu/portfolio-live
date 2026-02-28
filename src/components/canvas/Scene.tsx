'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import {
    useFBO,
    Stats,
    OrbitControls,
    PerspectiveCamera,
} from '@react-three/drei'
import * as THREE from 'three'
import { Globe } from './Globe'
import { CloudCompositor } from './CloudCompositor'
import { RaySphereIntersection } from './Utils'
import { easing } from 'maath'
import { InfiniteStudio } from './InfiniteStudio'
import ParallexCamera from './ParallaxCamera'
import { MapPointer } from './Pointer'

const applySharedUniforms = (
    material: THREE.ShaderMaterial,
    delta: number,
    tHit: number,
    hitPoint: THREE.Vector3
) => {
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
const globePosition = new THREE.Vector3(5, 0, 0)
const cameraStartPos = new THREE.Vector3(0, 0, 15)
const lightPosition = new THREE.Vector3(7, 7, 10)
const pointerPosition = new THREE.Vector3(4.2, 0, 3.2)

export const Scene = () => {
    const { camera, gl, size, scene, viewport } = useThree()
    const dpr = gl.getPixelRatio()
    const globeRef = useRef<THREE.Mesh>(null)
    const cloudRef = useRef<THREE.Mesh>(null)
    const backgroundRef = useRef<THREE.Mesh>(null)
    const lightRef = useRef<THREE.DirectionalLight>(null)
    const virtualScene = useRef<THREE.Scene>(null)

    if (virtualScene.current === null) {
        virtualScene.current = new THREE.Scene()
    }

    const physicalWidth = size.width * dpr
    const physicalHeight = size.height * dpr

    // Memoize the depth texture pointer on the heap to prevent VRAM reallocation loops
    const fboSettings = useMemo(
        () => ({
            depthBuffer: true,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        }),
        []
    )

    // Create FBO with depth buffer
    const fbo = useFBO(fboSettings)
    const rayOrigin = useRef<THREE.Vector3>(null)
    const rayDir = useRef<THREE.Vector3>(null)
    const hitPoint = useRef<THREE.Vector3>(null)
    const sharedUniform = useRef<{
        uMousePoint: { value: THREE.Vector3 }
        uMouseHit: { value: number }
        uBlendRadius: { value: number }
        uTime: { value: number }
        uLightDir: { value: THREE.Vector3 }
    }>(null)

    // Initialised all the null refs
    if (rayOrigin.current === null) rayOrigin.current = new THREE.Vector3()
    if (rayDir.current === null) rayDir.current = new THREE.Vector3()
    if (hitPoint.current === null) hitPoint.current = new THREE.Vector3()
    if (sharedUniform.current === null) {
        sharedUniform.current = {
            uMousePoint: { value: new THREE.Vector3(999, 999, 999) },
            uMouseHit: { value: 0.0 },
            uBlendRadius: { value: 0 },
            uTime: { value: 0 },
            uLightDir: { value: new THREE.Vector3() },
        }
    }
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
        // We ensure the camera matrix is 100% up-to-date with OrbitControls
        // before we do ANY rendering.
        const mouseX = state.pointer.x
        const mouseY = state.pointer.y

        // update fbo size if the viewport has changed

        rayOrigin.current.copy(state.camera.position)
        if (isRaycastActive.current) {
            rayDir.current
                .set(mouseX, mouseY, 0.0)
                .unproject(state.camera)
                .sub(rayOrigin.current)
                .normalize()
        } else {
            rayDir.current
                .set(999, 999, -1)
                .transformDirection(state.camera.matrixWorld)
        }

        const tHit = RaySphereIntersection(
            rayOrigin.current,
            rayDir.current,
            globePosition,
            radius
        )

        if (tHit > 0) {
            hitPoint.current
                .copy(rayOrigin.current)
                .addScaledVector(rayDir.current, tHit)
        }
        if (globeRef.current) {
            applySharedUniforms(
                globeRef.current.material as THREE.ShaderMaterial,
                delta,
                tHit,
                hitPoint.current
            )
        }

        if (cloudRef.current) {
            const cloudMaterial = cloudRef.current
                .material as THREE.ShaderMaterial
            applySharedUniforms(cloudMaterial, delta, tHit, hitPoint.current)
        }

        // Do the same for clouds
        gl.setRenderTarget(fbo)
        gl.clear()
        gl.render(virtualScene.current, camera)

        gl.setRenderTarget(null)
        gl.render(scene, camera)
    }, 0)

    return (
        <>
            <Stats showPanel={0} className="fixed top-0 left-0 z-20" />

            <ParallexCamera amplitude={1.0} damping={0.1} />
            <PerspectiveCamera
                makeDefault
                position={[0, 0, 15]}
                near={0.1}
                far={100}
            ></PerspectiveCamera>
            {/* Pass 1: Globe rendered into virtual scene */}
            {createPortal(
                <Globe
                    ref={globeRef}
                    position={globePosition}
                    lightPosition={lightPosition}
                    pointerPosition={pointerPosition}
                />,
                virtualScene.current
            )}
            {/* Background Shader: Renders to the full canvas */}
            <CloudCompositor
                ref={cloudRef}
                position={globePosition}
                lightPosition={lightPosition}
                diffuseTexture={fbo.texture}
                depthTexture={fbo.depthTexture}
                lithosphereRadius={3.0}
            />
            <InfiniteStudio
                ref={backgroundRef}
                cameraPosition={camera.position}
                globePosition={globePosition}
                lightPosition={lightPosition}
            />
        </>
    )
}
