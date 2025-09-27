#include <noise>
#include <utils>
precision highp float;

varying vec4 vClipPos;

uniform vec2 iResolution;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float uTime;
uniform float uSphereRadius;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uSphereCenter;
uniform vec3 uCameraPos;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform mat4 uInverseProjectionMatrix;
uniform mat4 uInverseViewMatrix;
uniform sampler3D uPrecomputedNoise;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453) * 0.001;
}

float noiseToCloud(vec4 noise) {
  float lowFrequencyFBM = noise.g * .625 + noise.b * .125 + noise.a * .25;

  float baseCloud = remap(noise.r, -(1.0 - lowFrequencyFBM), 1., 0., 1.);
  return baseCloud;
}
float lightMarch(vec3 ro, vec3 rd) {
  int steps = 4;
  float distToEnd = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius).y;
  float stepSize = distToEnd / float(steps);
  vec3 sigma_t;
  float totalDensity = 0.0;
  for (int i = 0; i < steps; i++) {
    vec3 noisePos =
        cartesianToRadial(ro + rd * (float(i) * stepSize), uSphereRadius);
    vec4 noise = texture(uPrecomputedNoise, noisePos * 0.1);
    float density = noiseToCloud(noise);
    totalDensity += max(density * stepSize, 0.0);
  }
  return exp(-totalDensity);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec4 ndc = vClipPos / vClipPos.w;
  vec4 viewPos = uInverseProjectionMatrix * ndc;
  vec4 worldPos = uInverseViewMatrix * viewPos;

  float depth = texture2D(tDepth, uv).x;

  // linearize depth
  depth = linearizeDepth(depth, uCameraNear, uCameraFar);

  vec3 ro = uCameraPos;
  vec3 rd = normalize(worldPos.xyz / worldPos.w - uCameraPos);

  float thickness = 1.0;
  vec2 tOuter = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius);
  vec2 tInner =
      raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius - thickness);
  // cases: tFar == -1 (no intersection), tNear == -1 (inside sphere), tNear
  // >= 0 (outside sphere) if no intersection or the intersection is behind
  // the near plane, render the original scene
  vec4 original = texture2D(tDiffuse, uv);
  vec3 color;
  // density = remap(density, 0.8, 1.0, 0.0, 1.0)
  // gl_FragColor = vec4(vec3(density), 1.0);

  // return;

  // cloud is behind us
  if (tOuter.y < 0.0) {
    gl_FragColor = original;
    return;
  }

  // globe is between us and the cloud
  if (tOuter.y > depth && tOuter.x < -1.0) {
    gl_FragColor = original;
    return;
  }

  // float density = sampleDensity(pos);

  float marchDepth = tOuter.y - max(tOuter.x, 0.0);
  if (depth < tOuter.y) {
    marchDepth = depth - max(tOuter.x, 0.0);
  }

  int steps = 24;
  float stepSize = marchDepth / float(steps);
  vec3 lightDir = uLightDir;
  vec3 transmittance = vec3(1.0);
  vec3 accumulation = vec3(0.0);
  float sigma_s = 0.8;
  vec3 omega_l = normalize(-lightDir);
  vec3 omega_w = -rd;
  float cosTheta = dot(omega_l, omega_w);
  float densityThreshold = 0.8;
  // assume light comse from camera direction

  // gl_FragColor = vec4(vec3(marchDepth), 1.0);
  // return;
  // float coverage = perlinFbm(pos + vec3(uTime), 2., 7);
  // coverage = remap(coverage, 0.1, 1.0, 0.0, 1.0);
  // density = sampleDensity(pos + vec3(uTime));
  // density = remap(density, coverage, 1.0, 0.0, 1.0);
  // density *= coverage;
  // gl_FragColor = vec4(vec3(density), density);
  // return;
  float distAlongRay = max(tOuter.x, 0.0);
  for (int i = 0; i < steps; i++) {
    distAlongRay += stepSize;

    vec3 pos = ro + (rd + rand(uv)) * (distAlongRay);
    float r = length(pos - uSphereCenter);
    float heightFraction = (r - (uSphereRadius - thickness)) / thickness;
    float radialMask = smoothPump(heightFraction, 0.2);

    // vec3 polar = cartesianToSpherical(pos - uSphereCenter);
    vec3 randomOffset = vec3(texture(uPrecomputedNoise, vec3(uv, 0.5)).xyz);
    vec3 noisePos = cartesianToRadial(pos - uSphereCenter, uSphereRadius) +
                    0.01 * randomOffset;

    // modify density based on distance to the core of the sphere
    // float density = max(sampleDensity(noisePos / PI), 0.0) * radialMask;
    vec4 noise = texture(uPrecomputedNoise, noisePos);
    float density = noiseToCloud(noise) * radialMask;
    // threshold to change coverage
    density = max(density - densityThreshold, 0.0) / (1.0 - densityThreshold);
    // float density = noisePos * radialMask * 0.1;

    // Beer-Lambert law
    float lightTransmittance = lightMarch(pos + lightDir * 0.1, lightDir);
    // float lightTransmittance = .9;
    float attenuation = exp(-density * stepSize * 4.0);
    accumulation += transmittance * lightTransmittance *
                    phaseFunction(cosTheta, 0.0) * stepSize * density * 100.0;
    transmittance *= attenuation;
    if (length(transmittance) < 0.001) {
      break;
    }
  }

  vec3 cloudColor = vec3(1.0) * accumulation * uLightColor;
  if (depth < tOuter.y) {
    // cloud is behind the globe
    gl_FragColor = vec4(transmittance.r * original.rgb + cloudColor, 1.0);
    return;
  }
  if (depth > 10.0) {
    // background blend the clouds with the original scene
    gl_FragColor =
        vec4(mix(original.rgb, cloudColor, accumulation), original.a);
  }

  return;
}
// cloud is behind the globe
// gl_FragColor = vec4(cloudColor, 1.0 - transmittance.r);
//  gl_FragColor = vec4(cloudColor, 1.0 - transmittance.r);
// return;

// density = perlinFbm(pos, 2., 7);
// density = remap(density, 0.1, 1.0, 0.0, 1.0);
// gl_FragColor = vec4(vec3(density), density);
// return;
// high transmittance -> low alpha

// color = vec4(vec3(coverage), 1.0);
// gl_FragColor = color;
