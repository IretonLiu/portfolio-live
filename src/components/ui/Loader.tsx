'use client'

import { useProgress } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import TerminalDots from './TerminalDots'

export default function Loader({ onLoaded }) {
    // Destructure 'active' to know when loading is truly finished
    const { active, progress } = useProgress()
    const [show, setShow] = useState(true)

    useEffect(() => {
        let timer

        // Only start the hide timer if /oading is inactive AND progress is full
        // This prevents premature hiding if progress hits 100 but assets are still processing
        const isFinished = !active && progress === 100

        if (isFinished) {
            timer = setTimeout(() => {
                setShow(false)
            }, 3000)
        } else {
            // Ensure the loader is visible if loading starts again
            // Using a functional update or checking state can be safer,
            // but usually setShow(true) is fine here as long as 'active' is stable.
            if (!show) {
                setShow(true)
            }
        }

        // CLEANUP: Correctly clear the timeout using clearTimeout
        return () => clearTimeout(timer)
    }, [progress, active])

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 1 }}
                    className="fixed inset-0 z-999 flex flex-col items-center justify-center bg-transparent text-slate-900 pointer-events-none"
                >
                    <div className="w-full flex flex-col items-center gap-4">
                        {/* Letter spacing is important for the aesthetic, adjust as needed */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-sm font-mono tracking-[0.2em] text-black z-998"
                        >
                            LOADING...
                        </motion.div>

                        <motion.div
                            className="h-[1px] w-full bg-gray-300/20 relative overflow-hidden z-998"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <motion.div
                                className="absolute inset-y-0 left-1/2 bg-gray-800 -translate-x-1/2"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            />
                        </motion.div>

                        <div className="relative flex justify-between items-center w-full text-[10px] font-mono text-black px-2 z-[998]">
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: 0.0 }}
                            >
                                {active ? 'LOADING ASSETS' : 'FINALIZING'}
                                <TerminalDots />
                            </motion.span>

                            {/* Centered absolutely, visible only on small screens (<640px) in portrait mode */}
                            <motion.span
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: 0.0 }}
                                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden max-sm:portrait:block whitespace-nowrap"
                            >
                                (view in landscape for best experience)
                            </motion.span>

                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: 0.0 }}
                            >
                                {Math.round(progress)}%
                            </motion.span>
                        </div>
                        <motion.div
                            className="absolute top-0 left-0 w-full h-1/2 bg-white z-997"
                            initial={{ y: 0 }}
                            exit={{ y: '-100%' }}
                            transition={{
                                duration: 0.8,
                                delay: 1.0, // Delay to start after the progress bar animation
                            }}
                        />

                        {/* BOTTOM PANEL - Slides Down */}
                        <motion.div
                            className="absolute bottom-0 left-0 w-full h-1/2 bg-white z-997"
                            initial={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{
                                duration: 0.8,
                                delay: 1.0, // Delay to start after the top panel
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
