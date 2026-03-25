export const projects = [
    {
        id: 'coffee corner',
        title: 'Pourover: an interactive demo',
        sub: 'WebGL / GLSL (React Three Fiber)',
        desc: 'An interactive WebGL demo of a cosy coffee pourover setup.',
        onclick: 'https://pourover.pages.dev',
    },
    {
        id: 'archviz',
        title: 'Cirrus: Interactive Architectural Visualization',
        sub: 'WebGL / GLSL (React Three Fiber)',
        desc: 'High fidelity real-time interior rendering on the web. Features custom shader materials for high-fidelity performance on mobile devices.',
        onclick: 'https://cirrus-8b6.pages.dev',
    },
    {
        id: 'dunant',
        title: 'Henry Dunant Bust Reconstruction',
        sub: 'Threejs / 3D Gaussian Splatting',
        desc: '3D reconstruction of a bust of Henry Dunant using a custom Threejs implementation of 3D Gaussian Splatting.',
        onclick: 'https://iretonliu.github.io',
    },
    {
        id: 'sterkfontein',
        title: '3D Reconstruction of Sterkfontein Caves',
        sub: 'Photogrammetry / MVS / RAW image processing (Python, C++)',
        desc: 'Fast High-resolution 3D reconstruction of the Sterkfontein Caves using NeRFs and RAW image data.',
        onclick: 'https://youtu.be/lH6FNb9MxX8',
    },
    {
        id: 'asperitas',
        title: 'Rendering the Asperitas Cloud Formation',
        sub: 'IFFT / Volumetric Raymarching (Unity, C#, HLSL)',
        desc: 'Realistic rendering of the rare Asperitas cloud formation using procedural noise and volumetric techniques.',
        onclick: 'https://github.com/IretonLiu/realtime-procedural-asperitas',
    },
    // {
    //     id: 'ocean',
    //     title: 'Real-time Ocean Rendering',
    //     sub: 'FFT-based wave simulation (Unity, C#, HLSL)',
    //     desc: 'Procedural ocean simulation using Fast Fourier Transform and compute shaders.',
    //     onclick: 'https://github.com/IretonLiu/OceanSim-IFFT',
    // },
    //{
    //  id: 'clouds',
    //  title: 'Volumetric Cloud Rendering',
    //  sub: 'Noise + Raymarching (Unity, C#, HLSL)',
    //  desc: 'Real-time volumetric rendering of clouds.',
    //  onclick: 'https://github.com/IretonLiu/cloud-simulation-unity',
    //},
    //{
    //  id: 'nbody',
    //  title: 'N-Body Simulation',
    //  sub: 'MPI / CUDA (C++)',
    //  desc: 'Parallel Barnes-Hut simulation for astrophysics.',
    //  onclick: 'https://github.com/IretonLiu/n-body-simulation',
    //},
]

export const experiences = [
    {
        id: 'missionmobile',
        title: 'Data Scientist',
        sub: 'Mission Mobile (South Africa) — 2025–present',
        desc: 'Lead architect in pipelines to optimise mobile-device lending strategies, leveraging machine learning models to analyse user behavior and credit risk.',
        location: [0.9, -0.6],
    },
    {
        id: 'dragonfruit',
        title: 'Machine Learning Engineer Intern',
        sub: 'Dragonfruit AI (US, remote) — 2025',
        desc: 'Built and scaled distributed computing platforms for efficient AI training and inference.',
        location: [0.9, -0.6],
    },
    {
        id: 'epfl',
        title: 'Research Engineer Intern',
        sub: 'EPFL (Lausanne, Switzerland) — 2025',
        desc: '3D reconstruction project in collaboration with the ICRC.',
        location: [1.2, 0.75],
    },
    //{
    //    id: 'brown',
    //    title: 'Exchange Semester',
    //    sub: 'Brown University (Providenc, US) — 2024',
    //    desc: 'Exhange research semester at Brown University, working on 3D reconstruction of the Sterkfontein Caves.',
    //    location: [0.8, -1.8],
    //},
    {
        id: 'pygio',
        title: 'Data Scientist',
        sub: 'Pygio (South Africa) — 2023–2024',
        desc: 'Designed machine learning models for financial forecasting and NLP.',
        location: [0.9, -0.6],
    },
    {
        id: 'halo',
        title: 'Robotics Engineer Intern',
        sub: 'Halo, World! (Tokyo, Japan) — 2023',
        desc: 'Implemented SLAM algorithms for autonomous navigation and 3D mapping.',
        location: [-1.1, 0.55],
    },
    {
        id: 'wits',
        title: 'Sessional Lecturer',
        sub: 'University of the Witwatersrand (South Africa) — 2023',
        desc: 'Taught undergraduate courses on data structures and algorithms and computer graphics',
        location: [0.9, -0.6],
    },
]

export const publications = [
    {
        id: 'sterkfontein',
        title: 'A 3D Reconstruction of the Sterkfontein Caves using Novel View Synthesis',
        sub: 'In progress (aiming ECCV 2026)',
        desc: 'Ongoing collaboration with Brown University, developing a novel view synthesis framework for high-fidelity 3D reconstruction of the Sterkfontein Caves.',
    },
    {
        id: 'mineplanner',
        title: 'MinePlanner: A Benchmark for Long-Horizon Planning in Large Minecraft Worlds',
        sub: 'ICAPS 2023',
        desc: 'Introduced a benchmark environment for evaluating planning algorithms in expansive, procedurally generated Minecraft worlds. Provided new insights into long-horizon planning under uncertainty.',
    },
    {
        id: 'hwfc',
        title: 'HWFC - Hierarchical Wave Function Collapse',
        sub: 'AAAI 2022',
        desc: 'Presented a hierarchical extension to the Wave Function Collapse algorithm, enabling more scalable and efficient procedural content generation in complex environments.',
    },
]
