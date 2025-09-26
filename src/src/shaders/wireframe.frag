uniform sampler2D terrainTexture;
uniform float u_gamma; // gamma for remapping displacement
uniform vec3 lightPos; // Light position

varying vec3 vWorldPos; // pass the displaced position from vertex shader
varying vec3 vNormal;

varying vec2 vUv;

float remapDisplacement(float d, float gamma) {
  // gamma < 1.0 accentuates lows, damps highs
  return pow(d, gamma) * 0.5;
}

float remapDisplacement(float d) {
  // assumes d is in [0,1]
  return smoothstep(0.0, 0.7, d) * 0.7;
}

vec3 calcNormal(sampler2D dispMap, vec2 uv, float texelSize, float strength) {
  // Sample neighbors in texture space
  float hL = texture2D(dispMap, uv + vec2(-texelSize, 0.0)).r;
  float hR = texture2D(dispMap, uv + vec2(texelSize, 0.0)).r;
  float hD = texture2D(dispMap, uv + vec2(0.0, -texelSize)).r;
  float hU = texture2D(dispMap, uv + vec2(0.0, texelSize)).r;
  // Remap displacement values
  hL = remapDisplacement(hL, u_gamma);
  hR = remapDisplacement(hR, u_gamma);
  hD = remapDisplacement(hD, u_gamma);
  hU = remapDisplacement(hU, u_gamma);

  // Compute gradient
  float dU = (hR - hL);
  float dV = (hU - hD);

  // Construct tangent-space normal
  vec3 N = normalize(vec3(-dU * strength, -dV * strength, 1.0));

  return N;
}

vec3 shadePhong(vec3 normal,     // normalized surface normal
                vec3 lightDir,   // normalized surface-to-light direction
                vec3 viewDir,    // normalized surface-to-camera direction
                vec3 albedo,     // base color of globe
                vec3 lightColor, // light color/intensity
                float shininess  // specular exponent
) {
  // Diffuse term (Lambert)
  float diff = max(dot(normal, lightDir), 0.0);

  // Blinn-Phong specular term
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), shininess);

  // Final lighting
  vec3 color = albedo * diff * lightColor + spec * lightColor;
  return color;
}
struct DirectionalLight {
  vec3 position;   // light position in world space
  vec3 color;      // light color/intensity
  float intensity; // light intensity
};

uniform vec3 viewPos;
uniform vec3 lightColor;
uniform vec3 objectColor;
uniform float shininess;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(lightPos - vWorldPos);
  vec3 V = normalize(viewPos - vWorldPos);
  vec3 H = normalize(L + V);

  // Ambient
  vec3 ambient = 0.1 * lightColor;

  // Diffuse
  float diff = max(dot(N, L), 0.0);
  vec3 diffuse = diff * lightColor;

  // Specular
  float spec = pow(max(dot(N, H), 0.0), shininess);
  vec3 specular = spec * lightColor;

  vec3 color = (ambient + diffuse + specular) * objectColor;
  gl_FragColor = vec4(color, 1.0);
}
