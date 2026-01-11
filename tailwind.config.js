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
                // 主色調 - 擴充色階
                'japan-blue': {
                    DEFAULT: '#2b4f81',
                    50: '#f0f4f8',
                    100: '#d9e6f2',
                    200: '#b3cce5',
                    300: '#7fa3d1',
                    400: '#4f7db0',
                    500: '#2b4f81',
                    600: '#234169',
                    700: '#1c3454',
                    800: '#152740',
                    900: '#0e1a2c',
                },
                'japan-red': {
                    DEFAULT: '#c93a40',
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#c93a40',
                    600: '#b32d33',
                    700: '#9d2328',
                    800: '#7f1d1d',
                },

                // 日式輔助色
                'sakura': '#f9c5d5',      // 櫻花粉 (美食)
                'matcha': '#a8d5a3',      // 抹茶綠 (購物/自然)
                'kiniro': '#e6b422',      // 金色 (住宿/高級)
                'murasaki': '#9d8ac7',    // 紫藤色 (體驗/活動)
                'sumi': '#4a5568',        // 炭灰 (交通/中性)

                // 背景與紙張
                'paper': {
                    DEFAULT: '#fcfbf9',
                    light: '#fefefe',
                    dark: '#f8f7f5',
                },

                // 墨色階
                'ink': {
                    DEFAULT: '#2c2c2c',
                    light: '#5a5a5a',
                    lighter: '#8a8a8a',
                },
            },
            fontFamily: {
                sans: ['"Noto Sans TC"', 'sans-serif'],
                serif: ['"Noto Serif JP"', 'serif'],
            }
        },
    },
    plugins: [],
}

