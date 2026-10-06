import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportCommitted, linkInstalled, mirrorInstalled } from '../scripts/committed-copy.mjs';

async function git(repo: string, ...args: string[]) {
	const done = await new Deno.Command('git', {
		args: ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args],
	}).output();
	assert.equal(done.success, true, new TextDecoder().decode(done.stderr));
}

async function exists(file: string) {
	return await Deno.stat(file).then(
		() => true,
		() => false,
	);
}

test('a committed copy holds the last commit: no uncommitted edit, no untracked file', async () => {
	const work = await Deno.makeTempDir();
	try {
		const repo = `${work}/repo`;
		await Deno.mkdir(`${repo}/src`, { recursive: true });
		await Deno.mkdir(`${repo}/node_modules/dep`, { recursive: true });
		await Deno.mkdir(`${repo}/src/node_modules/inner`, { recursive: true });
		await Deno.writeTextFile(`${repo}/.gitignore`, 'node_modules\n');
		await Deno.writeTextFile(`${repo}/src/a.txt`, 'committed');
		await git(repo, 'init', '-q');
		await git(repo, 'add', '.');
		await git(repo, 'commit', '-q', '-m', 'one');
		await Deno.writeTextFile(`${repo}/src/a.txt`, 'in progress');
		await Deno.writeTextFile(`${repo}/src/new.txt`, 'untracked');

		const copy = `${work}/copy`;
		const commit = exportCommitted(repo, copy);
		assert.equal(/^[0-9a-f]{7,}$/.test(commit), true);
		assert.equal(await Deno.readTextFile(`${copy}/src/a.txt`), 'committed');
		assert.equal(await exists(`${copy}/src/new.txt`), false);
		assert.equal(await exists(`${copy}/node_modules`), false);

		linkInstalled(repo, copy);
		assert.equal(await exists(`${copy}/node_modules/dep`), true);
		assert.equal(await exists(`${copy}/src/node_modules/inner`), true);
	} finally {
		await Deno.remove(work, { recursive: true });
	}
});

test('a mirrored install links every package but the ones the copy fills itself', async () => {
	const work = await Deno.makeTempDir();
	try {
		await Deno.mkdir(`${work}/checkout/node_modules/dep`, { recursive: true });
		await Deno.mkdir(`${work}/checkout/node_modules/@theoremjs/agents`, { recursive: true });
		await Deno.mkdir(`${work}/copy`);
		mirrorInstalled(`${work}/checkout`, `${work}/copy`, ['@theoremjs']);
		assert.equal(await exists(`${work}/copy/node_modules/dep`), true);
		assert.equal(await exists(`${work}/copy/node_modules/@theoremjs`), false);
		assert.equal((await Deno.lstat(`${work}/copy/node_modules`)).isSymlink, false);
	} finally {
		await Deno.remove(work, { recursive: true });
	}
});
