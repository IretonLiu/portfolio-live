import React from 'react'
import { motion } from 'framer-motion'
interface EntryProps {
    title: string
    sub: string
    desc: string
    authors?: string[]
    delay?: number
    onclick?: () => void
}

export const Entry: React.FC<EntryProps> = ({
    title,
    sub,
    desc,
    authors,
    delay = 0,
    onclick,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay }}
            onClick={onclick}
            className={`
        group relative py-6 border-b border-white/5 cursor-pointer
        hover:bg-white/[0.02] -mx-4 px-4 transition-colors duration-300
      `}
        >
            <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium text-gray-100 group-hover:text-accent transition-colors duration-300 font-mono tracking-normal">
                    {title}
                </h3>
                <span className="text-xs font-medium text-accent uppercase tracking-wider mb-2">
                    {sub}
                </span>
                {authors && (
                    <p className="text-xs text-gray-400 leading-relaxed font-sans mb-2">
                        {authors.map((author, index) => (
                            <React.Fragment key={author}>
                                {index > 0 && ', '}
                                {author === 'Ireton Liu' ? (
                                    <strong className="font-semibold text-gray-100">
                                        {author}
                                    </strong>
                                ) : (
                                    author
                                )}
                            </React.Fragment>
                        ))}
                    </p>
                )}
                <p className="text-sm text-gray-400 leading-relaxed font-sans">
                    {desc}
                </p>
            </div>

            {/* Subtle indicator on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
        </motion.div>
    )
}
