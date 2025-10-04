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

float saturate(float x) { return clamp(x, 0.0, 1.0); }

float smoothPump(float x, float shift) {
  return smoothstep(0.0, 1.0, x + shift) * smoothstep(1.0, 0.0, x + shift) *
         4.0;
}
