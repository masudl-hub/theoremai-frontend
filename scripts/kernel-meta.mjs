/**
 * Build-time kernel metadata shared by the site's Vite configs: the kernel
 * checkout's short HEAD and `deno.json` version, exposed as `import.meta.env`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** @param {string} theoremaiRoot */
function kernelSubmoduleHead(theoremaiRoot) {
	try {
		return execFileSync('git', ['-C', theoremaiRoot, 'rev-parse', '--short', 'HEAD'], {
			encoding: 'utf8',
		}).trim();
	} catch {
		return '';
	}
}

/** @param {string} theoremaiRoot */
function kernelPackageVersion(theoremaiRoot) {
	try {
		/** @type {{ version?: string }} */
		const denoJson = JSON.parse(readFileSync(path.join(theoremaiRoot, 'deno.json'), 'utf8'));
		return denoJson.version ?? '1.0.0';
	} catch {
		return '1.0.0';
	}
}

/**
 * The kernel's `package.json` facts the site states about it: description, license,
 * repository and keywords. Read at build time, so the site can't drift from the package.
 * @param {string} theoremaiRoot
 */
function kernelPackageFacts(theoremaiRoot) {
	try {
		/** @type {{ description?: string, license?: string, repository?: { url?: string }, keywords?: string[] }} */
		const pkg = JSON.parse(readFileSync(path.join(theoremaiRoot, 'package.json'), 'utf8'));
		return {
			description: pkg.description ?? '',
			license: pkg.license ?? '',
			repository: (pkg.repository?.url ?? '').replace(/\.git$/, ''),
			keywords: pkg.keywords ?? [],
		};
	} catch {
		return { description: '', license: '', repository: '', keywords: [] };
	}
}

/**
 * Vite `define` entries for the kernel the site is built against.
 * @param {{ root: string, source: string }} theoremai
 * @returns {Record<string, string>}
 */
export function kernelMetaDefine(theoremai) {
	const facts = kernelPackageFacts(theoremai.root);
	return {
		'import.meta.env.KERNEL_DESCRIPTION': JSON.stringify(facts.description),
		'import.meta.env.KERNEL_LICENSE': JSON.stringify(facts.license),
		'import.meta.env.KERNEL_REPOSITORY': JSON.stringify(facts.repository),
		'import.meta.env.KERNEL_KEYWORDS': JSON.stringify(facts.keywords),
		'import.meta.env.KERNEL_SUBMODULE_HEAD': JSON.stringify(kernelSubmoduleHead(theoremai.root)),
		'import.meta.env.KERNEL_PACKAGE_VERSION': JSON.stringify(kernelPackageVersion(theoremai.root)),
		'import.meta.env.KERNEL_SOURCE': JSON.stringify(theoremai.source),
	};
}
