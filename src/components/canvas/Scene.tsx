'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree, createPortal } from '@react-three/fiber'
import { useFBO, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Globe } from './Globe'
import { CloudCompositor } from './CloudCompositor'
import { RaySphereIntersection } from './Utils'
import { easing } from 'maath'
import { InfiniteStudio } from './InfiniteStudio'
import ParallexCamera from './ParallaxCamera'
import { MapPointer } from './Pointer'
import {
    useGlobeRotationStore,
    usePointerAnimationStore,
} from '../../store/useStore'
import { useGlobeDragControls } from './hooks/useGlobeDragControls'

const radius = 3.0
const cloudPostMaskRadius = 4.2
const globePosition = new THREE.Vector3(5, 0, 0)
const lightPosition = new THREE.Vector3(6, 7, 10)
const pointerPosition = new THREE.Vector3(4.4, 0.5, 3.2)
const outofviewPointerPosition = new THREE.Vector3(999, 999, 999)
const ENABLE_POST_PROCESSING = true
const ENABLE_GLOBE_DRAG_CONTROLS = true
const MAIN_LIGHT_DAY_INTENSITY = 3.2
const MAIN_LIGHT_NIGHT_INTENSITY = 0.2
const NIGHT_START_HOUR = 18
const NIGHT_END_HOUR = 7

const getLocalHour = () => {
    const now = new Date()
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
}

const isLocalNight = () => {
    const hour = getLocalHour()
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR
}

const getMainLightIntensity = () =>
    isLocalNight() ? MAIN_LIGHT_NIGHT_INTENSITY : MAIN_LIGHT_DAY_INTENSITY

export const Scene = () => {
    const { camera, gl, scene, size } = useThree()
    const virtualScene = useRef<THREE.Scene>(null)
    const globeRef = useRef<THREE.Mesh>(null)
    const mainLightRef = useRef<THREE.DirectionalLight>(null)

    const pointerAnimationCounter = usePointerAnimationStore(
        (state) => state.pointerAnimationCounter
    )
    const targetGlobeRotation = useGlobeRotationStore(
        (state) => state.targetGlobeRotation
    )

    const markerLocalPosition = useMemo(() => {
        const localAnchor = pointerPosition.clone().sub(globePosition)
        const targetRotation = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(targetGlobeRotation.phi, targetGlobeRotation.theta, 0)
        )
        return localAnchor.applyQuaternion(targetRotation.invert())
    }, [targetGlobeRotation.phi, targetGlobeRotation.theta])

    if (virtualScene.current === null) {
        virtualScene.current = new THREE.Scene()
    }

    const fboSettings = useMemo(
        () => ({
            depthBuffer: true,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        }),
        []
    )

    const postFboSettings = useMemo(
        () => ({
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
        }),
        []
    )

    // Create FBO with depth buffer
    const fbo = useFBO(fboSettings)
    const postFbo = useFBO(postFboSettings)
    const postCamera = useMemo(
        () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        []
    )
    const postMaterial = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: null },
                    tGlobeMask: { value: null },
                    uTime: { value: 0 },
                    uResolution: { value: new THREE.Vector2() },
                    uGlobeScreen: { value: new THREE.Vector2(0.5, 0.5) },
                    uCloudScreenRadius: { value: 0.0 },
                },
                vertexShader: /* glsl */ `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position.xy, 0.0, 1.0);
                    }
                `,
                fragmentShader: /* glsl */ `
                    varying vec2 vUv;
                    uniform sampler2D tDiffuse;
                    uniform sampler2D tGlobeMask;
                    uniform vec2 uResolution;
                    uniform vec2 uGlobeScreen;
                    uniform float uCloudScreenRadius;
                    uniform float uTime;

                    float hash(vec2 p) {
                        p = fract(p * vec2(123.34, 456.21));
                        p += dot(p, p + 45.32);
                        return fract(p.x * p.y);
                    }

                    vec3 acesTonemap(vec3 color) {
                        color *= 1.18;
                        const float a = 2.51;
                        const float b = 0.03;
                        const float c = 2.43;
                        const float d = 0.59;
                        const float e = 0.14;
                        return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
                    }

                    void main() {
                        vec2 fromCenter = vUv - 0.5;
                        vec3 baseColor = texture2D(tDiffuse, vUv).rgb;

                        // Use the offscreen globe render as a screen-space mask so
                        // post FX hit the planet/pointer instead of the whole page.
                        vec3 maskColor = texture2D(tGlobeMask, vUv).rgb;
                        float maskLuma = dot(maskColor, vec3(0.299, 0.587, 0.114));
                        float globeMask = smoothstep(0.015, 0.12, maskLuma);
                        vec2 aspectUv = (vUv - uGlobeScreen) * vec2(uResolution.x / uResolution.y, 1.0);
                        float cloudMask = 1.0 - smoothstep(uCloudScreenRadius, uCloudScreenRadius + 0.035, length(aspectUv));
                        globeMask = max(globeMask, cloudMask);
                        if (globeMask < 0.01) {
                            gl_FragColor = vec4(baseColor, 1.0);
                            return;
                        }

                        // Very occasional short tearing bursts.
                        float glitchWindow = 1.0 - smoothstep(0.0, 0.01, fract(uTime * 0.05 + 0.37));
                        float glitchFrame = floor(uTime * 12.0);
                        float bandId = floor(vUv.y * 16.0);
                        float band = step(0.55, hash(vec2(bandId, glitchFrame)));
                        float tear = (hash(vec2(bandId + 12.7, glitchFrame)) - 0.5) * 0.14 * band * glitchWindow * globeMask;
                        vec2 glitchUv = vUv + vec2(tear, 0.0);

                        vec2 aberration = fromCenter * 0.0075 * (1.0 + glitchWindow * 3.8);

                        vec3 fxColor;
                        fxColor.r = texture2D(tDiffuse, glitchUv + aberration).r;
                        fxColor.g = texture2D(tDiffuse, glitchUv).g;
                        fxColor.b = texture2D(tDiffuse, glitchUv - aberration).b;

                        vec3 luma = vec3(dot(fxColor, vec3(0.299, 0.587, 0.114)));
                        fxColor = mix(luma, fxColor, 1.08);
                        fxColor = (fxColor - 0.5) * 1.06 + 0.5;

                        float vignette = smoothstep(0.95, 0.18, dot(fromCenter, fromCenter));
                        fxColor *= mix(0.82, 1.04, vignette);

                        float grain = hash(vUv * uResolution + uTime * 60.0) - 0.5;
                        fxColor += grain * 0.018;

                        float scan = step(0.985, hash(vec2(floor(vUv.y * 260.0), floor(uTime * 28.0))));
                        fxColor += scan * glitchWindow * vec3(0.16, 0.24, 0.34);
                        fxColor *= 1.0 + glitchWindow * band * 0.16;

                        // Full ACES can wash out this palette, so blend it in and
                        // restore a little chroma afterwards.
                        fxColor = mix(fxColor, acesTonemap(fxColor), 0.45);
                        vec3 postLuma = vec3(dot(fxColor, vec3(0.299, 0.587, 0.114)));
                        fxColor = mix(postLuma, fxColor, 1.22);

                        gl_FragColor = vec4(mix(baseColor, fxColor, globeMask), 1.0);
                    }
                `,
                depthWrite: false,
                depthTest: false,
            }),
        []
    )
    const postScene = useMemo(() => {
        const postScene = new THREE.Scene()
        postScene.add(
            new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial)
        )
        return postScene
    }, [postMaterial])

    useEffect(() => {
        return () => {
            postMaterial.dispose()
            const quad = postScene.children[0] as THREE.Mesh
            quad.geometry.dispose()
        }
    }, [postMaterial, postScene])
    const rayOrigin = useMemo(() => new THREE.Vector3(), [])
    const rayDir = useMemo(() => new THREE.Vector3(), [])
    const hitPoint = useMemo(() => new THREE.Vector3(), [])
    const markerWorldPosition = useMemo(() => new THREE.Vector3(), [])
    const markerRef = useRef<THREE.Mesh>(null)
    const globeScreen = useMemo(() => new THREE.Vector3(), [])
    const globeScreenEdge = useMemo(() => new THREE.Vector3(), [])
    const cameraRight = useMemo(() => new THREE.Vector3(), [])
    const sharedUniforms = useMemo(() => {
        return {
            uMousePoint: { value: outofviewPointerPosition.clone() },
            uMouseHit: { value: 0.0 },
            uBlendRadius: { value: 0.0 },
        }
    }, [])

    const isRaycastActive = useRef(false)
    useEffect(() => {
        const handleMove = () => {
            isRaycastActive.current = true
            window.removeEventListener('pointermove', handleMove)
        }

        window.addEventListener('pointermove', handleMove)

        return () => window.removeEventListener('pointermove', handleMove)
    }, [])

    const pointerShowing = useRef(false)
    useEffect(() => {
        if (pointerAnimationCounter > 0) {
            pointerShowing.current = true
        }
    }, [pointerAnimationCounter])

    const globeDragControls = useGlobeDragControls({
        enabled: ENABLE_GLOBE_DRAG_CONTROLS,
        globeRef,
        globePosition,
        radius,
        sensitivity: 4.5,
        damping: 0.92,
    })

    useFrame((state, delta) => {
        const mainLight = mainLightRef.current
        if (mainLight) {
            mainLight.intensity = getMainLightIntensity()
        }

        // Keep camera matrices current for raycasting and shader uniforms.
        state.camera.updateMatrixWorld()
        const mouseX = state.pointer.x
        const mouseY = state.pointer.y

        // update fbo size if the viewport has changed

        rayOrigin.copy(state.camera.position)
        if (isRaycastActive.current) {
            rayDir
                .set(mouseX, mouseY, 0.0)
                .unproject(state.camera)
                .sub(rayOrigin)
                .normalize()
        } else {
            rayDir
                .set(999, 999, -1)
                .transformDirection(state.camera.matrixWorld)
        }

        const tHit = RaySphereIntersection(
            rayOrigin,
            rayDir,
            globePosition,
            radius
        )

        if (tHit > 0 && hitPoint && rayOrigin && rayDir) {
            hitPoint.copy(rayOrigin).addScaledVector(rayDir, tHit)
            sharedUniforms.uMousePoint.value.copy(hitPoint)
            sharedUniforms.uMouseHit.value = 1.0
            easing.damp(sharedUniforms.uBlendRadius, 'value', 3.0, 0.25, delta)
        } else if (pointerShowing.current) {
            if (markerRef.current) {
                markerRef.current.getWorldPosition(markerWorldPosition)
                sharedUniforms.uMousePoint.value.copy(markerWorldPosition)
            } else {
                sharedUniforms.uMousePoint.value.copy(pointerPosition)
            }
            sharedUniforms.uMouseHit.value = 1.0
            easing.damp(sharedUniforms.uBlendRadius, 'value', 3.0, 0.25, delta)
        } else {
            sharedUniforms.uMousePoint.value.copy(outofviewPointerPosition)
            sharedUniforms.uMouseHit.value = -1.0
            easing.damp(sharedUniforms.uBlendRadius, 'value', 3.0, 0.25, delta)
        }
    }, 0)

    // Take over rendering so the scene is not rendered once manually here and
    // then a second time by R3F's automatic render loop.
    useFrame((state) => {
        gl.setRenderTarget(fbo)
        gl.clear()

        if (virtualScene.current) gl.render(virtualScene.current, state.camera)

        if (!ENABLE_POST_PROCESSING) {
            gl.setRenderTarget(null)
            gl.clear()
            gl.render(scene, state.camera)
            return
        }

        gl.setRenderTarget(postFbo)
        gl.clear()
        gl.render(scene, state.camera)

        globeScreen.copy(globePosition).project(state.camera)
        cameraRight.setFromMatrixColumn(state.camera.matrixWorld, 0)
        globeScreenEdge
            .copy(globePosition)
            .addScaledVector(cameraRight, cloudPostMaskRadius)
            .project(state.camera)

        const aspect = size.width / size.height
        postMaterial.uniforms.tDiffuse.value = postFbo.texture
        postMaterial.uniforms.tGlobeMask.value = fbo.texture
        postMaterial.uniforms.uTime.value = state.clock.elapsedTime
        postMaterial.uniforms.uResolution.value.set(
            size.width * gl.getPixelRatio(),
            size.height * gl.getPixelRatio()
        )
        postMaterial.uniforms.uGlobeScreen.value.set(
            globeScreen.x * 0.5 + 0.5,
            globeScreen.y * 0.5 + 0.5
        )
        postMaterial.uniforms.uCloudScreenRadius.value =
            Math.abs(globeScreenEdge.x - globeScreen.x) * 0.5 * aspect

        gl.setRenderTarget(null)
        gl.clear()
        gl.render(postScene, postCamera)
    }, 1)

    return (
        <>
            {/*<Stats showPanel={0} className="fixed top-0 left-0 z-20" />*/}
            <ParallexCamera amplitude={1.0} damping={0.1} />
            <PerspectiveCamera
                makeDefault
                position={[0, 0, 15]}
                near={0.1}
                far={100}
            ></PerspectiveCamera>
            {createPortal(
                <>
                    <directionalLight
                        ref={mainLightRef}
                        position={lightPosition}
                        intensity={getMainLightIntensity()}
                        color={0xffffff}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                    />
                    <Globe
                        ref={globeRef}
                        position={globePosition}
                        lightPosition={lightPosition}
                        manualControlActiveRef={globeDragControls.isActiveRef}
                        sharedUniforms={sharedUniforms}
                    >
                        <MapPointer
                            ref={markerRef}
                            position={markerLocalPosition}
                        />
                    </Globe>
                </>,
                virtualScene.current
            )}
            {/* Background Shader: Renders to the full canvas */}
            <CloudCompositor
                position={globePosition}
                lightPosition={lightPosition}
                globeRef={globeRef}
                diffuseTexture={fbo.texture}
                depthTexture={fbo.depthTexture}
                lithosphereRadius={3.0}
                sharedUniforms={sharedUniforms}
            />
            <InfiniteStudio
                cameraPosition={camera.position}
                globePosition={globePosition}
                lightPosition={lightPosition}
            />
        </>
    )
}
