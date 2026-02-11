import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Barlow_Condensed, JetBrains_Mono, Manrope } from 'next/font/google'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['400', '600', '800'],
    variable: '--font-barlow', // We define a CSS variable here
})

const jetBrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--font-jetbrains',
})

const manrope = Manrope({
    subsets: ['latin'],
    weight: ['400', '600'],
    variable: '--font-manrope',
})

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            {/* 2. Add the variables to the body so Tailwind can see them */}
            <body
                className={`${barlowCondensed.variable} ${jetBrainsMono.variable} ${manrope.variable} font-sans`}
            >
                {children}
            </body>
        </html>
    )
}
