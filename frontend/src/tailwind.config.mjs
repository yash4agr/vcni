/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}', './public/**/*.html'],
    theme: {
        extend: {
            fontSize: {
                xs: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.02em', fontWeight: '400' }],
                sm: ['0.875rem', { lineHeight: '1.3', letterSpacing: '0.02em', fontWeight: '400' }],
                base: ['1rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '400' }],
                lg: ['1.125rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
                xl: ['1.25rem', { lineHeight: '1.3', letterSpacing: '0.01em', fontWeight: '500' }],
                '2xl': ['1.5rem', { lineHeight: '1.2', letterSpacing: '0.005em', fontWeight: '600' }],
                '3xl': ['1.875rem', { lineHeight: '1.2', letterSpacing: '0.005em', fontWeight: '600' }],
                '4xl': ['2.25rem', { lineHeight: '1.1', letterSpacing: '0.002em', fontWeight: '700' }],
                '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '0.001em', fontWeight: '700' }],
                '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '0', fontWeight: '700' }],
                '7xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '0', fontWeight: '700' }],
                '8xl': ['6rem', { lineHeight: '1', letterSpacing: '0', fontWeight: '700' }],
                '9xl': ['8rem', { lineHeight: '1', letterSpacing: '0', fontWeight: '700' }],
            },
            fontFamily: {
                heading: "syne",
                paragraph: "azeret-mono"
            },
            colors: {
                'electric-teal': '#00FFFF',
                'deep-space-blue': '#0A0A0A',
                'magenta-glow': '#FF00FF',
                'glassmorphism-overlay': 'rgba(255, 255, 255, 0.05)',
                'subtle-gradient-start': '#1A1A1A',
                'subtle-gradient-end': '#0A0A0A',
                background: '#0A0A0A',
                secondary: '#8A2BE2',
                foreground: '#E0E0E0',
                'secondary-foreground': '#FFFFFF',
                'primary-foreground': '#000000',
                primary: '#00FFFF'
            },
        },
    },
    future: {
        hoverOnlyWhenSupported: true,
    },
    plugins: [require('@tailwindcss/container-queries'), require('@tailwindcss/typography')],
}
