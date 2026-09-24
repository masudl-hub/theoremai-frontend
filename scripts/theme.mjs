/**
 * Builds (or with `--check`, verifies) the site theme's committed CSS and module
 * in app/built/ from app/theme.ts.
 *
 * Runs the Astryx CLI that @theoremai/react pins for its own theme. The site
 * cannot install the CLI itself: it declares `gpt-tokenizer@^3` as a required
 * peer, and the kernel needs `^4`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { FRONTEND_ROOT, resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const { root } = resolveTheoremaiRoot(FRONTEND_ROOT);
const cli = path.join(root, 'react/node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs');
if (!existsSync(cli)) {
	console.error(`Astryx CLI not found at ${cli}. Run \`npm --prefix ${path.join(root, 'react')} install\`.`);
	process.exit(1);
}

const args = [
	cli,
	'theme',
	'build',
	'app/theme.ts',
	'-o',
	'app/built/theme.css',
	'--icons-specifier',
	'@theoremai/react/ui/icons',
	...process.argv.slice(2),
];
const { status } = spawnSync(process.execPath, args, { cwd: FRONTEND_ROOT, stdio: 'inherit' });
process.exit(status ?? 1);
