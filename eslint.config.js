import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';

const tsFiles = ['app/**/*.ts', 'app/**/*.tsx', 'workers/**/*.ts'];
const cursorHookFiles = ['.cursor/hooks/**/*.mjs'];

const tsHardRules = {
	'@typescript-eslint/no-explicit-any': 'error',
	'@typescript-eslint/no-non-null-assertion': 'error',
	'@typescript-eslint/no-unnecessary-condition': 'error',
	'@typescript-eslint/no-unnecessary-type-assertion': 'error',
	'@typescript-eslint/require-await': 'error',
	'@typescript-eslint/no-unsafe-assignment': 'error',
	'@typescript-eslint/no-unsafe-member-access': 'error',
	'@typescript-eslint/no-unsafe-argument': 'error',
	'@typescript-eslint/no-unsafe-return': 'error',
	'@typescript-eslint/no-unsafe-call': 'error',
	'@typescript-eslint/no-deprecated': 'error',
	'@typescript-eslint/no-floating-promises': 'error',
	'@typescript-eslint/restrict-template-expressions': 'error',
	'@typescript-eslint/no-unused-vars': [
		'error',
		{
			argsIgnorePattern: '^_',
			varsIgnorePattern: '^_',
			caughtErrorsIgnorePattern: '^_',
		},
	],
};

export default ts.config(
	{
		ignores: [
			'**/node_modules/**',
			'**/.react-router/**',
			'**/build/**',
			'**/coverage/**',
			'**/.fallow/**',
			'**/.wrangler/**',
			'app/built/**',
			'scripts/**',
			'vite.config.ts',
			'react-router.config.ts',
		],
	},
	js.configs.recommended,
	eslintConfigPrettier,
	{
		files: cursorHookFiles,
		languageOptions: {
			globals: {
				...globals.node,
			},
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
	...ts.configs.strictTypeChecked.map((config) => ({
		...config,
		files: tsFiles,
	})),
	{
		files: tsFiles,
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: tsHardRules,
	},
);
