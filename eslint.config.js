import js from '@eslint/js';
import ts from 'typescript-eslint';
import standards from '../learning/eslint/standards.mjs';

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'archived/**',
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
    plugins: { standards },
    // Severity and scope for every standards rule live here (ADR-015). A clean-up ticket that clears
    // a rule's last hit switches it from 'warn' to 'error' in this file, never in standards.mjs.
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'no-empty': 'error',
      'no-nested-ternary': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      'standards/jest-mock-shared': 'error',
      'standards/expect-every-some': 'error',
      'standards/chained-mock-once': 'error',
      'standards/set-hours-zero': 'error',
      'standards/set-utc-hours': 'error',
      'standards/zod-string-format': 'error',
      'standards/zod-issue-code': 'error',
      'standards/force-exit': 'error',
      'standards/json-parse-as': 'error',

      'standards/catch-empty-callback': 'warn',
      'standards/as-unknown-as': 'warn',
      'standards/as-never': 'warn',
      'standards/expect-typeof': 'warn',
      'standards/optional-onpress': 'warn'
    }
  },
  {
    // Type-aware rules need the tsconfig program; e2e has its own tsconfig and is not in it.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['e2e/**'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn'
    }
  },
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['.detoxrc.js', 'e2e/jest.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable' }
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
