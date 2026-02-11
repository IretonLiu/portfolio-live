import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Import your shader strings here (omitted for brevity)
import { globeVertexShader, globeFragmentShader } from './shaders/globeShaders'
import { oceanVertexShader, oceanFragmentShader } from './shaders/oceanShaders'

const TerrainMaterial = shaderMaterial(
    {
        uDisplacementMap: null,
        uTexture: null,
        dispScale: 1.0,
        uCameraPos: new THREE.Vector3(),
        uLightDir: new THREE.Vector3(1.0, 1.0, 1.0), // Example default
    },
    globeVertexShader, // Your vertex shader string
    globeFragmentShader // Your fragment shader string
)

const OceanMaterial = shaderMaterial(
    {
        tDepth: null, // This will receive the FBO depth
        uDisplacementMap: null,
        uNormalMapA: null,
        uNormalMapB: null,
        uCameraNear: 0,
        uCameraFar: 0,
        uTime: 0,
        // ... add other uniforms
    },
    oceanVertexShader,
    oceanFragmentShader
)

// Extend allows these to be used as <terrainMaterial /> in JSX
extend({ TerrainMaterial, OceanMaterial })
