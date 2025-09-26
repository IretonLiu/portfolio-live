
precision highp float;

flat varying vec3 vNormal;
varying float vDisp;
varying vec3 vPosition;
varying vec2 vUV;
varying vec3 vBarycentric;

void main() {

  // vec3 lightDir = normalize(vec3(10.0, 10.0, 10.0) - vPosition);
  // float edgeWidth = 0.005; // Adjust edge width as needed
  // // edge detection using barycentric coordinates

  // float cornerRadius = 0.05; // Adjust corner size as needed
  // // corner detection is where the length from any of the 3 corners is less
  // than cornerSize

  // vec3 color = vec3(1.0) * max(dot(vNormal, lightDir), 0.2);

  // if (vBarycentric.x < edgeWidth || vBarycentric.y < edgeWidth ||
  // vBarycentric.z < edgeWidth) {
  //     color = vec3(0.0, 0.0, 0.0); // Edge color
  // }
  //

  // // edges and corners
  // if (length(vBarycentric - vec3(1, 0, 0)) < cornerRadius ||
  //     length(vBarycentric - vec3(0, 1, 0)) < cornerRadius ||
  //     length(vBarycentric - vec3(0, 0, 1)) < cornerRadius) {
  //     color = vec3(0.0, 0.0, 0.0); // Corner color

  // gl_fragcolor = vec4(color, 1.0);
}
