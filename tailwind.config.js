/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
     "./home-components/**/*.{js,ts,jsx,tsx}",
     "./class-detail-components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "logo-red": "#E73F2B",
      }
    },
    screens: {
      'sm': '340px',
      // => @media (min-width: 340px) { ... }

      'md': '768px',
      // => @media (min-width: 768px) { ... }

      'lg': '1024px',
      // => @media (min-width: 1024px) { ... }

      'xl': '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }
      'dm': '600px',
      'dm1': '450px',
      'dm2':'990px',
      // => @media (min-width: 500px) { ... }
    }
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
    require('@tailwindcss/forms'),
  ],
}
