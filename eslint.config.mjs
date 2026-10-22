import coreWebVitals from 'eslint-config-next/core-web-vitals';

// eslint-config-next already ignores `.next`, `out`, `build`, `next-env.d.ts`
// (and ESLint ignores `node_modules`/`.git`), so only what it misses is listed.
const generatedOutput = ['coverage/**', '**/*.tsbuildinfo'];

const config = [
  { ignores: generatedOutput },
  ...coreWebVitals,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The base rule misreports on TypeScript (types, enums and implements
    // clauses); eslint-config-next already enables the TS-aware variant.
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs,jsx}'],
    rules: {
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];

export default config;
