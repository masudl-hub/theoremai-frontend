/**
 * Server-only kernel metadata for site routes (version label, kernel HEAD).
 * Live relay and Th30 import `theorem` package subpaths directly — no re-export barrel.
 */

const envHead = import.meta.env.KERNEL_SUBMODULE_HEAD as string | boolean | undefined;
const kernelSubmoduleHead = typeof envHead === 'string' && envHead.length > 0 ? envHead : null;

const envVersion = import.meta.env.KERNEL_PACKAGE_VERSION as string | boolean | undefined;
const kernelPackageVersion =
	typeof envVersion === 'string' && envVersion.length > 0 ? envVersion : '0.0.0';

export function getSubmoduleHead(): string | null {
	return kernelSubmoduleHead;
}

export function getKernelPackageVersion(): string {
	return kernelPackageVersion;
}

/** Short display label for the hero, e.g. `@0.1.14`. */
export function getKernelVersionLabel(): string {
	return `@${getKernelPackageVersion()}`;
}
