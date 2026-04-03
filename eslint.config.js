import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'babel.config.js',
      'jest.config.js',
      'metro.config.js'
    ]
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: [
      'src/components/donor/TopUpSheet.tsx',
      'src/components/ui/Logo.tsx',
      'src/providers/StripeWrapper.tsx'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
];
