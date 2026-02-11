import * as THREE from 'three'
import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { fragmentShader as noiseFragmentShader } from './shaders/noiseShaders'
import { fragmentShader as cloudFragmentShader } from './shaders/cloudShaders'

// Register ShaderPass as a native JSX element <shaderPass />
extend({ ShaderPass })

function use3DNoise(gl) {
    return useMemo(() => {
        if (!noiseFragmentShader) return null

        const size = 256
        const data = new Float32Array(size * size * size * 4) // RGBA

        // Setup temporary scene for rendering slices
        const noiseScene = new THREE.Scene()
        const cameraQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

        const noiseRenderTarget = new THREE.WebGLRenderTarget(size, size, {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
        })

        const noiseMaterial = new THREE.ShaderMaterial({
            uniforms: {
                size: { value: size },
                sliceZ: { value: 0.0 },
            },
            vertexShader: `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: noiseFragmentShader,
        })

        const noisePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            noiseMaterial
        )
        noiseScene.add(noisePlane)

        const buffer = new Float32Array(size * size * 4)

        // Preserve original renderer state
        const currentRenderTarget = gl.getRenderTarget()

        // Render slices
        for (let z = 0; z < size; z++) {
            noiseMaterial.uniforms.sliceZ.value = z / (size - 1)

            gl.setRenderTarget(noiseRenderTarget)
            gl.render(noiseScene, cameraQuad)

            gl.readRenderTargetPixels(
                noiseRenderTarget,
                0,
                0,
                size,
                size,
                buffer
            )

            // Copy to 3D buffer
            for (let i = 0; i < size * size * 4; i++) {
                data[z * size * size * 4 + i] = buffer[i]
            }
        }

        // Restore renderer state
        gl.setRenderTarget(currentRenderTarget)

        // Clean up temp objects
        noiseRenderTarget.dispose()
        noiseMaterial.dispose()
        noisePlane.geometry.dispose()

        // Create 3D Texture
        const tex3D = new THREE.Data3DTexture(data, size, size, size)
        tex3D.format = THREE.RGBAFormat
        tex3D.type = THREE.FloatType
        tex3D.minFilter = THREE.LinearFilter
        tex3D.magFilter = THREE.LinearFilter
        tex3D.wrapS = THREE.RepeatWrapping
        tex3D.wrapT = THREE.RepeatWrapping
        tex3D.wrapR = THREE.RepeatWrapping
        tex3D.generateMipmaps = false
        tex3D.unpackAlignment = 1
        tex3D.needsUpdate = true

        return tex3D
    }, [gl, noiseFragmentShader])
}

export function CloudPass({
    diffuseTexture,
    depthTexture,
    lightDir = new THREE.Vector3(1, 1, 1),
    lithosphereRadius = 3.0,
}) {
    const { gl, camera, size } = useThree()
    const passRef = useRef()

    const noiseTexture = use3DNoise(gl)

    // 2. Memoize the Material
    // We use useMemo so we don't recreate the material on every render
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                uTime: { value: 0.0 },
                iResolution: {
                    value: new THREE.Vector2(size.width, size.height),
                },
                uCameraPos: { value: new THREE.Vector3() },
                uLightDir: { value: new THREE.Vector3() },
                uLightColor: { value: new THREE.Color(0xf9f9f9) },
                uCameraNear: { value: 0.1 },
                uCameraFar: { value: 1000 },
                uSphereCenter: { value: new THREE.Vector3(0, 0, 0) },
                uSphereRadius: { value: lithosphereRadius + 3.0 },
                uInverseProjectionMatrix: { value: new THREE.Matrix4() },
                uInverseViewMatrix: { value: new THREE.Matrix4() },
                uPrecomputedNoise: { value: null },
            },
            vertexShader: `
        varying vec4 vClipPos;
        void main() {
          vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = vClipPos;
        }
      `,
            fragmentShader: cloudFragmentShader,
        })
    }, [cloudFragmentShader, lithosphereRadius, size.width, size.height])

    // 3. Connect Inputs
    useEffect(() => {
        if (material) {
            material.uniforms.tDiffuse.value = diffuseTexture
            material.uniforms.tDepth.value = depthTexture
            material.uniforms.uPrecomputedNoise.value = noiseTexture
            material.needsUpdate = true
        }
    }, [diffuseTexture, depthTexture, noiseTexture, material])

    // 4. Update Uniforms per Frame
    useFrame((state) => {
        if (!passRef.current || !material) return

        const { clock, camera } = state

        // Update simple uniforms
        material.uniforms.uTime.value = clock.getElapsedTime() * 0.1 // Scaled to match original 0.0001 frame increment
        material.uniforms.uCameraPos.value.copy(camera.position)
        material.uniforms.uLightDir.value.copy(lightDir)
        material.uniforms.uCameraNear.value = camera.near
        material.uniforms.uCameraFar.value = camera.far

        // Update Matrices
        // ThreeJS cameras auto-update projectionMatrixInverse
        material.uniforms.uInverseProjectionMatrix.value.copy(
            camera.projectionMatrixInverse
        )

        // The camera.matrixWorld is the inverse of the View Matrix
        material.uniforms.uInverseViewMatrix.value.copy(camera.matrixWorld)
    })

    // Update resolution on resize
    useEffect(() => {
        material.uniforms.iResolution.value.set(size.width, size.height)
    }, [size])

    return <shaderPass ref={passRef} args={[material]} />
}
