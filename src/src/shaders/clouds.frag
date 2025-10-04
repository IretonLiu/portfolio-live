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

mat3 rotationY(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
}

vec3 cartesianToRadial(vec3 p, float R) {

  mat3 rot = rotationY(uTime * 10.0);
  p = rot * p;
  float r = length(p);
  vec3 d = normalize(p) * 0.9;
  vec3 offset = vec3(0.0);
  return d * (1.0 + (r - R) * 0.2) * 0.4;
  // small Cartesian contribution; // exaggerate the distanceh
}

float noiseToCloud(vec4 noise) {
  float lowFrequencyFBM = noise.g * .625 + noise.b * .125 + noise.a * .25;

  float baseCloud = remap(noise.r, -(1.0 - lowFrequencyFBM), 1., 0., 1.);
  return baseCloud;
}

float lightMarch(vec3 ro, vec3 rd, float radialMask) {
  int steps = 3;
  float distToEnd = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius).y;
  float stepSize = distToEnd / float(steps);
  vec3 sigma_t;
  float totalDensity = 0.0;
  for (int i = 0; i < steps; i++) {
    vec3 noisePos =
        cartesianToRadial(ro + rd * (float(i) * stepSize), uSphereRadius);
    vec4 noise = texture(uPrecomputedNoise, noisePos) * radialMask;
    float density = noiseToCloud(noise);
    totalDensity += max(density * stepSize, 0.0);
  }
  return 0.5 + 0.5 * exp(-totalDensity * 1.0);
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

  float thickness = 4.0;
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

  int steps = 20;
  float stepSize = marchDepth / float(steps);
  vec3 lightDir = uLightDir;
  vec3 transmittance = vec3(1.0);
  vec3 accumulation = vec3(0.0);
  float sigma_s = 0.8;
  vec3 omega_l = normalize(lightDir);
  vec3 omega_w = -normalize(rd);
  float cosTheta = dot(omega_l, omega_w);
  float densityThreshold = 0.80;

  // assume light comes from camera direction
  float distAlongRay = max(tOuter.x, 0.0);

  for (int i = 0; i < steps; i++) {
    distAlongRay += stepSize;

    vec3 pos = ro + (rd + rand(uv)) * (distAlongRay);
    float r = length(pos - uSphereCenter);
    float heightFraction = (r - (uSphereRadius - thickness)) / thickness;
    float radialMask = smoothPump(heightFraction, 0.0);

    vec3 randomOffset = vec3(texture(uPrecomputedNoise, vec3(uv, 0.5)).xyz);
    vec3 noisePos = cartesianToRadial(pos - uSphereCenter, uSphereRadius) +
                    0.01 * randomOffset;

    // modify density based on distance to the core of the sphere
    // float density = max(sampleDensity(noisePos / PI), 0.0) * radialMask;
    vec4 noise = texture(uPrecomputedNoise, noisePos);
    float density = noiseToCloud(noise) * radialMask;
    density = smoothstep(densityThreshold, 1.0, density);
    //  threshold to change coverage
    //  float density = noisePos * radialMask * 0.1;

    // Beer-Lambert law
    float lightTransmittance =
        lightMarch(pos + lightDir * 0.1, lightDir, radialMask);
    // float lightTransmittance = .9;
    float attenuation = exp(-density * stepSize * 4.0);
    accumulation += transmittance * lightTransmittance *
                    phaseFunction(cosTheta, 0.1) * stepSize * density * 75.0;
    transmittance *= attenuation;
    if (length(transmittance) < 0.001) {
      break;
    }
  }

  float T = clamp(transmittance.r, 0.0, 1.0);
  float alpha = 1.0 - T;
  vec3 cloudColor = accumulation * uLightColor;
  vec3 finalColor = cloudColor + T * original.rgb;
  // if the cloud is in front of the globe but behind the terrain, blend the
  // cloud with the terrain
  if (depth < tOuter.y) {
    // cloud is behind the globe
    gl_FragColor = vec4(finalColor, 1.0);
  } else {
    gl_FragColor = vec4(finalColor, alpha);
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
