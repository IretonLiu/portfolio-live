// map point obj
// load the model and texture
import React, { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

export const MapPointer = ({ hidden }) => {
    const meshRef = useRef<THREE.Mesh>(null)
    // load the model and texture
    const geometry = useMemo(() => {
        const obj = useLoader(OBJLoader, '/assets/models/map_pointer.obj')
        return obj.children[0].geometry as THREE.BufferGeometry
    }, [])

    const material = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1.0,
        })
    }, [])

    return <mesh ref={meshRef} geometry={geometry} material={material} />
}
