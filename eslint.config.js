import js from '@eslint/js';
import { loadConfig } from '@sveltejs/load-config';
import eslintConfigPrettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

const loaded = await loadConfig(import.meta.dirname, { traverse: false });
const svelteConfig = {
	...(loaded?.config ?? {}),
	compilerOptions: {
		...(loaded?.config?.compilerOptions ?? {}),
		runes: true,
	},
};

const tsFiles = ['src/**/*.ts'];
const svelteFiles = ['src/**/*.svelte', 'src/**/*.svelte.ts', 'src/**/*.svelte.js'];
const cursorHookFiles = ['.cursor/hooks/**/*.mjs'];

function scopeSvelteConfigs(configs) {
	return configs.map((entry) => ({
		...entry,
		files: entry.files ?? svelteFiles,
	}));
}

/** Semantic + a11y at error. Formatting delegated to Biome. */
const svelteHardRules = {
	'svelte/no-export-load-in-svelte-module-in-kit-pages': 'error',
	'svelte/no-goto-without-base': 'error',
	// Superseded by no-navigation-without-resolve (resolve() from $app/paths).
	'svelte/no-navigation-without-base': 'off',
	'svelte/no-navigation-without-resolve': 'error',
	'svelte/prefer-writable-derived': 'error',
	// Biome owns attribute order; enabling both fights on every save.
	'svelte/sort-attributes': 'off',
	'svelte/no-inline-styles': 'error',
	'svelte/require-optimized-style-attribute': 'error',
	'svelte/valid-compile': 'error',
	'svelte/valid-prop-names-in-kit-pages': 'error',
	'svelte/valid-style-parse': 'error',
	'svelte/block-lang': [
		'error',
		{
			enforceScriptPresent: false,
			enforceStylePresent: false,
			script: ['ts', null],
			style: ['css', 'postcss', null],
		},
	],
	// Tailwind utilities live in global CSS, not component <style> blocks.
	'svelte/no-unused-class-name': 'off',
	// Scoped CSS intentionally uses class selectors over :global().
	'svelte/consistent-selector-style': 'off',
	'svelte/@typescript-eslint/no-unnecessary-condition': 'off',
	'no-unused-vars': 'off',
};

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
			'**/.svelte-kit/**',
			'**/.output/**',
			'**/build/**',
			'**/coverage/**',
			'**/.fallow/**',
			'**/.wrangler/**',
			'scripts/**',
			'theorum/**',
			'vite.config.ts',
			'src/app.d.ts',
		],
	},
	js.configs.recommended,
	...scopeSvelteConfigs(svelte.configs.all),
	...scopeSvelteConfigs(svelte.configs.prettier),
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
	{
		files: svelteFiles,
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig,
			},
		},
		settings: {
			svelte: {
				kit: {
					files: {
						routes: 'src/routes',
					},
				},
				ignoreWarnings: [
					'@typescript-eslint/no-unsafe-assignment',
					'@typescript-eslint/no-unsafe-member-access',
					'@typescript-eslint/no-unsafe-call',
					'@typescript-eslint/no-unsafe-argument',
					'@typescript-eslint/no-unsafe-return',
					'@typescript-eslint/no-deprecated',
					'@typescript-eslint/no-floating-promises',
					'@typescript-eslint/no-unnecessary-condition',
					'svelte/@typescript-eslint/no-unnecessary-condition',
					'@typescript-eslint/no-unnecessary-type-assertion',
				],
			},
		},
		rules: svelteHardRules,
	},
);
