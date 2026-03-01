'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { Tabs } from '@/components/ui/Tabs'
import { TabPanels } from '@/components/content/TabPanels'
import { CanvasContainer } from '@/components/canvas/CanvasContainer'
import Loader from '@/components/ui/Loader'
export default function Home() {
    const [activeTab, setActiveTab] = useState('about')
    const tabs = ['about', 'projects', 'experiences', 'publications']
    return (
        <main className="relative w-full min-h-screen flex flex-col lg:flex-row ">
            <Loader />
            <CanvasContainer />
            <div className="relative z-40 flex-1 lg:order-1 flex flex-col h-full lg:h-screen lg:overflow-y-auto custom-scrollbar pointer-events-none">
                <div className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col min-h-screen lg:ml-35 lg:p-20 2xl:ml-[20vw] pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-8"
                    >
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="block text-xl sm:text-2xl font-mono text-blue-200/80 mb-2"
                        >
                            HI! I'm...
                        </motion.span>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-3">
                            IRETON LIU
                        </h1>
                        <p className="text-lg sm:text-xl font-mono text-blue-200/80 mb-6">
                            Computer Vision | Creative Dev | Data Science
                        </p>
                        <SocialLinks />
                    </motion.div>
                    <div className="backdrop-blur-sm bg-[#050b14]/30 rounded-2xl border border-white/5 p-5 md:p-6 lg:border-none lg:bg-transparent lg:backdrop-blur-none lg:p-0">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />

                        <div className="mt-6 min-h-[300px]">
                            <TabPanels activeTab={activeTab} />
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 text-xs text-gray-500 font-mono">
                        © {new Date().getFullYear()} Ireton Liu. All rights
                        reserved.
                    </div>
                </div>
            </div>
            <motion.div
                className="fixed top-6 left-auto right-6 lg:top-8 lg:-right-20 z-50 cursor-pointer mix-blend-screen hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 0.8, rotate: -5 }}
                whileHover={{ opacity: 1 }}
                transition={{
                    opacity: { delay: 1, duration: 1 },
                    rotate: {
                        delay: 0,
                        duration: 0.01,
                        repeatDelay: 5,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    },
                }}
                onClick={() =>
                    window.open(
                        'https://github.com/IretonLiu/portfolio-live',
                        '_blank'
                    )
                }
            >
                <img
                    src="/assets/images/inverted.png"
                    alt="About This"
                    width={240}
                    height={240}
                    className="w-32 h-32 md:w-64 md:h-64  2xl:mr-150 opacity-80 hover:opacity-100 transition-opacity"
                />
            </motion.div>
        </main>
    )
}
