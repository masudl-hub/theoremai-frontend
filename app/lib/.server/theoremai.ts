/**
 * Server-only kernel metadata for site routes (version label, kernel HEAD).
 * Live relay and Th30 import `theorem` package subpaths directly — no re-export barrel.
 */

import { KERNEL_PACKAGE_VERSION } from '../kernel-version';

const envHead = import.meta.env.KERNEL_SUBMODULE_HEAD as string | boolean | undefined;
const kernelSubmoduleHead = typeof envHead === 'string' && envHead.length > 0 ? envHead : null;

export function getSubmoduleHead(): string | null {
	return kernelSubmoduleHead;
}

export function getKernelPackageVersion(): string {
	return KERNEL_PACKAGE_VERSION;
}
