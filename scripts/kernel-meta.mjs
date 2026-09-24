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
 * Vite `define` entries for the kernel the site is built against.
 * @param {{ root: string, source: string }} theoremai
 * @returns {Record<string, string>}
 */
export function kernelMetaDefine(theoremai) {
	return {
		'import.meta.env.KERNEL_SUBMODULE_HEAD': JSON.stringify(kernelSubmoduleHead(theoremai.root)),
		'import.meta.env.KERNEL_PACKAGE_VERSION': JSON.stringify(kernelPackageVersion(theoremai.root)),
		'import.meta.env.KERNEL_SOURCE': JSON.stringify(theoremai.source),
	};
}
