import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRONTEND_ROOT, resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const frontendRoot = FRONTEND_ROOT;
const { root, source } = resolveTheoremaiRoot(frontendRoot);
const markerPath = path.join(frontendRoot, '.theoremai-root');
const nodeModulesAgents = path.join(frontendRoot, 'node_modules/@theoremai/agents');
const legacyNodeModulesTheorum = path.join(frontendRoot, 'node_modules/theorum');

writeFileSync(markerPath, `${root}\n`, 'utf8');

if (existsSync(legacyNodeModulesTheorum)) {
	rmSync(legacyNodeModulesTheorum, { recursive: true, force: true });
}

if (existsSync(nodeModulesAgents)) {
	const stat = lstatSync(nodeModulesAgents);
	if (stat.isSymbolicLink()) {
		rmSync(nodeModulesAgents);
	} else if (stat.isDirectory()) {
		rmSync(nodeModulesAgents, { recursive: true, force: true });
	} else {
		rmSync(nodeModulesAgents, { force: true });
	}
}

mkdirSync(path.dirname(nodeModulesAgents), { recursive: true });
symlinkSync(root, nodeModulesAgents, 'dir');
console.log(`@theoremai/agents → ${root} (${source})`);

// file: deps are pinned to the sibling path; follow the resolved root instead.
for (const pkg of ['react', 'playground']) {
	const link = path.join(frontendRoot, 'node_modules/@theoremai', pkg);
	if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false })) rmSync(link, { recursive: true, force: true });
	symlinkSync(path.join(root, pkg), link, 'dir');
	console.log(`@theoremai/${pkg} → ${path.join(root, pkg)}`);
}
