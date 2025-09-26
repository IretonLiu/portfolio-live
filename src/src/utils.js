import * as THREE from 'three'
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

export { loadShader, loadWrappedTexture, addBarycentricCoordinates }
