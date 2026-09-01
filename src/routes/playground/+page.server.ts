import type { PageServerLoad } from './$types';
import { getKernelPackageVersion, getSubmoduleHead } from '$lib/server/theorum';

export const load: PageServerLoad = async () => {
	return {
		kernel: {
			version: getKernelPackageVersion(),
			submoduleHead: getSubmoduleHead()
		}
	};
};
