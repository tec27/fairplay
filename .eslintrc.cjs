module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  plugins: ['prettier', 'react-refresh'],
  rules: {
    'prettier/prettier': 'error',

    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    '@typescript-eslint/no-base-to-string': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-redeclare': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { vars: 'all', args: 'none', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/unbound-method': 'off',
  },
}
