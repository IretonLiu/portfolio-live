# Portfolio Website

## Globe
The globe is rendering in threejs and almost entirely rendered using shaders. 
The globe is a sphere geometry with a custom shader material that uses a vertex and fragment shader to create the effect of a rotating globe with clouds and atmosphere.
Both of which are volumetically rendered.

The texture under goes screenspace derivatives calculations to create a normal map for the lighting of the globe.
