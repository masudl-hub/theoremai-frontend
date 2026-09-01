/**
 * Server-only THEORUM imports. Keep kernel usage out of client components.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export {
	createProvider,
	defineProfile,
	getProfile,
	registerProfile,
	runTurn,
	type TurnEvent,
	type TurnStop
} from '@theorum/core';

const theorumRoot = path.resolve(process.cwd(), 'theorum');

export function readKernelContract(relativePath: string): string {
	return readFileSync(path.join(theorumRoot, relativePath), 'utf8');
}

export function getSubmoduleHead(): string | null {
	try {
		return execSync('git -C theorum rev-parse --short HEAD', { encoding: 'utf8' }).trim();
	} catch {
		return null;
	}
}

export function getKernelPackageVersion(): string {
	const denoJson = JSON.parse(readFileSync(path.join(theorumRoot, 'deno.json'), 'utf8')) as {
		version?: string;
		name?: string;
	};
	return denoJson.version ?? 'unknown';
}

/** Short display label for the hero, e.g. `@0.1.14`. */
export function getKernelVersionLabel(): string {
	return `@${getKernelPackageVersion()}`;
}
