/**
 * Asset: Map Pointer
 * Author: Alexander (https://sketchfab.com/pradvin)
 * URL: https://sketchfab.com/3d-models/map-pointer-3d-icon-a30e2619537a425d90618ae5901c2989
 * License: Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/)
 */

import React, {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { usePointerAnimationStore } from '../../store/useStore'

const SURFACE_OFFSET = 0.12

export const MapPointer = forwardRef<THREE.Mesh, { position: THREE.Vector3 }>(
    function MapPointer({ position }, forwardedRef) {
        const meshRef = useRef<THREE.Mesh>(null)
        const pointerProgressRef = useRef(0)
        const normal = useMemo(() => new THREE.Vector3(), [])
        const modelCorrection = useMemo(
            () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, 0)),
            []
        )
        const correctedUpAxis = useMemo(
            () =>
                new THREE.Vector3(0, 1, 0)
                    .applyQuaternion(modelCorrection)
                    .normalize(),
            [modelCorrection]
        )
        const alignQuaternion = useMemo(() => new THREE.Quaternion(), [])

        const updatePointerTransform = useCallback(
            (mesh: THREE.Mesh, lift = 0) => {
                normal.copy(position).normalize()
                mesh.position
                    .copy(position)
                    .addScaledVector(normal, SURFACE_OFFSET + lift)

                // Align the pointer's corrected local up axis to the globe
                // normal, then apply the model-specific correction so the pin
                // stands perpendicular to the landing point.
                alignQuaternion.setFromUnitVectors(correctedUpAxis, normal)
                mesh.quaternion.copy(alignQuaternion).multiply(modelCorrection)

            },
            [alignQuaternion, correctedUpAxis, modelCorrection, normal, position]
        )

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

        const setMeshRef = useCallback(
            (node: THREE.Mesh | null) => {
                meshRef.current = node
                if (typeof forwardedRef === 'function') {
                    forwardedRef(node)
                } else if (forwardedRef) {
                    forwardedRef.current = node
                }
            },
            [forwardedRef]
        )

        useEffect(() => {
            if (pointerAnimationCounter > 0) {
                pointerProgressRef.current = 0
                const mesh = meshRef.current
                if (mesh) {
                    updatePointerTransform(mesh, 1.0)
                    mesh.visible = true
                }
            }
        }, [pointerAnimationCounter, updatePointerTransform])

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
                pointerProgressRef.current < 1
            ) {
                pointerProgressRef.current += delta * 1.5 // Adjust speed as needed
                if (pointerProgressRef.current >= 1) {
                    pointerProgressRef.current = 1
                }

                const easedProgress = easeOutBounce(pointerProgressRef.current)

                updatePointerTransform(meshRef.current, 1.0 - easedProgress)
            }
        })

        return (
            <>
                <mesh
                    position={position}
                    scale={[0.1, 0.1, 0.1]}
                    visible={false}
                    ref={setMeshRef}
                    material={material}
                    geometry={geometry}
                    castShadow
                ></mesh>
            </>
        )
    }
)
