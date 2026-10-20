/**
 * Copies of a checkout as its last commit has it, for a build that must not
 * read work in progress.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, symlinkSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} repo
 * @param {string[]} args
 * @param {import('node:child_process').SpawnSyncOptions} [options]
 */
function git(repo, args, options) {
	const done = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 30, ...options });
	if (done.status !== 0) {
		throw new Error(`git ${args.join(' ')} failed in ${repo}: ${String(done.stderr ?? '')}`);
	}
	return done.stdout;
}

/**
 * Writes the files of `repo`'s HEAD commit to `dest`: no uncommitted edit, no
 * untracked file. Returns the commit's short hash.
 *
 * @param {string} repo
 * @param {string} dest
 */
export function exportCommitted(repo, dest) {
	mkdirSync(dest, { recursive: true });
	const archive = git(repo, ['archive', 'HEAD']);
	const unpacked = spawnSync('tar', ['-x', '-C', dest], { input: archive });
	if (unpacked.status !== 0) throw new Error(`tar failed in ${dest}: ${String(unpacked.stderr)}`);
	return String(git(repo, ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' })).trim();
}

/**
 * Links `to` to the package at `from`. A link that leads back into `checkout` (a workspace's own
 * package) leads to the same place in `copy`, so the copy never builds against the checkout's
 * uncommitted files, nor holds two copies of one package.
 *
 * @param {string} checkout
 * @param {string} copy
 * @param {string} from
 * @param {string} to
 */
function linkPackage(checkout, copy, from, to) {
	const target = realpathSync(from);
	const inside = path.relative(realpathSync(checkout), target);
	const own = lstatSync(from).isSymbolicLink() && !inside.startsWith('..') && !path.isAbsolute(inside);
	symlinkSync(own ? path.join(copy, inside) : target, to, 'dir');
}

/**
 * Gives `copy` the packages installed in `checkout`: each `node_modules` at the
 * checkout's root or one folder down gets a twin in the copy, linking each package.
 *
 * @param {string} checkout
 * @param {string} copy
 */
export function linkInstalled(checkout, copy) {
	const folders = readdirSync(copy, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
	for (const folder of ['', ...folders]) {
		const installed = path.join(checkout, folder, 'node_modules');
		if (!existsSync(installed)) continue;
		const twin = path.join(copy, folder, 'node_modules');
		mkdirSync(twin, { recursive: true });
		for (const name of readdirSync(installed)) {
			const from = path.join(installed, name);
			if (!name.startsWith('@') || lstatSync(from).isSymbolicLink()) {
				linkPackage(checkout, copy, from, path.join(twin, name));
				continue;
			}
			mkdirSync(path.join(twin, name));
			for (const scoped of readdirSync(from)) {
				linkPackage(checkout, copy, path.join(from, scoped), path.join(twin, name, scoped));
			}
		}
	}
}

/**
 * Gives `copy` its own `node_modules` holding a link to each package installed
 * in `checkout`, except the names in `own`, which the copy fills itself.
 *
 * @param {string} checkout
 * @param {string} copy
 * @param {readonly string[]} own
 */
export function mirrorInstalled(checkout, copy, own) {
	const installed = path.join(checkout, 'node_modules');
	const mirror = path.join(copy, 'node_modules');
	mkdirSync(mirror, { recursive: true });
	for (const name of readdirSync(installed)) {
		if (!own.includes(name)) symlinkSync(path.join(installed, name), path.join(mirror, name));
	}
}
