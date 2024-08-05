import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import pluginReact from 'eslint-plugin-react';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parser: parser
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': pluginReact
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/prop-types': 'off',
      'indent': ['error', 2],  // Indentação de 2 espaços
      'quotes': ['error', 'single'],  // Usar aspas simples
      'semi': ['error', 'always'],  // Sempre usar ponto e vírgula
      'linebreak-style': ['error', 'unix'],  // Usar quebra de linha estilo Unix
      'comma-dangle': ['error', 'never'],  // Não usar vírgula final
      'no-trailing-spaces': 'error',  // Não permitir espaços finais
      'eol-last': ['error', 'always']  // Garantir nova linha no final do arquivo
    }
  }
];
