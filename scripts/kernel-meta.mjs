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
 * A type's own description, read at build time so its hover card follows the kernel.
 * @param {string} theoremaiRoot
 * @param {string} file
 * @param {string} name
 */
function kernelTypeDoc(theoremaiRoot, file, name) {
	const source = readFileSync(path.join(theoremaiRoot, file), 'utf8');
	const match = source.match(new RegExp(String.raw`/\*\*((?:(?!\*/)[\s\S])*)\*/\s*(?:export )?type ${name} =`));
	if (!match) throw new Error(`The kernel ${name} type needs a documentation comment.`);
	return match[1].split('\n').map((line) => line.replace(/^\s*\* ?/, '').trim()).join(' ').trim();
}

/** Each package the install switch cycles through, in its order, and the README that says how to install it. */
const INSTALL_READMES = [
	['agents', 'README.md'],
	['web', 'web/README.md'],
	['react', 'react/README.md'],
	['studio', 'studio/README.md'],
];

/**
 * The first `npm install` line in each package's README that names the package, read at build
 * time so the site's install switch says what the README says.
 * @param {string} theoremaiRoot
 * @returns {Record<string, string>}
 */
function kernelInstallCommands(theoremaiRoot) {
	return Object.fromEntries(
		INSTALL_READMES.map(([id, readme]) => {
			const text = readFileSync(path.join(theoremaiRoot, readme), 'utf8');
			const line = text.split('\n').find((row) => row.startsWith('npm install ') && row.includes(`@theoremjs/${id}`));
			if (!line) throw new Error(`${readme} needs an npm install line that names @theoremjs/${id}.`);
			return [id, line.trim()];
		}),
	);
}

/**
 * The line each package's README opens with: what the package is, in its own words. The kernel's
 * README centres it in an `<h3>`; the others put it first under the title.
 * @param {string} theoremaiRoot
 * @returns {Record<string, string>}
 */
function kernelPackageLeads(theoremaiRoot) {
	return Object.fromEntries(
		INSTALL_READMES.map(([id, readme]) => {
			const text = readFileSync(path.join(theoremaiRoot, readme), 'utf8');
			const centred = text.match(/<h3[^>]*>\s*([\s\S]*?)\s*<\/h3>/)?.[1];
			const first = text
				.split('\n')
				.map((row) => row.trim())
				.find((row) => row !== '' && !row.startsWith('#') && !row.startsWith('[![') && !row.startsWith('<'));
			const lead = (centred ?? first ?? '').replace(/\s+/g, ' ').trim();
			if (!lead) throw new Error(`${readme} needs a line under its title that says what the package is.`);
			return [id, lead];
		}),
	);
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
		'import.meta.env.KERNEL_PROFILE_DOC': JSON.stringify(kernelTypeDoc(theoremai.root, 'src/kernel/types.ts', 'Profile')),
		'import.meta.env.KERNEL_DETECTOR_DOC': JSON.stringify(kernelTypeDoc(theoremai.root, 'src/guardrails/detectors.ts', 'Detector')),
		'import.meta.env.KERNEL_INSTALL': JSON.stringify(kernelInstallCommands(theoremai.root)),
		'import.meta.env.KERNEL_LEAD': JSON.stringify(kernelPackageLeads(theoremai.root)),
		'import.meta.env.KERNEL_LICENSE': JSON.stringify(facts.license),
		'import.meta.env.KERNEL_REPOSITORY': JSON.stringify(facts.repository),
		'import.meta.env.KERNEL_KEYWORDS': JSON.stringify(facts.keywords),
		'import.meta.env.KERNEL_SUBMODULE_HEAD': JSON.stringify(kernelSubmoduleHead(theoremai.root)),
		'import.meta.env.KERNEL_PACKAGE_VERSION': JSON.stringify(kernelPackageVersion(theoremai.root)),
		'import.meta.env.KERNEL_SOURCE': JSON.stringify(theoremai.source),
	};
}
