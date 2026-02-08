import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

// Define custom plugin
const customRulesPlugin = {
  rules: {
    'uppercase-hex': {
      meta: {
        type: 'layout',
        docs: {
          description: 'Enforce uppercase hexadecimal literals',
        },
        fixable: 'code',
      },
      create(context) {
        return {
          Literal(node) {
            if (
              typeof node.value === 'number' &&
              node.raw &&
              /^0x[0-9a-f]+$/i.test(node.raw)
            ) {
              if (/[a-f]/.test(node.raw)) {
                context.report({
                  node,
                  message: 'Hexadecimal literals must be uppercase.',
                  fix(fixer) {
                    return fixer.replaceText(node, node.raw.toUpperCase());
                  },
                });
              }
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'tests/**', 'src/tests/**', '**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier: prettier,
      'custom-rules': customRulesPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'custom-rules/uppercase-hex': 'error',
    },
  },
  {
    files: [
      'src/utils/bleConstants.ts',
      'src/utils/logParser.ts',
      'src/utils/packetParser.test.ts',
      'src/tests/**/*.test.ts',
      'src/ble/adapter/SimulatedBluetoothAdapter.ts',
      'src/ble/simulator/BoksSimulator.ts',
      'src/pages/DfuUpdatePage.tsx',
    ],
    rules: {
      'prettier/prettier': 'off',
    },
  },
  eslintConfigPrettier
);
