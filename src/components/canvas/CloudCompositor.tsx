import * as THREE from 'three'
import { useRef, useMemo, useEffect, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { fragmentShader as noiseFragmentShader } from './shaders/noiseShaders'
import {
    fragmentShader as cloudFragmentShader,
    vertexShader as cloudVertexShader,
} from './shaders/cloudShaders'
import { Texture } from 'three'

function use3DNoise(gl: THREE.WebGLRenderer) {
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
interface CloudCompositorProps {
    diffuseTexture: Texture
    depthTexture: THREE.DepthTexture | null
    lithosphereRadius?: number
    position?: THREE.Vector3
    lightPosition?: THREE.Vector3
    globeRef?: RefObject<THREE.Mesh | null>
    sharedUniforms?: {
        uMousePoint: { value: THREE.Vector3 }
        uMouseHit: { value: number }
        uBlendRadius: { value: number }
    }
}
export const CloudCompositor = ({
    diffuseTexture,
    depthTexture,
    lithosphereRadius = 3.0,
    position,
    lightPosition,
    globeRef,
    sharedUniforms,
}: CloudCompositorProps) => {
    const { gl, size } = useThree()
    const ref = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const inverseCloudRotation = useMemo(() => new THREE.Matrix3(), [])

    const noiseTexture = use3DNoise(gl)

    // We use useMemo so we don't recreate the material on every render
    const uniforms = useMemo(
        () => ({
            tDiffuse: { value: null },
            tDepth: { value: null },
            uTime: { value: 0.0 },
            uMousePoint: { value: new THREE.Vector3(999, 999, 999) },
            uMouseHit: { value: 0.0 },
            uBlendRadius: { value: 0.0 },
            iResolution: {
                value: new THREE.Vector2(
                    size.width * window.devicePixelRatio,
                    size.height * window.devicePixelRatio
                ),
            },
            uCameraPos: { value: new THREE.Vector3() },
            uLightPos: { value: lightPosition },
            uLightColor: { value: new THREE.Color(0xaaaaaa) },
            uCameraNear: { value: 0.1 },
            uCameraFar: { value: 100 },
            uSphereCenter: { value: position },
            uCloudInverseRotation: { value: new THREE.Matrix3() },
            // this is the radius of the outer shell of the clouds,
            uSphereRadius: { value: lithosphereRadius + 3.0 },
            uLithosphereRadius: { value: lithosphereRadius },
            uInverseProjectionMatrix: { value: new THREE.Matrix4() },
            uInverseViewMatrix: { value: new THREE.Matrix4() },
            uPrecomputedNoise: { value: null },
        }),
        []
    )

    useEffect(() => {
        const material = materialRef?.current
        if (material) {
            material.uniforms.tDiffuse.value = diffuseTexture
            material.uniforms.tDepth.value = depthTexture
            material.uniforms.uPrecomputedNoise.value = noiseTexture
        }
    }, [diffuseTexture, depthTexture, noiseTexture])

    useFrame((state, delta) => {
        const material = materialRef?.current
        state.camera.updateMatrixWorld() // Ensure camera matrices are up to date

        if (material) {
            if (sharedUniforms) {
                material.uniforms.uMousePoint.value.copy(
                    sharedUniforms.uMousePoint.value
                )
                material.uniforms.uMouseHit.value =
                    sharedUniforms.uMouseHit.value
                material.uniforms.uBlendRadius.value =
                    sharedUniforms.uBlendRadius.value
            }
            material.uniforms.uTime.value += delta * 0.05
            material.uniforms.iResolution.value.set(
                size.width * window.devicePixelRatio,
                size.height * window.devicePixelRatio
            )
            if (globeRef?.current) {
                globeRef.current.updateMatrixWorld()
                inverseCloudRotation
                    .setFromMatrix4(globeRef.current.matrixWorld)
                    .invert()
                material.uniforms.uCloudInverseRotation.value.copy(
                    inverseCloudRotation
                )
            } else {
                material.uniforms.uCloudInverseRotation.value.identity()
            }
            material.uniforms.uCameraPos.value.copy(state.camera.position)
            material.uniforms.uInverseProjectionMatrix.value.copy(
                state.camera.projectionMatrixInverse
            )
            material.uniforms.uInverseViewMatrix.value.copy(
                state.camera.matrixWorld
            )
        }
    })

    return (
        <>
            <mesh ref={ref} position={[0, 0, 0]}>
                <planeGeometry args={[2, 2]} />
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={cloudVertexShader}
                    fragmentShader={cloudFragmentShader}
                    uniforms={uniforms}
                    depthWrite={false}
                    depthTest={false}
                    transparent={true}
                />
            </mesh>
        </>
    )
}

CloudCompositor.displayName = 'CloudCompositor'
export default CloudCompositor
