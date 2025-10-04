attribute vec3 barycentric;
flat varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vBarycentric;
varying float vDisp;
uniform sampler2D uDisplacementMap;
uniform float dispScale;

float remap(float x) { return log(x + 1.0); }
void main() {

  float disp = texture2D(uDisplacementMap, uv).r;
  disp = disp - 0.6109;
  vec3 dispPosition = position + normal * disp * dispScale;

  // vec3 dispPosition = position ;
  vDisp = disp;
  vNormal = normalMatrix * normal;
  vUv = uv;
  vPosition = (modelMatrix * vec4(dispPosition, 1.0)).xyz;
  vBarycentric = barycentric;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(dispPosition, 1.0);
}
