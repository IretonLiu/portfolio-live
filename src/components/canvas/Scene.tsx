'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame, useThree, createPortal, extend } from '@react-three/fiber'
import { useFBO, Stats, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { AxesHelper } from 'three'
import { Globe } from './Globe'
import { Ocean } from './Ocean'
import { CloudPass } from './Cloud'
import { Leva } from 'leva'

export const Scene = () => {
    const { camera, gl, size } = useThree()
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

    useFrame((state) => {
        // 1. Render Globe (Terrain) to FBO
        gl.setRenderTarget(fbo)
        gl.clear() // Clear FBO buffers
        gl.render(virtualScene, camera)

        // 2. Reset to default framebuffer (Screen)
        gl.setRenderTarget(null)
        // (The main scene, containing Ocean, will be rendered by R3F's default loop)
    })

    return (
        <>
            <Stats showPanel={0} className="fixed top-0 left-0 z-20" />
            {/* Pass 1: Globe rendered into virtual scene */}
            {createPortal(<Globe />, virtualScene)}

            <Globe />

            {/* Pass 2: Cloud rendered to screen, using FBO */}
            <CloudPass
                diffuseTexture={fbo.texture}
                depthTexture={fbo.depthTexture}
            />
        </>
    )
}
