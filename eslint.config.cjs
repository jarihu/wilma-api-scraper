// Flat-config for ESLint v9 using TypeScript parser and plugin
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');
const nodePlugin = require('eslint-plugin-node');
const promisePlugin = require('eslint-plugin-promise');

// Merge recommended rules from the TypeScript plugin
const tsRecommended = (tsPlugin.configs && tsPlugin.configs.recommended && tsPlugin.configs.recommended.rules) || {};
// Do not automatically enable the "recommended-requiring-type-checking" rules
// because they are very strict and require extensive typing updates across
// the codebase. They'll be left out to avoid a large refactor.
const tsRecommendedType = {};

module.exports = [
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			parser: require('@typescript-eslint/parser'),
			parserOptions: {
				project: './tsconfig.json'
			}
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			import: importPlugin,
			node: nodePlugin,
			promise: promisePlugin
		},
		rules: {
			// include recommended @typescript-eslint rules first
			...tsRecommended,

			// Turn off several very strict rules that demand removing `any` usage
			// across the codebase immediately. These can be enabled gradually.
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-explicit-any': 'off',

			// Allow unused variables that start with underscore (common convention)
			// Use 'warn' to avoid failing the lint step for existing codebase.
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

			// project-specific overrides
			'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
			'no-unused-vars': 'off',
			'no-var': 'error',
			'prefer-const': 'error',
			'eqeqeq': ['error', 'always']
		},
		linterOptions: {
			reportUnusedDisableDirectives: true
		}
	},
	{
		files: ['test/**/*.ts'],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: 'module',
			parser: require('@typescript-eslint/parser'),
			parserOptions: {
				project: null
			}
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'no-var': 'error',
			'prefer-const': 'error',
			'eqeqeq': ['error', 'always']
		}
	}
];
