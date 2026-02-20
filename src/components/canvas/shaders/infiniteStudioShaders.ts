export const vertexShader = `
varying vec2 vUv;


void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0); // Fullscreen quad in NDC
}
`

export const fragmentShader = `
precision highp float;

#define MAX_STEPS 20
#define MAX_DISTANCE 50.0
#define SURFACE_EPSILON 0.01

varying vec2 vUv;

uniform vec2 iResolution;
uniform float uTime;
uniform vec3 lightDir;

float planeSDF(vec3 p, vec3 n, float h) {
    return dot(p, n) - h;
}

float sphereSDF(vec3 p, vec3 center, float radius) {
    return length(p - center) - radius;
}


float smoothUnion( float a, float b, float k )
{
    k *= 4.0;
    float h = max(k-abs(a-b),0.0);
    return min(a, b) - h*h*0.25/k;
}

float sceneSDF(vec3 p) {
    float planeDist = planeSDF(p, vec3(0.0, 1.0, 0.0), -1.0); 
    float sphereDist = abs(sphereSDF(p, vec3(0.0, 19.0, 10.0), 20.0));
    return smoothUnion(planeDist, sphereDist,0.2);

}

float globeSDF(vec3 p) {
    return sphereSDF(p, vec3(0.0, 0.0, 13.7), 0.4);
}

vec3 calcNormal(vec3 p ) // for function f(p)
{
    const float eps = 0.0001; // or some other value
    const vec2 h = vec2(eps,0);
    return normalize( vec3(sceneSDF(p+h.xyy) - sceneSDF(p-h.xyy),
                           sceneSDF(p+h.yxy) - sceneSDF(p-h.yxy),
                           sceneSDF(p+h.yyx) - sceneSDF(p-h.yyx) ) 
    );
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float shadowMarch(vec3 ro, vec3 rd) {
    float totalDist = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * totalDist;
        float sdf = globeSDF(p);

        if (sdf < 0.0001) {
            break;
        }
        totalDist += sdf;
        if (totalDist > 10.0) {
            break; // No shadow
        }
    }
    return totalDist; // Not in shadow
}


void main() {

    float aspectRatio = iResolution.x / iResolution.y;

    vec2 uv = (vUv -0.5);// Convert to range [-1, 1]
    uv.x *= aspectRatio; // Correct for aspect ratio
    

        // wobble rotation
    float rotationAngle = sin(uTime *0.01); // Rotate over time

    mat3 rotX = mat3(1.0, 0.0, 0.0,
                        0.0, cos(rotationAngle), -sin(rotationAngle),
                        0.0, sin(rotationAngle), cos(rotationAngle));
    mat3 rotY = mat3(cos(rotationAngle), 0.0, sin(rotationAngle),
                        0.0, 1.0, 0.0,
                        -sin(rotationAngle), 0.0, cos(rotationAngle));

    mat3 rotMatrix = rotY * rotX; // Combine rotations

    vec3 ro = vec3(0.0, 0.0, 15.0); // Ray origin
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray direction

    float totalDist =0.0; // Start with a small random offset to reduce banding
    for (int i = 0; i < MAX_STEPS; i++) {

        vec3 p = ro + rd * totalDist; // Current point along the ray

        float sdf = sceneSDF(p); // Get distance to closest surface
        if (sdf < 0.0) {
            sdf *= -1.0; // If inside a surface, take the positive distance to exit
        }

        if (sdf < SURFACE_EPSILON) {
            break; // Hit a surface
        }
        totalDist += sdf; // Move along the ray by the distance to the surface
        if (totalDist > MAX_DISTANCE) {
            break; // Exceeded max distance, no hit
        }
    }

    vec3 hitPoint = ro + rd * totalDist;
    float shadow = clamp(shadowMarch(hitPoint, normalize(lightDir)), 0.0, 1.0);

    vec3 normal = calcNormal(hitPoint);
    vec3 lightColor = vec3(1.0) * 0.2;
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 col = diffuse * lightColor*1.0 *shadow; 



    //gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(iResolution.x * vUv.x + iResolution.y * vUv.y), 1.0);
    gl_FragColor = vec4(col, 1.0);

}
`
