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
#define MAX_SHADOW_STEPS 20
#define MAX_DISTANCE 25.0
#define SURFACE_EPSILON 0.0001

varying vec2 vUv;

uniform vec2 iResolution;
uniform float uTime;
uniform vec3 uLightPos;
uniform vec3 uGlobePos;
uniform vec3 uCameraPos;
uniform mat4 uWobbleMatrix;
uniform mat4 uInverseProjectionMatrix;
uniform mat4 uInverseViewMatrix;

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
    float planeDist = planeSDF(p, normalize(vec3(0.0, 1.0, 0.0)), -4.0); 
    float sphereDist = -sphereSDF(p, vec3(0.0, 0.0, 10.0), 20.0);
    float globeDist = sphereSDF(p, uGlobePos, 3.0);
    float background = smoothUnion(planeDist, sphereDist,1.0);
    //float background = min(planeDist, sphereDist);
    return background;
    //return min(planeDist, globeDist);


}

float globeSDF(vec3 p) {
    return sphereSDF(p, vec3(5.0, 0.0,0.0 ), 0.0);
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
    float totalDist = 0.02; 
    
    for (int i = 0; i < MAX_SHADOW_STEPS; i++) {
        vec3 p = ro + rd * totalDist;
        float sdf = sphereSDF(p, uGlobePos, 3.0);
        
        if (sdf < 0.0001) {
            break;
        }
        
        totalDist += sdf;
        
        if (totalDist >MAX_DISTANCE) {
            return 1.0; 
        }
    }
    
    return totalDist /20.0; 
}

void main() {

    float aspectRatio = iResolution.x / iResolution.y;

    vec2 uv = vUv;
    uv.x = uv.x * aspectRatio;
    vec2 ndc = uv * 2.0 - 1.0;
    vec4 clipPos = vec4(ndc, 0.0, 1.0);
    vec4 viewPos = uInverseProjectionMatrix * clipPos;
    viewPos /= viewPos.w;
    vec4 worldPos = uInverseViewMatrix * viewPos;
    


    float angle = uTime * 0.1; // Rotate over time
    mat3 rotX = mat3(1.0, 0.0, 0.0,
                     0.0, cos(angle), -sin(angle),
                     0.0, sin(angle), cos(angle));
    vec3 ro = uCameraPos; // Ray origin (camera position)
    vec3 rd = normalize(worldPos.xyz - uCameraPos); // Ray direction from camera to world position
    rd = (uWobbleMatrix * vec4(rd, 0.0)).xyz; // Apply wobble rotation


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
    vec3 lightPos = uLightPos;
    vec3 lightDir = normalize(lightPos - hitPoint);
    float shadow = shadowMarch(hitPoint, lightDir);

    vec3 normal = calcNormal(hitPoint);
    vec3 lightColor = vec3(1.0) * 0.1;
    float diffuse = max(dot(normal, lightDir), 0.0);
    //vec3 col = vec3(totalDist / MAX_DISTANCE) ;
    vec3 col = diffuse * lightColor * shadow;
    



    //gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(iResolution.x * vUv.x + iResolution.y * vUv.y), 1.0);
    gl_FragColor = vec4(col, 1.0);

}
`
