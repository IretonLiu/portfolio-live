import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
    loadShader,
    loadWrappedTexture,
    addBarycentricCoordinates,
    loadObj,
} from './utils.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

let lithosphereRadius, hydrosphereRadius
let scene, camera, pointer
const cameraRadius = 9
let showingPointer = false
export async function initThreeJS() {
    scene = new THREE.Scene()

    // shader chunk
    THREE.ShaderChunk['noise'] = await loadShader('src/shaders/noise.glsl')
    THREE.ShaderChunk['utils'] = await loadShader('src/shaders/utils.glsl')

    const container = document.getElementById('canvas-container')
    let renderWidth = container.clientWidth
    let renderHeight = container.clientHeight
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    })
    renderer.setSize(renderWidth, renderHeight, true)
    container.appendChild(renderer.domElement)

    camera = new THREE.PerspectiveCamera(
        75,
        renderWidth / renderHeight,
        0.1,
        1000
    )
    camera.position.z = cameraRadius

    const lightDir = new THREE.Vector3(1, 1, 1).normalize()
    const lightColor = 0xf9f9f9
    const light = new THREE.DirectionalLight(lightColor, 1.0)
    light.position.copy(lightDir)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0xffffff, 2.0)) // soft white light

    renderer.setClearColor(0x000000, 0) // Black with full transparency

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.update()
    //const axesHelper = new THREE.AxesHelper(5)
    // scene.add(axesHelper)

    // ==============================================================
    // noise texture generation
    // ==============================================================
    const cameraQuad = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const noiseScene = new THREE.Scene() // used for generating noise texture
    const size = 128
    const data = new Float32Array(size * size * size * 4) // RGBAc
    const noiseRenderTarget = new THREE.WebGLRenderTarget(size, size, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    })
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
    const generateNoiseShader = await loadShader(
        'src/shaders/generate_noise_2d.frag'
    )
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
        fragmentShader: generateNoiseShader,
    })
    const noisePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        noiseMaterial
    )
    noiseScene.add(noisePlane)

    for (let z = 0; z < size; z++) {
        // set uniform for slice index
        noiseMaterial.uniforms.sliceZ.value = z / (size - 1)

        // render quad
        renderer.setRenderTarget(noiseRenderTarget)
        renderer.render(noiseScene, cameraQuad)
        renderer.setRenderTarget(null)

        // read pixels
        const buffer = new Float32Array(size * size * 4)
        renderer.readRenderTargetPixels(
            noiseRenderTarget,
            0,
            0,
            size,
            size,
            buffer
        )

        // copy into 3D texture
        for (let i = 0; i < size * size * 4; i++) {
            data[z * size * size * 4 + i] = buffer[i]
        }
    }

    lithosphereRadius = 3
    hydrosphereRadius = 3.0
    // ==============================================================
    // Globe shader
    // ==============================================================
    let lithosphereGeometry = new THREE.IcosahedronGeometry(
        lithosphereRadius,
        40
    )
    lithosphereGeometry = addBarycentricCoordinates(lithosphereGeometry)
    let hydrosphereGeometry = new THREE.IcosahedronGeometry(
        hydrosphereRadius,
        10
    )

    const displacementMap = loadWrappedTexture(
        'assets/textures/displacement.png'
    )
    const textureMap = loadWrappedTexture(
        'assets/textures/texture_vibrant_low_res.png'
    )

    const globeFragmentShader = await loadShader('src/shaders/globe.frag')
    const globeVertexShader = await loadShader('src/shaders/globe.vert')

    // custom shader for vertical displacement
    const terrainMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uDisplacementMap: { value: displacementMap },
            //uNormalMap: { value: normalMap },
            uTexture: { value: textureMap },
            dispScale: { value: 1.0 },
            iResolution: {
                value: new THREE.Vector2(renderWidth, renderHeight),
            },
            uCameraPos: { value: camera.position },
            uLightDir: { value: lightDir },
        },
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
    })
    var overrideMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uDisplacementMap: { value: displacementMap },
            uTexture: { value: textureMap },
            //uNormalMap: { value: normalMap },
            dispScale: { value: 1.0 },
            iResolution: {
                value: new THREE.Vector2(renderWidth, renderHeight),
            },
            uCameraPos: { value: camera.position },
        },
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
    })
    // ==============================================================
    // Ocean shader
    // ==============================================================
    const waveNormalA = loadWrappedTexture('assets/textures/wave_a.png')
    const waveNormalB = loadWrappedTexture('assets/textures/wave_b.png')
    const oceanVertexShader = await loadShader('src/shaders/ocean.vert')
    const oceanFragmentShader = await loadShader('src/shaders/ocean.frag')

    // Get camera matrices
    const viewMatrixInverse = camera.matrixWorld // already inverse of viewMatrix

    const oceanMaterial = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: null },
            tDepth: { value: null },
            uLightColor: { value: new THREE.Color(lightColor) },
            // absorption coefficients for red, green, blue
            uSigmaA: { value: new THREE.Vector3(0.2, 0.04, 0.015) },
            uDisplacementMap: { value: displacementMap },
            uTexture: { value: textureMap },
            uNormalMapA: { value: waveNormalA },
            uNormalMapB: { value: waveNormalB },
            uTime: { value: 0.0 },
            uDispScale: { value: 1.0 },
            iResolution: {
                value: new THREE.Vector2(renderWidth, renderHeight),
            },
            uSphereCenter: { value: new THREE.Vector3(0, 0, 0) },
            uSphereRadius: { value: hydrosphereRadius },
            uCameraNear: { value: camera.near },
            uCameraFar: { value: camera.far },
            uCameraPos: { value: camera.position },
            uLightDir: { value: lightDir },
            uViewMatrixInverse: { value: viewMatrixInverse },
        },
        vertexShader: oceanVertexShader,
        fragmentShader: oceanFragmentShader,
    })
    const lithosphere = new THREE.Mesh(lithosphereGeometry, terrainMaterial)
    // Render only the first geometry into this depth buffer
    const depthTexture = new THREE.DepthTexture()
    depthTexture.type = THREE.FloatType
    const rt = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
        depthTexture: depthTexture,
        depthBuffer: true,
    })

    const hydrosphere = new THREE.Mesh(hydrosphereGeometry, oceanMaterial)

    const cloudFragmentShader = await loadShader('src/shaders/clouds.frag')
    // Get camera matrices
    const projectionMatrix = camera.projectionMatrix
    // For projection matrix inverse
    const projectionMatrixInverse = new THREE.Matrix4()
        .copy(projectionMatrix)
        .invert()

    const cloudPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                uTime: { value: 0.0 },
                iResolution: {
                    value: new THREE.Vector2(renderWidth, renderHeight),
                },
                uCameraPos: { value: camera.position },
                uLightDir: { value: lightDir },
                uLightColor: { value: new THREE.Color(lightColor) },
                uCameraNear: { value: camera.near },
                uCameraFar: { value: camera.far },
                uSphereCenter: { value: new THREE.Vector3(0, 0, 0) },
                uSphereRadius: { value: lithosphereRadius + 1.0 },
                uInverseProjectionMatrix: { value: projectionMatrixInverse },
                uInverseViewMatrix: { value: viewMatrixInverse },
                uPrecomputedNoise: { value: tex3D },
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
    )

    const depthTexture2 = new THREE.DepthTexture()
    depthTexture.type = THREE.FloatType
    const rt2 = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthTexture: depthTexture2,
        depthBuffer: true,
    })
    const effectComposer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    effectComposer.addPass(renderPass)
    effectComposer.addPass(cloudPass)

    scene.add(lithosphere)
    scene.add(hydrosphere)

    // ==============================================================
    // Object loading
    // ==============================================================
    pointer = await loadObj('assets/models/map_pointer.obj')
    pointer.position.set(0, 0, -3)
    const scale = 0.09
    pointer.scale.set(scale, scale, scale)
    scene.add(camera)

    function render() {
        camera.remove(pointer) // remove pointer so it doesn't interfere with depth pass
        renderer.setRenderTarget(rt)
        scene.overrideMaterial = overrideMaterial
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)

        // then render the hydrosphere with the depth texture
        scene.overrideMaterial = null
        oceanMaterial.uniforms.tDepth.value = rt.depthTexture
        oceanMaterial.uniforms.tDiffuse.value = rt.texture

        renderer.setRenderTarget(rt2)
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)

        if (showingPointer) camera.add(pointer) // add pointer back

        cloudPass.uniforms.tDepth.value = rt2.depthTexture
        cloudPass.uniforms.tDiffuse.value = rt2.texture
        effectComposer.render()
    }

    function resize() {
        // Only resize if needed
        renderWidth = container.clientWidth
        renderHeight = container.clientHeight
        // check if rendering is inprogress
        //
        camera.aspect = renderWidth / renderHeight
        camera.updateProjectionMatrix()

        renderer.setSize(renderWidth, renderHeight, true)
        rt.setSize(renderWidth, renderHeight)
        rt2.setSize(renderWidth, renderHeight)
        effectComposer.setSize(renderWidth, renderHeight)

        terrainMaterial.uniforms.iResolution.value.set(
            renderWidth,
            renderHeight
        )
        oceanMaterial.uniforms.iResolution.value.set(renderWidth, renderHeight)
        cloudPass.uniforms.iResolution.value.set(renderWidth, renderHeight)
        cloudPass.uniforms.uInverseProjectionMatrix.value
            .copy(camera.projectionMatrix)
            .invert()
        cloudPass.uniforms.uInverseViewMatrix.value.copy(camera.matrixWorld)
    }

    render()
    // south africa
    moveCameraTo(1.9, 2.7)
    showPointer()
    let frame = 0
    let needsResize = false
    function animate() {
        frame = (frame + 1) % 10000
        requestAnimationFrame(animate)
        if (needsResize) {
            resize()
            needsResize = false
        }
        render()
        // first render the lithosphere to get the depth texture
        controls.update()
        // rotate the light
        const time = frame * 0.001
        light.position.set(Math.sin(time), Math.cos(time), Math.sin(time * 0.5))
        light.position.normalize()
        terrainMaterial.uniforms.uLightDir.value = light.position
        oceanMaterial.uniforms.uLightDir.value = light.position
        cloudPass.uniforms.uLightDir.value = light.position
        oceanMaterial.uniforms.uCameraPos.value = camera.position
        oceanMaterial.uniforms.uTime.value = frame * 0.0001
        terrainMaterial.uniforms.uCameraPos.value = camera.position
        cloudPass.uniforms.uTime.value = frame * 0.0001
        cloudPass.uniforms.uCameraPos.value = camera.position
    }

    animate()

    window.addEventListener('resize', () => {
        needsResize = true
    })
}

function moveCameraTo(theta, phi) {
    // theta: polar angle from y-axis
    // phi: azimuthal angle from x-axis in xz-plane
    const x = cameraRadius * Math.sin(theta) * Math.cos(phi)
    const y = cameraRadius * Math.cos(theta)
    const z = cameraRadius * Math.sin(theta) * Math.sin(phi)
    // easing function (ease-out cubic)
    const finalPos = new THREE.Vector3(x, y, z)
    const startPos = camera.position.clone()
    let frame = 0
    const duration = 60 // frames
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3)
    }

    function animateCameraMove() {
        frame++
        const t = Math.min(frame / duration, 1)
        const easedT = easeOutCubic(t)
        camera.position.lerpVectors(startPos, finalPos, easedT)
        camera.lookAt(0, 0, 0)
        if (frame < duration) {
            requestAnimationFrame(animateCameraMove)
        } else if (t === 1) {
            // end of animation
            return
        }
    }
    animateCameraMove()
}

function hidePointer() {
    camera.remove(pointer)
    showingPointer = false
}
function showPointer() {
    if (showingPointer) return
    // initial setup
    // makes sure that the pointer ways show up in front of the rotated camera
    pointer.position.set(0, 5, -3) // start above the globe for drop animation
    showingPointer = true
    camera.add(pointer)

    let dropFrame = 0
    const dropDuration = 30

    // easing function (ease-out cubic)
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3)
    }

    function dropAnimation() {
        dropFrame++

        // normalized progress [0,1]
        const t = Math.min(dropFrame / dropDuration, 1)

        // apply easing
        const easedT = easeOutCubic(t)

        // interpolate y position
        pointer.position.y = 5 * (1 - easedT)

        if (dropFrame < dropDuration) {
            requestAnimationFrame(dropAnimation)
        } else {
            pointer.position.y = 0
        }
    }

    dropAnimation()
}
export { scene, camera, pointer, showPointer, hidePointer, moveCameraTo }
