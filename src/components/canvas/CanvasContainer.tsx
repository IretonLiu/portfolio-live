'use client'

import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, OrbitControls } from '@react-three/drei'
import { Scene } from './Scene'
import * as THREE from 'three'

export const CanvasContainer = () => {
    return (
        <div className="w-full h-full">
            <Canvas
                shadows={{ type: THREE.PCFSoftShadowMap }}
                camera={{ position: [9, 9, 9], fov: 45 }}
            >
                <Scene />
                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    minDistance={8}
                    maxDistance={20}
                />
            </Canvas>
        </div>
    )
}
