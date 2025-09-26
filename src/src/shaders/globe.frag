precision highp float;

flat varying vec3 vNormal;
varying float vDisp;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vBarycentric;

uniform vec3 uCameraPos;
uniform sampler2D uTexture;
uniform sampler2D uDisplacementMap;

void main() {
  // brown land color
  vec3 landColor = vec3(0.5, 0.25, 0.0);
  // earthy green to white peak
  vec3 greenColor = vec3(0.1, 0.6, 0.1);
  vec3 mountainColor = vec3(0.4, 0.3, 0.2);
  vec3 peakColor = vec3(1.0, 1.0, 1.0);

  vec3 color;
  color = vec3(texture2D(uDisplacementMap, vUv));
  color = color * 2.0;
  // color = color * (dot(vNormal, vec3(0.0, 0.0, 1.0)));

  // edges from barycentric coordinates

  gl_FragColor = vec4(color, 1.0);
}
