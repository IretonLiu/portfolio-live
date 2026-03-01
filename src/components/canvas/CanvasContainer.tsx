'use client'

import { useRef } from 'react'
import { View, Preload, Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Stars, OrbitControls } from '@react-three/drei'
import { Scene } from './Scene'

import * as THREE from 'three'

export const CanvasContainer = () => {
    const uiRef = useRef(null)

    return (
        <>
            <div className="fixed min-w-0 inset-0 z-20 items-center justify-center bg-transparent text-slate-900 pointer-events-auto">
                <Canvas
                    shadows={{ type: THREE.PCFSoftShadowMap }}
                    gl={{
                        antialias: true,
                        autoClear: false,
                    }}
                >
                    <Scene />
                    {/* Precompute handles the heavy lifting of syncing the view to the div */}
                </Canvas>
            </div>
        </>
    )
}
