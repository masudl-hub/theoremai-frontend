import { getKernelPackageVersion, getSubmoduleHead } from '$lib/server/theorum';
import type { KernelMeta } from '$lib/types/playground';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (): { kernel: KernelMeta } => {
	return {
		kernel: {
			version: getKernelPackageVersion(),
			submoduleHead: getSubmoduleHead(),
		},
	};
};
