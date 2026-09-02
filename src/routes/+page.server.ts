import { getKernelVersionLabel, getSubmoduleHead } from '$lib/server/theorum';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		kernel: {
			versionLabel: getKernelVersionLabel(),
			submoduleHead: getSubmoduleHead(),
		},
	};
};
