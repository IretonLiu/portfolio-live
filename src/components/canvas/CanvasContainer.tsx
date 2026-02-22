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
            {/* 2. THE RENDER LAYER: Full screen behind the UI */}
            <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-transparent text-slate-900 pointer-events-auto">
                <Canvas dpr={[1, 2]}>
                    {/* The Sphere View: Only renders inside the 'uiRef' bounds */}
                    <Scene />

                    {/* Precompute handles the heavy lifting of syncing the view to the div */}
                </Canvas>
            </div>
        </>
    )

    // return (
    //     <div className="w-full h-full">
    //         <Canvas
    //             shadows={{ type: THREE.PCFSoftShadowMap }}
    //             gl={{ autoRender: false }}
    //         >
    //             <Scene />
    //         </Canvas>
    //     </div>
    // )
}
