import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
    loadShader,
    loadWrappedTexture,
    addBarycentricCoordinates,
} from './utils.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

export async function initThreeJS() {
    const scene = new THREE.Scene()

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

    const camera = new THREE.PerspectiveCamera(
        75,
        renderWidth / renderHeight,
        0.1,
        1000
    )
    camera.position.z = 6
    const lightDir = new THREE.Vector3(1, 1, 1).normalize()
    const lightColor = 0xffffff

    renderer.setClearColor(0x000000, 0) // Black with full transparency

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.update()
    const axesHelper = new THREE.AxesHelper(5)

    scene.add(axesHelper)

    const lithosphereRadius = 3
    const hydrosphereRadius = 2.9
    // ==============================================================
    // Globe shader
    // ==============================================================
    let lithosphereGeometry = new THREE.IcosahedronGeometry(
        lithosphereRadius,
        100
    )
    lithosphereGeometry = addBarycentricCoordinates(lithosphereGeometry)
    let hydrosphereGeometry = new THREE.IcosahedronGeometry(
        hydrosphereRadius,
        10
    )

    const displacementMap = loadWrappedTexture(
        'assets/textures/displacement_scaled.png'
    )
    const textureMap = loadWrappedTexture('assets/textures/texture_vibrant.jpg')

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
        },
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
    })
    var overrideMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uDisplacementMap: { value: displacementMap },
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
            uSigmaA: { value: new THREE.Vector3(0.3, 0.06, 0.015) },
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

    function render() {
        renderer.setRenderTarget(rt)
        scene.overrideMaterial = overrideMaterial
        renderer.render(scene, camera)
        scene.overrideMaterial = null
        renderer.setRenderTarget(null)

        // then render the hydrosphere with the depth texture
        oceanMaterial.uniforms.tDepth.value = rt.depthTexture
        oceanMaterial.uniforms.tDiffuse.value = rt.texture

        renderer.setRenderTarget(rt2)
        renderer.render(scene, camera)
        renderer.setRenderTarget(null)

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

        renderer.setSize(renderWidth, renderHeight, true)
        rt.setSize(renderWidth, renderHeight)
        camera.aspect = renderWidth / renderHeight
        camera.updateProjectionMatrix()
        effectComposer.setSize(renderWidth, renderHeight)
        terrainMaterial.uniforms.iResolution.value.set(
            renderWidth,
            renderHeight
        )
        oceanMaterial.uniforms.iResolution.value.set(renderWidth, renderHeight)
        cloudPass.uniforms.iResolution.value.set(renderWidth, renderHeight)
    }

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
