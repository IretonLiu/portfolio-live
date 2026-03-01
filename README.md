# Portfolio

3D portfolio built with Next.js and React Three Fiber, effects written almost entirely in GLSL.

## Core Components

### Interactive Globe
A custom-shaded sphere featuring:
- Terrain rendered using height maps and custom vertex displacement.
- Physically-based lighting model implemented in GLSL for realistic material response.
- Derivative-based normal for surface lighting details. 

### Volumetric Clouds
A real-time cloud simulation implemented via:
- Volumetric traversal through a precomputed 3D noise texture generated on initialization.
- Fragment shaders calculating light absorption  and phase functions for realistic atmospheric scattering.
- Blending with scene geometry using the depth buffer and FBOs.

### Background
A raymarched procedural background providing:
- The floor and background are defined using Signed Distance Functions.
- Dynamic shadowing cast by the globe onto the environment.
- Lighting calculations respond to the global scene light position.

## Technical Implementation
The project focuses on efficient GPU-side computation:
- **GLSL Shaders:** Custom vertex and fragment shaders for all 3D elements.
- **3D Noise:** Precomputed Perlin-Worley noise textures used for volumetric density.

State management using zustand.

