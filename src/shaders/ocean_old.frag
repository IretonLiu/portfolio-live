precision highp float;

uniform sampler2D tDepth;
uniform sampler2D tDiffuse;
uniform vec3 uOceanColor;
uniform float uOceanRadius;
uniform vec3 uCameraPos;
uniform vec2 iResolution;
uniform mat4 invViewMatrix;
uniform mat4 invProjectionMatrix;
uniform float cameraNear;
uniform float cameraFar;
varying vec2 vUv;

float raySphereIntersect(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter,
                         float sphereRadius, bool far) {
  float a = dot(rayDir, rayDir);
  vec3 oc = rayOrigin - sphereCenter;
  float b = 2.0 * dot(oc, rayDir);
  float c = dot(oc, oc) - sphereRadius * sphereRadius;
  float discriminant = b * b - 4.0 * a * c;

  if (discriminant < 0.0) {
    return -1.0;
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
  if (far) {
    if (t1 < 0.0)
      return -1.0;
    return t1;
  } else {
    if (t0 < 0.0)
      return -1.0;
    return t0;
  }
}

void main() {
  // this is the pipeline
  // object space → model → world → view → clip → NDC → screen
  // get NDC from frag coord
  // vec2 ndc = (gl_FragCoord.xy / iResolution) * 2.0 - 1.0;
  // vec4 clipPos = vec4(ndc, -1.0, 1.0);
  //// divide by w to get view space
  // vec4 viewPos = invProjectionMatrix * clipPos;
  // viewPos /= viewPos.w;
  // vec4 worldPos = invViewMatrix * viewPos;

  // gl_FragColor = vec4(worldPos.xyz, 1.0);

  vec2 ndc = (gl_FragCoord.xy / iResolution) * 2.0 - 1.0;
  // from NDC to clip space
  // we set z to -1 (near plane) and w to 1
  vec4 clip = vec4(ndc, -1.0, 1.0);
  vec4 eye = invProjectionMatrix * clip;
  eye = eye / eye.w;
  // the ray has to point to where the "pixel" is looking in world space
  vec3 screenPos = (invViewMatrix * eye).xyz;

  vec3 rayOrigin = uCameraPos;
  vec3 rayDir = normalize(screenPos - rayOrigin);
  // intersect with sphere at origin
  vec3 sphereCenter = vec3(0.0);
  float tNear = raySphereIntersect(rayOrigin, rayDir, sphereCenter, 3.0, false);
  float tFar = raySphereIntersect(rayOrigin, rayDir, sphereCenter, 3.0, true);
  // float depth = length(rayDir * t);
  float sceneDepth = texture2D(tDepth, vUv).x;
  sceneDepth = sceneDepth * 2.0 - 1.0; // NDC z in [-1,1]
  sceneDepth = (2.0 * cameraNear * cameraFar) /
               (cameraFar + cameraNear - sceneDepth * (cameraFar - cameraNear));

  float density = 2.0;
  float step = 0.01;
  float end = tFar < sceneDepth ? tFar : sceneDepth;

  if (tNear < 0.0) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    return;
  }

  float transmittance = 1.0;
  float accumulation = 0.0;
  for (float t = tNear; t < end; t += step) {
    float attenuation = exp(-density * step * 2.0);
    accumulation += transmittance * (1.0 - attenuation);
    transmittance *= attenuation;
    if (transmittance < 0.01) {
      break;
    }
  }
  vec3 oceanColor = accumulation * uOceanColor;
  vec3 background = texture2D(tDiffuse, vUv).rgb;
  vec3 color = oceanColor + transmittance * background;
  gl_FragColor = vec4(color, 1.0);

  // if (depth < sceneDepth && t > 0.0) {
  //   gl_FragColor = vec4(uOceanColor, 1.0);
  // } else {
  //   gl_FragColor = texture2D(tDiffuse, vUv);
  // }
}
