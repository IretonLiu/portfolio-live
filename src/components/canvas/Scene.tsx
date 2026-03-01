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

const radius = 3.0
const globePosition = new THREE.Vector3(5, 0, 0)
const cameraStartPos = new THREE.Vector3(0, 0, 15)
const lightPosition = new THREE.Vector3(6, 7, 10)
const pointerPosition = new THREE.Vector3(4.4, 0.5, 3.2)
const outofviewPointerPosition = new THREE.Vector3(999, 999, 999)

export const Scene = () => {
    const { camera, gl, size, scene, viewport } = useThree()
    const lightRef = useRef<THREE.DirectionalLight>(null)
    const virtualScene = useRef<THREE.Scene>(null)

    const pointerAnimationCounter = usePointerAnimationStore(
        (state) => state.pointerAnimationCounter
    )

    if (virtualScene.current === null) {
        virtualScene.current = new THREE.Scene()
    }

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
    const rayOrigin = useMemo(() => new THREE.Vector3(), [])
    const rayDir = useMemo(() => new THREE.Vector3(), [])
    const hitPoint = useMemo(() => new THREE.Vector3(), [])
    const sharedUniforms = useMemo(() => {
        return {
            uMousePoint: { value: outofviewPointerPosition.clone() },
            uMouseHit: { value: 0.0 },
            uBlendRadius: { value: 0.0 },
        }
    }, [])

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

        rayOrigin.copy(state.camera.position)
        if (isRaycastActive.current) {
            rayDir
                .set(mouseX, mouseY, 0.0)
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
            globePosition,
            radius
        )

        if (tHit > 0 && hitPoint && rayOrigin && rayDir) {
            hitPoint.copy(rayOrigin).addScaledVector(rayDir, tHit)
            sharedUniforms.uMousePoint.value.copy(hitPoint)
            sharedUniforms.uMouseHit.value = 1.0
            easing.damp(sharedUniforms.uBlendRadius, 'value', 3.0, 0.25, delta)
        } else if (pointerShowing.current) {
            sharedUniforms.uMousePoint.value.copy(pointerPosition)
            sharedUniforms.uMouseHit.value = 1.0
            easing.damp(sharedUniforms.uBlendRadius, 'value', 3.0, 0.25, delta)
        } else {
            sharedUniforms.uMousePoint.value.copy(outofviewPointerPosition)
            sharedUniforms.uMouseHit.value = -1.0
            easing.damp(sharedUniforms.uBlendRadius, 'value', 3.0, 0.25, delta)
        }

        gl.setRenderTarget(fbo)
        gl.clear()

        if (virtualScene.current) gl.render(virtualScene.current, camera)

        gl.setRenderTarget(null)
        gl.render(scene, camera)
    }, 0)

    return (
        <>
            {/*<Stats showPanel={0} className="fixed top-0 left-0 z-20" />*/}
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
                        position={globePosition}
                        lightPosition={lightPosition}
                        sharedUniforms={sharedUniforms}
                    />
                </>,
                virtualScene.current
            )}
            {/* Background Shader: Renders to the full canvas */}
            <CloudCompositor
                position={globePosition}
                lightPosition={lightPosition}
                diffuseTexture={fbo.texture}
                depthTexture={fbo.depthTexture}
                lithosphereRadius={3.0}
                sharedUniforms={sharedUniforms}
            />
            <InfiniteStudio
                cameraPosition={camera.position}
                globePosition={globePosition}
                lightPosition={lightPosition}
            />
        </>
    )
}
