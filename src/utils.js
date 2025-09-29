import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
async function loadShader(url) {
    return fetch(url).then((response) => {
        if (!response.ok) {
            throw new Error(
                `Failed to load shader from ${url}: ${response.statusText}`
            )
        }
        return response.text()
    })
}
async function loadObj(url) {
    const loader = new OBJLoader()
    // load a resource
    try {
        const obj = await loader.loadAsync(url)
        return obj
    } catch (err) {
        console.error(`Failed to load obj from ${url}: ${err}`)
    }
}

function loadWrappedTexture(path) {
    const tex = new THREE.TextureLoader().load(path)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
}

function addBarycentricCoordinates(geometry) {
    const count = geometry.attributes.position.count
    const barycentrics = []

    // Assume geometry is made of triangles
    for (let i = 0; i < count; i += 3) {
        barycentrics.push(1, 0, 0)
        barycentrics.push(0, 1, 0)
        barycentrics.push(0, 0, 1)
    }

    const baryAttr = new THREE.Float32BufferAttribute(barycentrics, 3)
    geometry.setAttribute('barycentric', baryAttr)
    return geometry
}

export { loadShader, loadWrappedTexture, addBarycentricCoordinates, loadObj }
