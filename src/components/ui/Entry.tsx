import React from 'react'
import { motion } from 'framer-motion'
import {
    useGlobeRotationStore,
    usePointerAnimationStore,
} from '../../store/useStore'

interface EntryProps {
    title: string
    sub: string
    desc: string
    globeRotation?: { theta: number; phi: number }
    delay?: number
}

export const Entry: React.FC<EntryProps> = ({
    title,
    sub,
    desc,
    globeRotation,
    delay = 0,
}) => {
    const setGlobeRotation = useGlobeRotationStore(
        (state) => state.setTargetGlobeRotation
    )
    const increasePointerAnimationCounter = usePointerAnimationStore(
        (state) => state.increasePointerAnimationCounter
    )
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay }}
            onClick={() => {
                increasePointerAnimationCounter()
                if (globeRotation) {
                    setGlobeRotation(globeRotation.theta, globeRotation.phi)
                }
            }}
            className={`
        group relative py-6 border-b border-white/5 cursor-pointer
        hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-300
      `}
        >
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-gray-100 group-hover:text-accent transition-colors duration-300 font-mono tracking-normal">
                    {title}
                </h3>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {sub}
                </span>
                <p className="text-sm text-gray-400 leading-relaxed font-sans">
                    {desc}
                </p>
            </div>

            {/* Subtle indicator on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
        </motion.div>
    )
}
