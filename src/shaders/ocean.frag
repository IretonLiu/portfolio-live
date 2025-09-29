precision highp float;
#include <utils>

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

  float oceanDepth = linearizeDepth(gl_FragCoord.z, uCameraNear, uCameraFar);
  float terrainDepth =
      linearizeDepth(texture2D(tDepth, screenUV).x, uCameraNear, uCameraFar);
  // if terrain is closer than ocean, discar
  vec3 background = texture2D(tDiffuse, screenUV).rgb;

  // don't render ocean where there is land

  // this is the background color for the ocean

  vec3 ro = uCameraPos;
  vec3 rd = normalize(vPosition - uCameraPos);

  vec2 t = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius);
  float tNear = t.x;
  float tFar = t.y;
  if (tFar < 0.0) {
    discard;
    return;
  }
  float end = tFar < terrainDepth ? tFar : terrainDepth;

  // if (tFar < terrainDepth) {
  //   gl_FragColor = vec4(vec3(1.0, 0.0, 0.0), 1.0);
  //   return;
  // } else {
  //   gl_FragColor = vec4(vec3(0.0, 0.0, 1.0), 1.0);
  //   return;
  // }
  // ==============================================================
  // Volume rendering via ray marching
  // ==============================================================
  int steps = 1;
  float stepSize = max((end - tNear), 0.1) / float(steps);

  float g = 0.8; // anisotropy factor
  vec3 transmittance = vec3(1.0);
  vec3 accumulation = vec3(0.0);
  vec3 lightDir = uLightDir;
  vec3 sigma_a = uSigmaA;
  vec3 sigma_s = vec3(0.8);
  vec3 sigma_s_prime = sigma_s * (1.0 - g); // * 0.9;
  vec3 sigma_tr = sqrt(3.0 * sigma_a * (sigma_a + sigma_s_prime));
  vec3 sigma_t = sigma_a + sigma_s;

  vec3 omega_l = normalize(-lightDir);
  vec3 omega_w = -rd;
  float cosTheta = dot(omega_l, omega_w);

  float z = 0.5;

  vec3 pos = ro + rd * (tNear + stepSize);
  // Beer-Lambert law
  vec3 attenuation = exp(-sigma_t * stepSize * 2.0);
  vec3 inscatter =
      transmittance * sigma_s * phaseFunction(cosTheta, g) * stepSize;
  // vec3 sss = 0.7 * inscatter * exp(-sigma_tr * z);
  accumulation += inscatter;
  transmittance *= attenuation;
  // if (length(transmittance) < 0.001) {
  //   break;
  // }

  vec3 oceanColor = accumulation * uLightColor;
  if (background == vec3(0.0)) {
    background = vec3(1.0);
  }
  // blend shore color if depth is shallow

  oceanColor =
      mix(vec3(0.0, 0.3, 0.5), oceanColor, smoothstep(0.0, 1.0, oceanDepth));
  vec3 color = accumulation + transmittance * background;
  // vec3 color = background;

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

  // if (depth < sceneDepth && t > 0.0) {
  //   gl_FragColor = vec4(uOceanColor, 1.0);
  // } else {
  //   gl_FragColor = texture2D(tDiffuse, vUv);
  // }
}
