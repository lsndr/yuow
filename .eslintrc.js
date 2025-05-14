module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:eslint-comments/recommended',
    'prettier',
  ],
  ignorePatterns: ['**/dist/**/*', '**/node_modules'],
  env: {
    node: true,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:import/typescript',
      ],
      parserOptions: {
        project: ['tsconfig.eslint.json'],
      },
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'error',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-for-in-array': 'error',
        '@typescript-eslint/no-implied-eval': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/restrict-plus-operands': 'error',
        '@typescript-eslint/unbound-method': 'error',
        'import/no-default-export': 'error',
        'eslint-comments/require-description': 'error',
        'eslint-comments/disable-enable-pair': 'off',
        'eslint-comments/no-unlimited-disable': 'off',
        'import/no-cycle': 'error',
        'import/no-unresolved': 'error',
        'import/order': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
            disallowTypeAnnotations: true,
            fixStyle: 'inline-type-imports',
          },
        ],
        '@typescript-eslint/member-ordering': [
          'error',
          {
            default: [
              'public-static-field',
              'protected-static-field',
              'private-static-field',
              'public-instance-field',
              'protected-instance-field',
              'private-instance-field',
              'constructor',
              'public-static-method',
              'protected-static-method',
              'private-static-method',
              'public-abstract-method',
              'protected-abstract-method',
              'public-instance-method',
              'protected-instance-method',
              'private-instance-method',
            ],
          },
        ],
        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          {
            accessibility: 'explicit',
          },
        ],
      },
      settings: {
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts'],
        },
        'import/resolver': {
          typescript: {
            project: './tsconfig.eslint.json',
          },
        },
      },
      reportUnusedDisableDirectives: true,
    },
  ],
};
