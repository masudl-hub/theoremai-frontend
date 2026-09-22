import { getKernelVersionLabel, getSubmoduleHead } from '$lib/server/theoremai';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		kernel: {
			versionLabel: getKernelVersionLabel(),
			submoduleHead: getSubmoduleHead(),
		},
	};
};
