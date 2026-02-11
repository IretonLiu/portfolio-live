import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { projects, experiences, publications } from '../../data/content'
import { Entry } from '../ui/Entry'

interface TabPanelsProps {
    activeTab: string
}

export const TabPanels: React.FC<TabPanelsProps> = ({ activeTab }) => {
    return (
        <div className="relative pb-10">
            <AnimatePresence mode="wait">
                {activeTab === 'about' && (
                    <motion.div
                        key="about"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6 text-gray-300 leading-relaxed font-sans"
                    >
                        <p>
                            I specialize in computer graphics, machine learning
                            and computer visions, with a strong foundation in
                            both theory and practice. I have a deep
                            understanding of the rendering pipeline and shader
                            programming, which I often explore through creating
                            shader art — a medium that lets me combine
                            creativity with mathematics. My work reflects not
                            only technical skills and creativity but also a
                            genuine appreciation for the mathematical beauty
                            behind visual computing.
                        </p>
                        <p>My technical skills span across:</p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-accent">
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Rendering & Shader Programming
                                </strong>
                                <span className="block text-sm mt-1">
                                    Real-time rendering, volumetric effects, and
                                    GPU programming.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Computer Vision & Digital Image Processing
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    From 3D reconstruction to RAW image
                                    processing.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Game Engines
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    Familiarity with modern engines (
                                    <strong className="text-gray-100">
                                        Unity
                                    </strong>
                                    ,{' '}
                                    <strong className="text-gray-100">
                                        Unreal
                                    </strong>
                                    ) game engines fundamentals (rendering loop,
                                    physics, ECS).
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    High Performance Computing
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    CUDA, MPI, and distributed training
                                    pipelines for ML.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Robotics & SLAM
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    Navigation and mapping algorithms for
                                    autonomous systems.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Fullstack Development
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    Backend, web, and mobile applications.
                                </span>
                            </li>
                        </ul>
                    </motion.div>
                )}

                {activeTab === 'projects' && (
                    <motion.div
                        key="projects"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {projects.map((project, index) => (
                            <Entry
                                key={project.id}
                                title={project.title}
                                sub={project.sub}
                                desc={project.desc}
                                delay={index * 0.1}
                                onClick={() =>
                                    window.open(project.onclick, '_blank')
                                }
                            />
                        ))}
                    </motion.div>
                )}

                {activeTab === 'experiences' && (
                    <motion.div
                        key="experiences"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {experiences.map((exp, index) => (
                            <Entry
                                key={exp.id}
                                title={exp.title}
                                sub={exp.sub}
                                desc={exp.desc}
                                delay={index * 0.1}
                                onClick={() => {
                                    // Placeholder for 3D globe interaction
                                    console.log(
                                        `Move camera to: ${exp.location}`
                                    )
                                }}
                            />
                        ))}
                    </motion.div>
                )}

                {activeTab === 'publications' && (
                    <motion.div
                        key="publications"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {publications.map((pub, index) => (
                            <Entry
                                key={pub.id}
                                title={pub.title}
                                sub={pub.sub}
                                desc={pub.desc}
                                delay={index * 0.1}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

