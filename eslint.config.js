import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**', '*.local', '**/*.d.ts', '.venv/**', 'cloudflare/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
    rules: {
      // 项目约定：放宽以下规则
      'vue/multi-word-component-names': 'off', // 组件名无需强制多词
      '@typescript-eslint/no-explicit-any': 'off', // 后端返回结构使用 any 便捷
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/no-v-html': 'off',
      'no-unused-vars': 'off',
    },
  },
  prettier
)
