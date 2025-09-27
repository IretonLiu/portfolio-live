#include <noise>

uniform int size;
uniform float sliceZ;
void main() {

  vec2 uv = gl_FragCoord.xy / vec2(size, size);

  vec3 p = vec3(uv, sliceZ) * 2.0; // [-1, 1] cube

  float freq = 4.0;
  float pfbm = mix(1., perlinFbm(p, 4., 7), .5);
  pfbm = abs(pfbm * 2. - 1.); // billowy perlin noise
  float worleyFBM_g = worleyFbm(p, freq);
  float worleyFBM_b = worleyFbm(p, freq * 2.0);
  float worleyFBM_a = worleyFbm(p, freq * 4.0);
  float perlinWorley = remap(pfbm, 0., 1., worleyFBM_g, 1.); // perlin-worley

  vec4 color = vec4(perlinWorley, worleyFBM_g, worleyFBM_b, worleyFBM_a);

  gl_FragColor = color;
}
