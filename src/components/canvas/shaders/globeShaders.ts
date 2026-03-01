export const globeVertexShader = `
#include <common>
#include <shadowmap_pars_vertex>

flat varying vec3 vNormal;
attribute vec4 tangent;
varying vec3 vTangent;
varying vec3 vBitangent;
varying vec3 vPosition;
varying vec2 vUv;
varying mat3 vTBN;
varying float vDisp;
varying vec4 vShadowCoord;

uniform sampler2D uDisplacementMap;
float remap(float x) { return log(x + 1.0); }

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
  vDisp = disp;
  vNormal = normalize( normal);
  vTangent = normalize( tangent.xyz);
  vBitangent = normalize( bitangent);
   vTBN = mat3(vTangent,  vBitangent, vNormal);

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


flat varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;
varying float vDisp;
varying vec3 vPosition;
varying mat3 vTBN;
varying vec2 vUv;
varying vec4 vShadowCoord;

uniform float uTime;
uniform vec2 iResolution;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
uniform vec3 uMousePoint;
uniform float uMouseHit;
uniform float uBlendRadius;
uniform sampler2D uTexture;
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

float gaussian1D(float x, float center, float sigma) {
    float diff = x - center;
    float exponent = -(diff * diff) / (2.0 * sigma * sigma);
    return exp(exponent);
}

float raySphereIntersect(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float sphereRadius) {
    vec3 oc = rayOrigin - sphereCenter;
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(oc, rayDir);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        return -1.0; // No intersection
    } else {
        return (-b - sqrt(discriminant)) / (2.0 * a); // Return nearest intersection
    }
}

void main() {



    vec3 V = normalize(uCameraPos - vPosition);
    // update light position using the viewMatrix
    vec3 lightPos = (vec4(uLightPos, 1.0) * viewMatrix).xyz;

    vec3 L = normalize(lightPos - vPosition);


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
        earthColor = PBRLighting(waveNormal, V, L, earthAlbedo, oceanMaterial, lightParams)* depth;

    }else{
        earthColor = PBRLighting(displacedNormal, V, L, earthAlbedo, materialParams, lightParams);
    }
    whiteColor = PBRLighting(displacedNormal, V, L, whiteAlbedo, materialParams, lightParams);

    float shadowPower = getShadowMask();
    earthColor *= shadowPower;
    whiteColor *= shadowPower;

    vec3 color = whiteColor;

    earthColor += earthAlbedo * vec3(0.8); // ambient term
    color += whiteAlbedo * vec3(0.8); // ambient term

    if (uMouseHit > 0.5) {
        vec3 warpedPosition = vec3(vPosition.x, vPosition.y, vPosition.z + sin(uTime * 80.0) * 0.5); // Add a pulsating effect
        float dist = length(warpedPosition - uMousePoint);
        float radius = uBlendRadius; // Adjust the radius of the effect
        float edgeSoftness = 1.0; // Adjust how soft the edge of the effect is
        float mask = smoothstep(radius + edgeSoftness, radius - edgeSoftness, dist);
        color = mix(color, earthColor, mask);
    }
    vec3 baseColor = vec3(0.1, 0.6, 0.9); // The sphere's color

    gl_FragColor = vec4(color, 1.0);

}
`
