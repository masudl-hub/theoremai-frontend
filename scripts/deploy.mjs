/**
 * Builds the site and deploys the `theorem-site` Worker.
 *
 * With `--committed`, the build reads the last commit of this checkout and of
 * the kernel checkout, from a temporary copy: no uncommitted edit or untracked
 * file in either reaches the deploy. Every other argument goes to
 * `wrangler deploy` (`--dry-run` builds and stops before the upload).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exportCommitted, linkInstalled, mirrorInstalled } from './committed-copy.mjs';
import { FRONTEND_ROOT, resolveTheoremaiRoot } from './resolve-theoremai-root.mjs';

const args = process.argv.slice(2);
const isCommitted = args.includes('--committed');
const wranglerArgs = args.filter((arg) => arg !== '--committed');

/**
 * @param {string} command
 * @param {string[]} commandArgs
 * @param {{ cwd: string, env?: NodeJS.ProcessEnv }} options
 */
function run(command, commandArgs, options) {
	const done = spawnSync(command, commandArgs, { stdio: 'inherit', ...options });
	if (done.status !== 0) throw new Error(`${command} ${commandArgs.join(' ')} failed`);
}

/**
 * @param {string} site
 * @param {NodeJS.ProcessEnv} env
 */
function buildAndDeploy(site, env) {
	run('npm', ['run', 'build'], { cwd: site, env });
	run('npx', ['wrangler', 'deploy', ...wranglerArgs], { cwd: site, env });
}

function deployCommitted() {
	const { root: kernel } = resolveTheoremaiRoot(FRONTEND_ROOT);
	const work = mkdtempSync(path.join(tmpdir(), 'theorem-deploy-'));
	try {
		const site = path.join(work, 'theoremai-frontend');
		const kernelCopy = path.join(work, 'theoremai');
		const siteCommit = exportCommitted(FRONTEND_ROOT, site);
		const kernelCommit = exportCommitted(kernel, kernelCopy);
		linkInstalled(kernel, kernelCopy);
		// The copy links @theoremjs/* to the kernel copy itself, and keeps its own Vite cache.
		mirrorInstalled(FRONTEND_ROOT, site, ['@theoremjs', '.vite', '.cache']);
		console.log(`Deploying committed: site ${siteCommit}, kernel ${kernelCommit}`);
		buildAndDeploy(site, { ...process.env, THEOREMAI_ROOT: kernelCopy });
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}

try {
	if (isCommitted) deployCommitted();
	else buildAndDeploy(FRONTEND_ROOT, process.env);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
