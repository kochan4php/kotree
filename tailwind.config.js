import daisyui from 'daisyui';

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {},
        container: {
            padding: '1rem',
            center: true,
        },
    },
    plugins: [daisyui],
};
