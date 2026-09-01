import type { PageServerLoad } from './$types';
import { getKernelVersionLabel, getSubmoduleHead } from '$lib/server/theorum';

export const load: PageServerLoad = async () => {
	return {
		kernel: {
			versionLabel: getKernelVersionLabel(),
			submoduleHead: getSubmoduleHead()
		}
	};
};
