const tsEslintParser = require('@typescript-eslint/parser');
const tsEslint = require('@typescript-eslint/eslint-plugin');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsEslintParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      // Явно регистрируем плагин с правильным именем
      '@typescript-eslint': tsEslint,
      'prettier': prettier
    },
    rules: {
      ...tsEslint.configs.recommended.rules,  // Включаем рекомендуемые правила TypeScript
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        argsIgnorePattern: '^_',
      }],
      'max-len': ['error', {
        code: 130,
        tabWidth: 2,
        ignoreUrls: true,
        ignoreComments: false,
        ignoreTrailingComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      }],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    }
  },
  {
    // Правила Prettier должны быть в том же объекте конфига
    rules: {
      'prettier/prettier': ['error', { 
        endOfLine: 'auto',
        printWidth: 130,
        tabWidth: 2
      }],
      ...prettierConfig.rules
    }
  }
];