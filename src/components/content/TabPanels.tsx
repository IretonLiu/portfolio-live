import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { projects, experiences, publications } from '../../data/content'
import { Entry } from '../ui/Entry'

import {
    useGlobeRotationStore,
    usePointerAnimationStore,
} from '../../store/useStore'

interface TabPanelsProps {
    activeTab: string
}

export const TabPanels: React.FC<TabPanelsProps> = ({ activeTab }) => {
    const setGlobeRotation = useGlobeRotationStore(
        (state) => state.setTargetGlobeRotation
    )
    const increasePointerAnimationCounter = usePointerAnimationStore(
        (state) => state.increasePointerAnimationCounter
    )
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
                        className="space-y-6 text-gray-300 leading-relaxed font-mono"
                    >
                        <h5 className="text-2xl font-light text-white tracking-tight"></h5>
                        <p>
                            I'm a Data Scientist by profession and Computer
                            Vision researcher by training, and obsessed with
                            creative coding and 3D graphics in my spare time:) I
                            bring a unique blend of technical expertise
                            creativity to my work. This unique technical
                            background help me build complex interactive
                            experiences and robust pipelines without
                            compromising on performance.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 marker:text-accent">
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Rendering & Shader Programming
                                </strong>
                                <span className="block text-sm mt-1">
                                    Real-time rendering techniques, shader
                                    development, and GPU programming.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Computer Vision & Digital Image Processing
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    3D reconstruction; Image signal processing;
                                    Feature extraction; Deep learning for vision
                                    tasks.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    Data Science
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    Statistical modeling, data analysis, and ML
                                    algorithms for vision and natual language
                                    processing.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    High Performance Distributed Computing
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    AWS, CUDA, MPI, and distributed training
                                    pipelines for ML.
                                </span>
                            </li>
                            <li>
                                <strong className="text-white font-mono text-sm font-normal tracking-wide uppercase">
                                    WebGL
                                </strong>{' '}
                                <span className="block text-sm mt-1">
                                    Threejs; React Three Fiber;
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
                                onclick={() => {
                                    if (project.onclick) {
                                        window.open(project.onclick, '_blank')
                                    }
                                }}
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
                                onclick={() => {
                                    setGlobeRotation(
                                        exp.location[0],
                                        exp.location[1]
                                    )
                                    increasePointerAnimationCounter()
                                }}
                                delay={index * 0.1}
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
                                onclick={() => {}}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
