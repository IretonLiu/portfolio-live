'use client'

import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene'

import * as THREE from 'three'

export const CanvasContainer = () => {
    return (
        <>
            <div className="fixed min-w-0 inset-0 z-20 items-center justify-center bg-transparent text-slate-900 pointer-events-auto">
                <Canvas
                    dpr={[1, 1.5]}
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
