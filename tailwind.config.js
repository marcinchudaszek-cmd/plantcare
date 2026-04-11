/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === Forest & Cream design system ===
        forest: {
          950: '#0b2218', // tło główne (dark)
          900: '#0f2c20',
          800: '#153326', // surface
          700: '#1d4433',
          600: '#27593f',
          500: '#347351',
          400: '#5aa278'
        },
        leaf: {
          50:  '#eaf7e6',
          100: '#cfecc6',
          200: '#a8dd99',
          300: '#7dd66f', // główny akcent
          400: '#5fbf52',
          500: '#46a23a',
          600: '#358029'
        },
        cream: {
          50:  '#fbf8ee',
          100: '#f6f1e4', // tło main (light)
          200: '#f0e5c8', // tekst nagłówków na ciemnym
          300: '#e6d4a3',
          400: '#d4a24b'  // amber accent
        },
        coral: {
          400: '#e08e7d',
          500: '#d47866', // pilne / spóźnienia
          600: '#b85a48'
        },
        sage: {
          400: '#9ab3a1',
          500: '#8ca693', // muted text na ciemnym
          600: '#6f8a78'
        }
      },
      fontFamily: {
        // Serif do nazw roślin i nagłówków — ten ogrodniczy klimat
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px'
      },
      fontSize: {
        // ciasna skala — bez bałaganu
        xs: ['11px', '1.4'],
        sm: ['13px', '1.5'],
        base: ['15px', '1.6'],
        lg: ['17px', '1.5'],
        xl: ['20px', '1.3'],
        '2xl': ['24px', '1.2'],
        '3xl': ['30px', '1.15']
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        slideUp: 'slideUp 0.3s ease-out'
      }
    }
  },
  plugins: []
};
