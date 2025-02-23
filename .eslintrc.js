module.exports = {
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:react/recommended'
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  }
} 