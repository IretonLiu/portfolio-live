import React, { useState, useEffect } from 'react'

const TerminalDots = () => {
    const [dotCount, setDotCount] = useState(1)

    useEffect(() => {
        const interval = setInterval(() => {
            setDotCount((prev) => (prev % 3) + 1)
        }, 500) // Change speed here (500ms = half a second)

        return () => clearInterval(interval)
    }, [])

    return (
        <span
            style={{
                fontFamily: 'monospace',
                display: 'inline-block',
                width: '1.5em', // Prevents layout jittering as dots appear
            }}
        >
            {'.'.repeat(dotCount)}
        </span>
    )
}

export default TerminalDots
