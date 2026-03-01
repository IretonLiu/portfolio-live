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
import { usePointerAnimationStore } from '../../store/useStore'

const applySharedUniforms = (
    material: THREE.ShaderMaterial,
    delta: number,
    tHit: number,
    hitPoint: THREE.Vector3
) => {
    material.uniforms.uMousePoint.value.copy(hitPoint)
    material.uniforms.uMouseHit.value = tHit > 0 ? 1.0 : 0.0

    // Dampen the blend radius
    easing.damp(
        material.uniforms.uBlendRadius,
        'value',
        3.0, // Target
        0.25, // Smooth time
        delta
    )
}

const radius = 3.0
const globePosition = new THREE.Vector3(5, 0, 0)
const cameraStartPos = new THREE.Vector3(0, 0, 15)
const lightPosition = new THREE.Vector3(6, 7, 10)
const pointerPosition = new THREE.Vector3(4.4, 0.5, 3.2)
const outofviewPointerPosition = new THREE.Vector3(999, 999, 999)

export const Scene = () => {
    const { camera, gl, size, scene, viewport } = useThree()
    const dpr = gl.getPixelRatio()
    const globeRef = useRef<THREE.Mesh>(null)
    const cloudRef = useRef<THREE.Mesh>(null)
    const backgroundRef = useRef<THREE.Mesh>(null)
    const lightRef = useRef<THREE.DirectionalLight>(null)
    const virtualScene = useRef<THREE.Scene>(null)

    const pointerAnimationCounter = usePointerAnimationStore(
        (state) => state.pointerAnimationCounter
    )

    if (virtualScene.current === null) {
        virtualScene.current = new THREE.Scene()
    }

    const physicalWidth = size.width * dpr
    const physicalHeight = size.height * dpr

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
            uMousePoint: { value: outofviewPointerPosition.clone() },
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
            window.removeEventListener('pointermove', handleMove)
        }

        window.addEventListener('pointermove', handleMove)

        return () => window.removeEventListener('pointermove', handleMove)
    }, [])

    const pointerShowing = useRef(false)
    useEffect(() => {
        if (pointerAnimationCounter > 0) {
            pointerShowing.current = true
        }
    }, [pointerAnimationCounter])

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
                applySharedUniforms(
                    cloudMaterial,
                    delta,
                    tHit,
                    hitPoint.current
                )
            }
        } else if (pointerShowing.current) {
            applySharedUniforms(
                globeRef.current.material as THREE.ShaderMaterial,
                delta,
                1.0,
                pointerPosition
            )
            applySharedUniforms(
                cloudRef.current.material as THREE.ShaderMaterial,
                delta,
                1.0,
                pointerPosition
            )
        } else {
            applySharedUniforms(
                globeRef.current.material as THREE.ShaderMaterial,
                delta,
                -1.0,
                outofviewPointerPosition
            )
            applySharedUniforms(
                cloudRef.current.material as THREE.ShaderMaterial,
                delta,
                -1.0,
                outofviewPointerPosition
            )
        }

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
            {createPortal(
                <>
                    <directionalLight
                        ref={lightRef}
                        position={lightPosition}
                        intensity={2.5}
                        color={0xffffff}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                    />
                    <MapPointer position={pointerPosition} />,
                    <Globe
                        ref={globeRef}
                        position={globePosition}
                        lightPosition={lightPosition}
                        pointerPosition={pointerPosition}
                    />
                </>,
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
