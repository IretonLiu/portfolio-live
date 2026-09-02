export const globeVertexShader = `
#include <common>
#include <shadowmap_pars_vertex>

attribute vec4 tangent;
varying vec3 vPosition;
varying vec2 vUv;
varying mat3 vTBN;

uniform sampler2D uDisplacementMap;

void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
  vec3 bitangent = normalize(cross(normal, tangent.xyz) * tangent.w);

  // don't worry about the magic numbers :)
  float disp = texture2D(uDisplacementMap, uv).r- 60.0/255.0;

  // to address uv singularity at the poles
  if (uv.y > 0.98) { 
      disp = 0.0;
  }

  vec3 dispPosition = position + normal * disp*0.4;
  vTBN = mat3(normalize(tangent.xyz), normalize(bitangent), normalize(normal));

  vUv = uv;
  vPosition = (modelMatrix * vec4(dispPosition, 1.0)).xyz;
    #include <begin_vertex>
    #include <project_vertex>
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
  gl_Position = projectionMatrix * modelViewMatrix * vec4(dispPosition, 1.0);
}
`

export const globeFragmentShader = `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
precision highp float;


varying vec3 vPosition;
varying mat3 vTBN;
varying vec2 vUv;

uniform float uTime;
uniform float uDayNightTime;
uniform float uLocalHour;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uMousePoint;
uniform float uMouseHit;
uniform float uBlendRadius;
uniform sampler2D uTexture;
uniform sampler2D uNightLights;
uniform sampler2D uNormalMapA;
uniform sampler2D uNormalMapB;
uniform sampler2D uDisplacementMap;

struct LightParameters {
  vec3 color;
  float intensity;
};

struct MaterialParameters {
  vec3 emissive;
  float metallic;
  float roughness;
  vec3 F0; // base reflectivity at normal incidence
};

uniform MaterialParameters materialParams;
uniform LightParameters lightParams;

// the GGX / Trowbridge-Reitz normal distribution function
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;

  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return a2 / denom;
}

float distributionSchlickBeckmann(vec3 N, vec3 V, float roughness) {
  float a = roughness * roughness;
  float k = a / 2.0; // unreal used to use (r+1)^2/8
  float NdotV = max(dot(N, V), 0.0);

  float denom = NdotV * (1.0 - k) + k;
  return NdotV / denom;
}

float geometrySchlickGGX(vec3 N, vec3 L, vec3 V, float roughness) {

  float g1 = distributionSchlickBeckmann(N, L, roughness);
  float g2 = distributionSchlickBeckmann(N, V, roughness);
  return g1 * g2;
}

vec3 fresnelSchlick(vec3 V, vec3 H, vec3 F0) {
  float cosTheta = max(dot(V, H), 0.0);
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

vec3 PBRLighting(vec3 N, vec3 V, vec3 L, vec3 albedo,
                 MaterialParameters material, LightParameters lightParams) {
  // =========================================================
  // cook-Torrance lighting model
  // =========================================================

  // final color = (diffuse + specular) * lightColor * lightIntensity
  // kd+ks = 1
  // diffuse component: kd * (1/π)
  // specular component: ks * D * F * G / (4 * (N·L) * (N·V))

  vec3 H = normalize(V + L);

  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0);

  vec3 ks = fresnelSchlick(V, H, material.F0);
  vec3 kd = (vec3(1.0) - ks) * (1.0 - material.metallic);

  vec3 diffuse = kd * albedo / PI;

  float D = distributionGGX(N, H, material.roughness);
  float G = geometrySchlickGGX(N, L, V, material.roughness);
  vec3 F = fresnelSchlick(V, H, material.F0);

  vec3 specular = (D * F * G) / (4.0 * NdotL * NdotV + 0.001);
  vec3 brdf = diffuse + specular;
  vec3 color = material.emissive +
               brdf * lightParams.color * lightParams.intensity * NdotL;
  return color;
}


vec3 getNormalFromMap(sampler2D uDisplacementMap, vec2 uv, float normalStrength, vec2 texSize) {
    vec2 pixelSize = 1.0 / texSize; 
    
    float hL = texture(uDisplacementMap, uv + vec2(-pixelSize.x, 0.0)).r;
    float hR = texture(uDisplacementMap, uv + vec2( pixelSize.x, 0.0)).r;
    float hT = texture(uDisplacementMap, uv + vec2(0.0, -pixelSize.y)).r; // Assuming OpenGL Y-up texture coords
    float hB = texture(uDisplacementMap, uv + vec2(0.0,  pixelSize.y)).r;

    vec3 tangentX = vec3(2.0, 0.0, (hR - hL) * normalStrength);
    vec3 tangentY = vec3(0.0, 2.0, (hB - hT) * normalStrength);
    
    vec3 normal = normalize(cross(tangentX, tangentY));

    return normal;
}

void main() {



    vec3 V = normalize(uCameraPos - vPosition);
    // update light position using the viewMatrix
    vec3 lightPos = (vec4(uLightPos, 1.0) * viewMatrix).xyz;

    vec3 L = normalize(lightPos - vPosition);

    // Local-time lighting scalar. This is an immediate day/night shift, not a
    // gradual blend and not a surface-normal terminator effect.
    float isNight = (uLocalHour >= 18.0 || uLocalHour < 7.0) ? 1.0 : 0.0;
    float directLightFactor = isNight > 0.5 ? 0.16 : 1.35;
    float ambientLightFactor = isNight > 0.5 ? 0.55 : 1.0;
    LightParameters timeOfDayLightParams = LightParameters(
      lightParams.color,
      lightParams.intensity * directLightFactor
    );


    float depth = texture2D(uDisplacementMap, vUv).r;
    vec3 displacedNormal = getNormalFromMap(uDisplacementMap, vUv, 50.0, vec2(2048.0)); 
    displacedNormal = normalize(vTBN * displacedNormal);



    vec3 earthAlbedo = texture2D(uTexture, vUv).rgb;
    vec3 whiteAlbedo = vec3(1.0);

    vec3 earthColor;
    vec3 whiteColor;
    vec3 oceanBlue = vec3(0.0, 0.4, 0.7) * 1.5; // Ocean color
    float threshold = 0.65; // Adjust this threshold as needed
    float colourDistance = length(earthAlbedo - oceanBlue);
    if (colourDistance < threshold) {
        vec3 normalA = texture2D(uNormalMapA, vUv * 20.0 + uTime).rgb * 2.0 - 1.0;
        vec3 normalB = texture2D(uNormalMapB, vUv * 20.0+ uTime).rgb * 2.0 - 1.0;
        vec3 blendedNormal = mix(normalA, normalB, 0.5);
        vec3 waveNormal = normalize(vTBN * blendedNormal);
        MaterialParameters oceanMaterial = MaterialParameters(vec3(0.0), 0.0, 0.1, vec3(0.04)); // non-metallic, low roughness
        earthColor = PBRLighting(waveNormal, V, L, earthAlbedo, oceanMaterial, timeOfDayLightParams)* depth;

    }else{
        earthColor = PBRLighting(displacedNormal, V, L, earthAlbedo, materialParams, timeOfDayLightParams);
    }
    whiteColor = PBRLighting(displacedNormal, V, L, whiteAlbedo, materialParams, timeOfDayLightParams);

    float shadowPower = getShadowMask();
    earthColor *= shadowPower;
    whiteColor *= shadowPower;

    vec3 color = whiteColor;

    // Day/night and real Black Marble city lights are applied only to the
    // colour earth reveal, never to the pale white base globe.
    float nightMask = isNight;

    earthColor += earthAlbedo * vec3(0.8) * ambientLightFactor; // ambient/daylight term
    vec3 nightColor = earthColor * vec3(0.35, 0.42, 0.68) + earthAlbedo * vec3(0.10, 0.13, 0.20);
    if (isNight > 0.5) {
        earthColor = nightColor;
    }

    // Delay Black Marble sampling/visibility so the colour reveal starts as the
    // normal daytime globe before cities fade in later.
    float cityLightIntro = isNight;
    if (cityLightIntro > 0.001 && nightMask > 0.001) {
        float cityLights = texture2D(uNightLights, vUv).r;
        cityLights = smoothstep(0.02, 0.82, pow(cityLights, 0.95));
        float cityLightAmount = clamp(cityLights * nightMask * cityLightIntro * 2.8, 0.0, 1.0);
        vec3 cityLightColor = vec3(1.0, 0.62, 0.28) * cityLightAmount;
        earthColor = clamp(earthColor + cityLightColor, 0.0, 1.0);
    }
    color += whiteAlbedo * vec3(0.8) * ambientLightFactor; // ambient/daylight term

    if (uMouseHit > 0.5) {
        vec3 warpedPosition = vec3(vPosition.x, vPosition.y, vPosition.z + sin(uTime * 80.0) * 0.5); // Add a pulsating effect
        float dist = length(warpedPosition - uMousePoint);
        float radius = uBlendRadius; // Adjust the radius of the effect
        float edgeSoftness = 1.0; // Adjust how soft the edge of the effect is
        float mask = smoothstep(radius + edgeSoftness, radius - edgeSoftness, dist);
        color = mix(color, earthColor, mask);
    }
    gl_FragColor = vec4(color, 1.0);

}
`
