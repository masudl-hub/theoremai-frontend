import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getKernelPackageVersion, getSubmoduleHead } from '$lib/server/theorum';

export const GET: RequestHandler = async () => {
	return json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead()
	});
};
