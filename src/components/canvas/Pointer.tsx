/**
 * Asset: Map Pointer
 * Author: Alexander (https://sketchfab.com/pradvin)
 * URL: https://sketchfab.com/3d-models/map-pointer-3d-icon-a30e2619537a425d90618ae5901c2989
 * License: Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/)
 */

import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { usePointerAnimationStore } from '../../store/useStore'

export const MapPointer = ({ position }: { position: THREE.Vector3 }) => {
    const meshRef = useRef<THREE.Mesh>(null)
    // load the model and texture
    const obj = useLoader(OBJLoader, '/assets/models/map_pointer.obj')
    const geometry = useMemo(() => {
        const mesh = obj.children[0] as THREE.Mesh
        return mesh.geometry
    }, [obj])

    const material = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            color: 0xff0000,
            transparent: false,
            opacity: 1.0,
        })
    }, [])

    const pointerAnimationCounter = usePointerAnimationStore(
        (state) => state.pointerAnimationCounter
    )

    const pointerAnimationState = useMemo(
        () => ({
            progress: 0,
        }),
        []
    )

    useEffect(() => {
        if (pointerAnimationCounter > 0) {
            pointerAnimationState.progress = 0
            const mesh = meshRef.current
            if (mesh) {
                mesh.position.set(position.x, position.y + 1.0, position.z)
                mesh.visible = true
            }
        }
    }, [pointerAnimationCounter])

    const easeOutBounce = (t: number) => {
        const n1 = 7.5625
        const d1 = 2.75

        if (t < 1 / d1) {
            return n1 * t * t
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375
        }
    }
    useFrame((state, delta) => {
        if (
            pointerAnimationCounter > 0 &&
            meshRef.current &&
            pointerAnimationState.progress < 1
        ) {
            pointerAnimationState.progress += delta * 1.5 // Adjust speed as needed
            if (pointerAnimationState.progress >= 1) {
                pointerAnimationState.progress = 1
            }

            const easedProgress = easeOutBounce(pointerAnimationState.progress)

            meshRef.current.position.y = THREE.MathUtils.lerp(
                position.y + 1.0,
                position.y,
                easedProgress
            )
        }
    })

    return (
        <>
            <mesh
                position={position}
                scale={[0.1, 0.1, 0.1]}
                rotation={[0.6, 0, 0]}
                visible={false}
                ref={meshRef}
                material={material}
                geometry={geometry}
                castShadow
            ></mesh>
        </>
    )
}
