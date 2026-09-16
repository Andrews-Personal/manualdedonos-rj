import antfu from '@antfu/eslint-config';

export default antfu({
  react: true,
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    semi: true,
    quotes: 'single',
  },
  ignores: [
    'dist',
    'node_modules',
    'functions/node_modules',
    'functions/lib',
    '.eslintcache',
    'seed-data',
    '.firebase',
    'docs/**/*.md/**',
  ],
}, {
  rules: {
    'ts/consistent-type-definitions': ['error', 'type'],
    'ts/no-explicit-any': ['warn'],
    'ts/no-non-null-assertion': ['warn'],
    'no-console': ['warn'],
    'antfu/no-top-level-await': ['off'],
    'node/prefer-node-protocol': 'off',
    'unused-imports/no-unused-imports': ['error'],
    'unicorn/filename-case': ['error', {
      case: 'kebabCase',
      ignore: ['CLAUDE.md', 'README.md'],
    }],
    // Fonte única de locale/fuso. Importe APP_LOCALE / APP_TIMEZONE de src/config/locale.ts.
    'no-restricted-syntax': ['error', {
      selector: 'Literal[value=\'pt-BR\']',
      message: 'Não fixe \'pt-BR\' no código. Importe APP_LOCALE de @/config/locale.',
    }, {
      selector: 'Literal[value=\'America/Sao_Paulo\']',
      message: 'Não fixe \'America/Sao_Paulo\' no código. Importe APP_TIMEZONE de @/config/locale.',
    }],
  },
}, {
  files: ['src/config/locale.ts'],
  rules: { 'no-restricted-syntax': 'off' },
});
