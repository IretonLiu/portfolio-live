import { Barlow_Condensed, JetBrains_Mono, Manrope } from 'next/font/google'
import './globals.css'

import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Ireton Liu - Computer Vision Researcher & Creative Developer',
}
const barlowCondensed = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['400', '600', '800'],
    variable: '--font-barlow',
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
            <body
                className={`${barlowCondensed.variable} ${jetBrainsMono.variable} ${manrope.variable} font-sans`}
            >
                {children}
            </body>
        </html>
    )
}
