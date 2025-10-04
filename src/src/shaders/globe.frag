precision highp float;

flat varying vec3 vNormal;
varying float vDisp;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vBarycentric;

uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform sampler2D uTexture;
uniform sampler2D uDisplacementMap;

void main() {

  float h = texture2D(uDisplacementMap, vUv).r;
  float hx = texture2D(uDisplacementMap, vUv + dFdx(vUv)).r;
  float hy = texture2D(uDisplacementMap, vUv + dFdy(vUv)).r;

  vec3 dpdx = dFdx(vPosition);
  vec3 dpdy = dFdy(vPosition);
  vec3 displacedNormal =
      normalize(cross(dpdx + (hx - h) * vNormal, dpdy + (hy - h) * vNormal));

  vec3 color;

  color = vec3(texture2D(uTexture, vUv)) * 1.3;

  color = min(color, 1.0);
  color *= 0.5 + 0.5 * pow(max(dot(displacedNormal, -uLightDir), 0.0), 1.5);

  // edges from barycentric coordinates

  gl_FragColor = vec4(color, 1.0);
}
