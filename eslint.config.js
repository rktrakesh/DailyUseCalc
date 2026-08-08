import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
	...astro.configs['flat/recommended'],
	{
		files: ['**/*.astro'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
	...tseslint.configs.recommended.map((config) => ({
		...config,
		files: ['**/*.{ts,tsx}', '**/*.astro/**/*.ts'],
	})),
	{
		ignores: ['dist/', 'node_modules/', '.astro/', '.agents/'],
	},
];
