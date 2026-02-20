export const vertexShader = /* glsl */ `
varying vec4 vClipPos;
varying vec2 vUv;
void main() {
  vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vUv = uv;
  gl_Position = vec4(position, 1.0); // Fullscreen quad in NDC
}
`

export const fragmentShader = /* glsl */ `
precision highp float;
//==================================================================
//Noise functions
//==================================================================
#define UI0 1597334673U
#define UI1 3812015801U
#define UI2 uvec2(UI0, UI1)
#define UI3 uvec3(UI0, UI1, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))

vec3 hash33(vec3 p) {
  uvec3 q = uvec3(ivec3(p)) * UI3;
  q = (q.x ^ q.y ^ q.z) * UI3;
  return -1. + 2. * vec3(q) * UIF;
}

float remap(float x, float a, float b, float c, float d) {
  return (((x - a) / (b - a)) * (d - c)) + c;
}

// Gradient noise by iq (modified to be tileable)
float gradientNoise(vec3 x, float freq) {
  // grid
  vec3 p = floor(x);
  vec3 w = fract(x);

  // quintic interpolant
  vec3 u = w * w * w * (w * (w * 6. - 15.) + 10.);

  // gradients
  vec3 ga = hash33(mod(p + vec3(0., 0., 0.), freq));
  vec3 gb = hash33(mod(p + vec3(1., 0., 0.), freq));
  vec3 gc = hash33(mod(p + vec3(0., 1., 0.), freq));
  vec3 gd = hash33(mod(p + vec3(1., 1., 0.), freq));
  vec3 ge = hash33(mod(p + vec3(0., 0., 1.), freq));
  vec3 gf = hash33(mod(p + vec3(1., 0., 1.), freq));
  vec3 gg = hash33(mod(p + vec3(0., 1., 1.), freq));
  vec3 gh = hash33(mod(p + vec3(1., 1., 1.), freq));

  // projections
  float va = dot(ga, w - vec3(0., 0., 0.));
  float vb = dot(gb, w - vec3(1., 0., 0.));
  float vc = dot(gc, w - vec3(0., 1., 0.));
  float vd = dot(gd, w - vec3(1., 1., 0.));
  float ve = dot(ge, w - vec3(0., 0., 1.));
  float vf = dot(gf, w - vec3(1., 0., 1.));
  float vg = dot(gg, w - vec3(0., 1., 1.));
  float vh = dot(gh, w - vec3(1., 1., 1.));

  // interpolation
  return va + u.x * (vb - va) + u.y * (vc - va) + u.z * (ve - va) +
         u.x * u.y * (va - vb - vc + vd) + u.y * u.z * (va - vc - ve + vg) +
         u.z * u.x * (va - vb - ve + vf) +
         u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
}

// Tileable 3D worley noise
float worleyNoise(vec3 uv, float freq) {
  vec3 id = floor(uv);
  vec3 p = fract(uv);

  float minDist = 10000.;
  for (float x = -1.; x <= 1.; ++x) {
    for (float y = -1.; y <= 1.; ++y) {
      for (float z = -1.; z <= 1.; ++z) {
        vec3 offset = vec3(x, y, z);
        vec3 h = hash33(mod(id + offset, vec3(freq))) * .5 + .5;
        h += offset;
        vec3 d = p - h;
        minDist = min(minDist, dot(d, d));
      }
    }
  }

  // inverted worley noise
  return 1. - minDist;
}

// Fbm for Perlin noise based on iq's blog
float perlinFbm(vec3 p, float freq, int octaves) {
  float G = exp2(-.85);
  float amp = 1.;
  float noise = 0.;
  for (int i = 0; i < octaves; ++i) {
    noise += amp * gradientNoise(p * freq, freq);
    freq *= 2.;
    amp *= G;
  }

  return noise;
}

// Tileable Worley fbm inspired by Andrew Schneider's Real-Time Volumetric
// Cloudscapes chapter in GPU Pro 7.
float worleyFbm(vec3 p, float freq) {
  return worleyNoise(p * freq, freq) * .625 +
         worleyNoise(p * freq * 2., freq * 2.) * .25 +
         worleyNoise(p * freq * 4., freq * 4.) * .125;
}

//===================================================================
//Utility functions
//===================================================================
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

//====================================================================
//Main shader
//====================================================================
varying vec4 vClipPos;
varying vec2 vUv;

uniform vec2 iResolution;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float uTime;
uniform float uMouseHit;
uniform vec3 uMousePoint;
uniform float uBlendRadius;
uniform float uSphereRadius;
uniform float uLithosphereRadius;
uniform float uCameraNear;
uniform float uCameraFar;
uniform vec3 uSphereCenter;
uniform vec3 uCameraPos;
uniform vec3 uLightPos;
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

  mat3 rot = rotationY(uTime);
  p = rot * p;
  float r = length(p);
  vec3 d = normalize(p) ;
  vec3 offset = vec3(0.0);
  return d * (1.0 + (r - R) * 0.18) * 0.4;
  // small Cartesian contribution; // exaggerate the distance
}

float noiseToCloud(vec4 noise) {
  float lowFrequencyFBM = noise.g * .625 + noise.b * .125 + noise.a * .25;

  float baseCloud = remap(noise.r, -(1.0 - lowFrequencyFBM), 1., 0., 1.);
  return baseCloud;
}

float lightMarch(vec3 ro, vec3 rd, float radialMask) {
  int steps = 4;
  float distToEnd = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius).y;
  float distToGlobe = raySphereIntersect(ro, rd, uSphereCenter, uLithosphereRadius).y;
  
  // analytical occlusion factor based on distance to the globe
  float occlusionFactor = 1.0;
      occlusionFactor =1.0;


  float stepSize = distToEnd / float(steps);
  vec3 sigma_t;
  float totalDensity = 0.0;
  float lightAbsorption = 0.0;
  for (int i = 0; i < steps; i++) {
    vec3 noisePos =
        cartesianToRadial(ro + rd * (float(i) * stepSize), uSphereRadius);

    vec4 noise = texture(uPrecomputedNoise, noisePos) * radialMask;
    float density = noiseToCloud(noise);
    totalDensity += max(density * stepSize * lightAbsorption, 0.0);
  }
  float sunIntensity = 1.0;

  return (exp(-totalDensity))*sunIntensity* occlusionFactor;
}

void main() {

    vec2 uv = vUv;
    vec2 ndc = uv * 2.0 - 1.0;
    vec4 clipPos = vec4(ndc, 0.0, 1.0);
    vec4 viewPos = uInverseProjectionMatrix * clipPos;
    viewPos /= viewPos.w;
    vec4 worldPos = uInverseViewMatrix * viewPos;



    float depth = texture2D(tDepth, uv).x;
    depth = linearizeDepth(depth, uCameraNear, uCameraFar);


    vec3 ro = uCameraPos;

    vec3 rd = normalize(worldPos.xyz - uCameraPos);

    float thickness = 4.0;
    vec2 tOuter = raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius);
    vec2 tInner =
      raySphereIntersect(ro, rd, uSphereCenter, uSphereRadius - thickness);

    vec4 original = texture2D(tDiffuse, uv);

    vec3 color;

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


    float marchDepth = 5.0;
    if (depth < tOuter.y) {
        marchDepth = depth - max(tOuter.x, 0.0);
    }

    int steps = 30;
    float stepSize = marchDepth / float(steps);
    vec3 lightPos = (vec4(uLightPos, 1.0) * viewMatrix).xyz;
    vec3 lightDir = lightPos - worldPos.xyz;
    vec3 transmittance = vec3(1.0);
    vec3 accumulation = vec3(0.0);
    vec3 omega_l = -normalize(lightDir);
    vec3 omega_w = -normalize(rd);
    float cosTheta = dot(omega_l, omega_w);
    float densityThreshold = 0.80;

    // assume light comes from camera direction
    float distAlongRay = max(tOuter.x, 0.0);
    float densityMultiplier = 1.0;
    if (uMouseHit > 0.5) {
        vec3 posiiton = ro + rd * depth;
        float dist = length(posiiton - uMousePoint);
        float radius = uBlendRadius; // Adjust the radius of the effect
        float edgeSoftness = 1.0; // Adjust how soft the edge of the effect is
        float mask = smoothstep(radius , radius - edgeSoftness, dist);
        densityMultiplier = mix(1.0, 0.0, mask);
    } 
    for (int i = 0; i < steps; i++) {

        vec3 pos = ro + (rd + rand(uv)) * (distAlongRay);
        float r = length(pos - uSphereCenter);
        float heightFraction = (r - (uSphereRadius - thickness)) / thickness;
        float radialMask = smoothPump(heightFraction, 0.0);

        vec3 randomOffset = vec3(texture(uPrecomputedNoise, vec3(uv, 0.5)).xyz);
        vec3 noisePos = cartesianToRadial(pos - uSphereCenter, uSphereRadius)+ 0.01 * randomOffset;

        // modify density based on distance to the core of the sphere
        // float density = max(sampleDensity(noisePos / PI), 0.0) * radialMask;
        vec4 noise = texture(uPrecomputedNoise, noisePos);
        float density = noiseToCloud(noise) * densityMultiplier * radialMask;
        density = smoothstep(densityThreshold, 1.0, density);
        // Beer-Lambert law
        float attenuation = exp(-density * stepSize*10.0);

        float lightTransmittance =
            lightMarch(pos, lightDir, radialMask)+0.01;
        vec3 sunColor = uLightColor * lightTransmittance * 5.0;
        vec3 finalLightColor = sunColor;



        float forward = phaseFunction(cosTheta, .8);
        float backward = phaseFunction(cosTheta, -0.3);
        float phase = 0.7*forward + 0.3*backward;

        accumulation += transmittance * finalLightColor * phase* stepSize * density * 75.0; 
        transmittance *= attenuation;
        if (length(transmittance) < 0.01) {
            break;
        }
        distAlongRay += stepSize;
    }

    float T = clamp(transmittance.r, 0.0, 1.0);

    float alpha = 1.0 - T;
    vec3 cloudColor = accumulation;

    vec3 finalColor;



    float occlusion = lightMarch(worldPos.xyz, lightDir, 1.0);


    finalColor = cloudColor + T * original.rgb * occlusion;
    // if the cloud is in front of the globe but behind the terrain, blend the
    // cloud with the terrain
    if (depth < tOuter.y) {
    // cloud is behind the globe
        gl_FragColor = vec4(finalColor, 1.0);
    } else {
        gl_FragColor = vec4(finalColor, alpha);
    }

}
`

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
