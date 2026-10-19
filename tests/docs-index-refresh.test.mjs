import assert from 'node:assert/strict';
import { test } from 'node:test';
import { docsIndexPlugin } from '../scripts/docs-index-plugin.mjs';

test('kernel catalog changes invalidate docs in every environment and reload loader data', () => {
	const invalidated = [];
	const watched = [];
	const sent = [];
	const environments = Object.fromEntries(['client', 'ssr'].map((name) => [name, {
		hot: { send: (message) => sent.push([name, message]) },
		moduleGraph: {
			getModuleById: (id) => ({ id }),
			invalidateModule: (module) => invalidated.push([name, module.id]),
		},
	}]));
	const plugin = docsIndexPlugin({ repoRoot: '/site', theoremai: { root: '/kernel', source: 'local' } });
	const config = { configFileDependencies: [] };
	plugin.configureServer({ config, environments, watcher: { add: (paths) => watched.push(...paths) } });
	const modules = [{ id: 'schema' }];
	assert.equal(plugin.handleHotUpdate({ file: '/kernel/src/kernel/schema.ts', modules }), modules);
	assert.deepEqual(config.configFileDependencies, ['/kernel/src/kernel/types.ts', '/kernel/src/guardrails/detectors.ts']);
	assert.deepEqual(watched, ['/site/app/lib/docs', '/kernel/src']);
	assert.equal(invalidated.length, 4);
	assert.deepEqual(sent, [['client', { type: 'full-reload' }], ['ssr', { type: 'full-reload' }]]);
	plugin.handleHotUpdate({ file: '/site/app/components/home-stage.tsx', modules });
	assert.equal(sent.length, 2);
});
