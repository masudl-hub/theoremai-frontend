import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRONTEND_ROOT, resolveTheorumRoot } from './resolve-theorum-root.mjs';

const frontendRoot = FRONTEND_ROOT;
const { root, source } = resolveTheorumRoot(frontendRoot);
const markerPath = path.join(frontendRoot, '.theorum-root');
const nodeModulesTheorum = path.join(frontendRoot, 'node_modules/theorum');

writeFileSync(markerPath, `${root}\n`, 'utf8');

if (existsSync(nodeModulesTheorum)) {
	const stat = lstatSync(nodeModulesTheorum);
	if (stat.isSymbolicLink()) {
		rmSync(nodeModulesTheorum);
	} else if (stat.isDirectory()) {
		rmSync(nodeModulesTheorum, { recursive: true, force: true });
	} else {
		rmSync(nodeModulesTheorum, { force: true });
	}
}

mkdirSync(path.dirname(nodeModulesTheorum), { recursive: true });
symlinkSync(root, nodeModulesTheorum, 'dir');

console.log(`theorum → ${root} (${source})`);
