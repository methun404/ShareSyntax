/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                'deep-black': '#050505',
                'surface-dark': '#0A0A0A',
                'surface-light': '#121212',
                'surface-lighter': '#1E1E1E',

                // Accents
                'neon-blue': '#2E86DE', // Deeper blue
                'neon-cyan': '#00E5FF', // Bright cyan
                'neon-violet': '#D63031', // Using a red/violet punch
                'neon-purple': '#A855F7',

                // Functional
                'success': '#00C851',
                'warning': '#FFBB33',
                'error': '#FF4444',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both',
                'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'scale-in': 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'spin-slow': 'spin 8s linear infinite',
                'pin-shimmer': 'pinShimmer 1.4s ease-in-out infinite',
                'pin-pop': 'pinPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    'from': { boxShadow: '0 0 10px rgba(0, 229, 255, 0.1)' },
                    'to': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.92)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pinShimmer: {
                    '0%':   { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(400%)' },
                },
                pinPop: {
                    '0%': { opacity: '0', transform: 'scale(0.5) translateY(8px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 90deg at 50% 50%, #00000000 50%, #00E5FF 100%)',
            }
        },
    },
    plugins: [],
}
