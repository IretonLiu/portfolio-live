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

float sampleDensity(vec3 p) {
  float freq = 4.0;
  float pfbm = mix(1., perlinFbm(p, 4., 7), .5);
  pfbm = abs(pfbm * 2. - 1.); // billowy perlin noise
  float worleyFBM_g = worleyFbm(p, freq);
  float worleyFBM_b = worleyFbm(p, freq * 2.0);
  float worleyFBM_a = worleyFbm(p, freq * 4.0);
  float perlinWorley = remap(pfbm, 0., 1., worleyFBM_g, 1.); // perlin-worley

  float lowFrequencyFMB =
      worleyFBM_g * .625 + worleyFBM_b * .25 + worleyFBM_a * .125;

  float baseCloud = remap(perlinWorley, (1.0 - lowFrequencyFMB), 1., 0., 1.);
  return baseCloud;
}

float lightMarch(vec3 ro, vec3 rd, vec3 start) {
  int steps = 4;
  float distToEnd = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius).y;
  float stepSize = distToEnd / float(steps);
  vec3 sigma_t;
  float totalDensity = 0.0;
  for (int i = 0; i < steps; i++) {
    vec3 pos = ro + rd * (float(i) * stepSize);
    float density = sampleDensity(pos);
    density = density * remap(density, .6, 1., 0., 1.); // fake cloud coverage
    totalDensity += max(density * stepSize, 0.0);
  }
  return exp(-totalDensity * 10.0);
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

  float thickness = 0.5;
  vec2 tOuter = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius);
  vec2 tInner =
      raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius - thickness);
  // cases: tFar == -1 (no intersection), tNear == -1 (inside sphere), tNear
  // >= 0 (outside sphere) if no intersection or the intersection is behind
  // the near plane, render the original scene
  vec4 original = texture2D(tDiffuse, uv);
  vec3 color;
  // gl_FragColor = vec4(vec3(sampleDensity(vec3(uv, uTime))), 1.0);
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

  vec3 p = ro + rd * tOuter.x;
  // float density = sampleDensity(pos);

  float marchDepth;
  if (tInner.x < 0.0) {
    marchDepth = tOuter.y - tOuter.x;
  } else {
    marchDepth = tInner.x - tOuter.x;
  }
  int steps = 4;
  float stepSize = marchDepth / float(steps);
  vec3 lightDir = uLightDir;
  vec3 transmittance = vec3(1.0);
  vec3 accumulation = vec3(0.0);
  float sigma_s = 0.1;
  vec3 omega_l = normalize(-lightDir);
  vec3 omega_w = -rd;
  float cosTheta = dot(omega_l, omega_w);

  // gl_FragColor = vec4(vec3(marchDepth), 1.0);
  // return;
  // float coverage = perlinFbm(pos + vec3(uTime), 2., 7);
  // coverage = remap(coverage, 0.1, 1.0, 0.0, 1.0);
  // density = sampleDensity(pos + vec3(uTime));
  // density = remap(density, coverage, 1.0, 0.0, 1.0);
  // density *= coverage;
  // gl_FragColor = vec4(vec3(density), density);
  // return;
  for (int i = 0; i < steps; i++) {
    vec3 pos = ro + rd * (tOuter.x + float(i) * stepSize);
    float distToCore = length(pos - uSphereCenter);
    // modify density based on distance to the core of the sphere
    float heightFactor =
        remap(distToCore, uSphereRadius - thickness, uSphereRadius, 1.0, 0.0);
    heightFactor *=
        smoothstep(0.0, 1.0, remap(pos.y, -thickness, thickness, 0.0, 1.0));

    float density = sampleDensity(pos) * 10.0;
    float coverage = perlinFbm(vec3(p) + vec3(5.0), 2., 7);
    coverage = remap(coverage, 0.1, 1.0, 0.0, 1.0);
    density = density * remap(density, coverage, 1.0, 0.0, 1.0);
    density *= coverage;
    density *= heightFactor;
    density = max(density, 0.0);

    // Beer-Lambert law
    // float lightTransmittance = lightMarch(pos + lightDir * 0.1, lightDir,
    // pos);
    float attenuation = exp(-density * stepSize);
    accumulation +=
        transmittance * sigma_s * phaseFunction(cosTheta, 0.8) * stepSize;
    transmittance *= attenuation;
    if (length(transmittance) < 0.001) {
      break;
    }
  }

  vec3 cloudColor = accumulation * uLightColor * 100.0;
  vec3 backgroundColor;
  float alpha;
  if (depth < tOuter.y) {
    backgroundColor = original.rgb * transmittance;
    alpha = 1.0;
    // gl_FragColor = vec4(cloudColor + backgroundColor, alpha);
  } else {
    backgroundColor = transmittance;
    alpha = 1.0 - transmittance.r;
    gl_FragColor = vec4(cloudColor, alpha);
  }

  // density = perlinFbm(pos, 2., 7);
  // density = remap(density, 0.1, 1.0, 0.0, 1.0);
  // gl_FragColor = vec4(vec3(density), density);
  // return;
  // high transmittance -> low alpha

  // color = vec4(vec3(coverage), 1.0);
  // gl_FragColor = color;
}
