export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}", // Added based on project structure
        "./app/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'japan-blue': '#2b4f81',
                'japan-red': '#c93a40',
                'paper': '#fcfbf9',
                'ink': '#2c2c2c',
            },
            fontFamily: {
                sans: ['"Noto Sans TC"', 'sans-serif'],
                serif: ['"Noto Serif JP"', 'serif'],
            }
        },
    },
    plugins: [],
}
