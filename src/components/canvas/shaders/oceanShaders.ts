const utils = `
#define PI 3.14159265359

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.001;
}

float phaseFunction(float cosTheta, float g) {
  // Henyey-Greenstein phase function with g=0.85
  return (1.0 - g * g) /
         (4.0 * PI * pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5));
}
float linearizeDepth(float depth, float near, float far) {
  float z = depth * 2.0 - 1.0; // back to NDC
  return (2.0 * near * far) / (far + near - z * (far - near));
}

vec2 raySphereIntersect(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter,
                        float sphereRadius) {
  float a = dot(rayDir, rayDir);
  vec3 oc = rayOrigin - sphereCenter;
  float b = 2.0 * dot(oc, rayDir);
  float c = dot(oc, oc) - sphereRadius * sphereRadius;
  float discriminant = b * b - 4.0 * a * c;

  if (discriminant < 0.0) {
    return vec2(-1.0);
  }
  float q = (b > 0.0) ? -0.5 * (b + sqrt(discriminant))
                      : -0.5 * (b - sqrt(discriminant));
  float t0 = q / a;
  float t1 = c / q;
  if (t0 > t1) {
    float temp = t0;
    t0 = t1;
    t1 = temp;
  }
  vec2 t = vec2(t0, t1);
  return t;
}

float smoothPump(float x, float shift) {
  return smoothstep(0.0, 1.0, x + shift) * smoothstep(1.0, 0.0, x + shift) *
         4.0;
}
`

export const oceanVertexShader = `
varying float vDisp;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vDispPosition;
varying vec3 vPosition;
varying vec4 vClipPos;

uniform sampler2D uDisplacementMap;
uniform float uDispScale;

float remap(float disp) { return log(disp + 1.0) / 2.0; }

void main() {

  float disp = texture2D(uDisplacementMap, uv).r;
  disp = disp - 0.5;
  vec3 dispPosition = position + normal * disp;

  // vec3 dispPosition = position ;

  vDisp = disp;
  vNormal = normal;
  vUv = uv;
  vDispPosition = (modelMatrix * vec4(dispPosition, 1.0)).xyz;
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vClipPos;
}
`

export const oceanFragmentShader = `
precision highp float;
${utils}

uniform sampler2D tDepth;
uniform sampler2D tDiffuse;
uniform sampler2D uTexture;
uniform sampler2D uNormalMapA;
uniform sampler2D uNormalMapB;
uniform vec3 uSigmaA;
uniform vec3 uLightColor;
uniform float uCameraNear;
uniform float uCameraFar;
uniform float uSphereRadius;
uniform vec3 uSphereCenter;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec2 iResolution;
uniform float uTime;

varying float vDisp;
varying vec2 vUv;
varying vec3 vDispPosition;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vClipPos;

void main() {

  // Perspective divide → NDC
  vec3 ndc = vClipPos.xyz / vClipPos.w;

  // Map from [-1,1] to [0,1] → screen UV
  vec2 screenUV = ndc.xy * 0.5 + 0.5;

  vec3 oceanColor = mix(vec3(0.0, 0.3, 0.5), background, smoothstep(0.0, 1.0, oceanDepth / 10.0));
  vec3 color = oceanColor;

  //========================================
  // lighting
  //========================================

  vec2 waveUvA = vUv + vec2(1.0, 1.0) * uTime * 0.5;
  vec2 waveUvB = vUv + vec2(1.0, 0.8) * uTime * 0.1;
  // waveUvA += vec2(1.0, 1.0) * vDisp * 0.1;
  // waveUvB -= vec2(1.0, 1.0) * vDisp * 0.1;
  vec3 waveNormalA = texture2D(uNormalMapA, waveUvA * 50.0).rgb;
  vec3 waveNormalB = texture2D(uNormalMapB, waveUvB * 20.0).rgb;

  vec3 waveNormal = normalize(waveNormalA + waveNormalB);
  waveNormal = normalize(vNormal + waveNormal);
  // waveNormal = vNormal;
  // gl_FragColor = vec4(vec3(vUv, 1.0), 1.0);
  // return;

  // specular highlight
  vec3 viewDir = normalize(uCameraPos - vPosition);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(waveNormal, halfDir), 0.0), 32.0);
  color += vec3(spec);

  // vec3 fragColor = 0.5 * vNormal + 0.5;
  gl_FragColor = vec4(color, 1.0);

}
`
