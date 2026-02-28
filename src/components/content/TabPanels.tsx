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
                        className="space-y-6 text-gray-300 leading-relaxed font-mono"
                    >
                        <h5 className="text-2xl font-light text-white tracking-tight"></h5>
                        <p>
                            As a Computer Vision researcher by training and Data
                            Scientist by profession, with a strong appreciation
                            for creative coding and 3D graphics, I bring a
                            unique blend of technical expertise and artistic
                            sensibility to my work. I leverage this unique
                            technical background to build interactive
                            experiences that handle complex geometry and
                            high-fidelity visuals, without compromising on
                            performance.
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
                                globeRotation={{
                                    theta: exp.location[0],
                                    phi: exp.location[1],
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
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
