'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { Tabs } from '@/components/ui/Tabs'
import { TabPanels } from '@/components/content/TabPanels'
import { CanvasContainer } from '@/components/canvas/CanvasContainer'

export default function Home() {
    const [activeTab, setActiveTab] = useState('about')
    const tabs = ['about', 'projects', 'experiences', 'publications']

    return (
        <main className="relative w-full min-h-screen  overflow-hidden flex flex-col lg:flex-row">
            {/* 3D Canvas Container - Takes full width on mobile, 50% on desktop */}
            <div className="fixed inset-0  h-[40vh] lg:h-screen w-full z-100">
                <CanvasContainer />

                {/* Gradient Overlay for seamless blending on mobile */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050b14] to-transparent lg:hidden pointer-events-none" />
                {/* Side Gradient for desktop blending */}
                <div className="hidden lg:block absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#050b14] to-transparent pointer-events-none" />
            </div>

            {/* Content Container - Scrollable area */}
            <div className="relative z-10 flex-1 lg:order-1 flex flex-col h-full lg:h-screen lg:overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-2xl mx-auto px-6 py-12 lg:p-20 flex flex-col min-h-screen justify-center">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-3">
                            IRETON LIU
                        </h1>
                        <p className="text-lg sm:text-xl font-mono text-blue-200/80 mb-6">
                            Graphics Engineer & Researcher
                        </p>
                        <SocialLinks />
                    </motion.div>

                    {/* Navigation & Content */}
                    <div className="backdrop-blur-sm bg-[#050b14]/30 rounded-2xl border border-white/5 p-1 md:p-6 lg:border-none lg:bg-transparent lg:backdrop-blur-none lg:p-0">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />

                        <div className="mt-6 min-h-[300px]">
                            <TabPanels activeTab={activeTab} />
                        </div>
                    </div>

                    {/* Copyright / Footer in flow */}
                    <div className="mt-12 pt-8 border-t border-white/5 text-xs text-gray-500 font-mono">
                        © {new Date().getFullYear()} Ireton Liu. All rights
                        reserved.
                    </div>
                </div>
            </div>

            {/* Fixed 'About This' Image */}
            <motion.div
                className="fixed top-6 right-6 lg:top-8 lg:right-8 z-50 cursor-pointer mix-blend-screen hover:scale-105 transition-transform duration-300"
                initial={{ opacity: 0, rotate: 15 }}
                animate={{ opacity: 0.8, rotate: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                onClick={() =>
                    window.open(
                        'https://github.com/IretonLiu/portfolio-live',
                        '_blank'
                    )
                }
            >
                <Image
                    src="/assets/images/inverted.png"
                    alt="About This"
                    width={60}
                    height={60}
                    className="w-12 h-12 md:w-16 md:h-16 opacity-70 hover:opacity-100 transition-opacity"
                />
            </motion.div>
        </main>
    )
}
