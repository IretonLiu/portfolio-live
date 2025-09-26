
varying float vDisp;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vDispPosition;
varying vec3 vPosition;
varying vec4 vClipPos;

uniform sampler2D uDisplacementMap;
uniform float uDispScale;

float remap(float disp) { return log(disp + 1.0) / 2.0; }

void main() {

  float disp = texture2D(uDisplacementMap, uv).r;
  disp = disp - 0.5;
  vec3 dispPosition = position + normal * disp * uDispScale;

  // vec3 dispPosition = position ;

  vDisp = disp;
  vNormal = normal;
  vUv = uv;
  vDispPosition = (modelMatrix * vec4(dispPosition, 1.0)).xyz;
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vClipPos;
}
