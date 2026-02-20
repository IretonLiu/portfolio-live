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
            {/*<Loader />*/}
            <CanvasContainer />
            {/* 3D Canvas Container - Takes 50% width */}
            {/*<div className="fixed h-[50vh] w-[60vw] right-0 left-auto lg:h-screen lg:w-1/2 lg:left-auto lg:right-5 2xl:left-auto 2xl:right-50 z-11">
            </div>*/}
            {/* Content Container - Scrollable area */}
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
                    width={240}
                    height={240}
                    className="w-64 h-64 md:w-64 md:h-64 opacity-80 hover:opacity-100 transition-opacity"
                />
            </motion.div>
        </main>
    )
}
