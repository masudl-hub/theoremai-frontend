import { json } from '@sveltejs/kit';
import { getKernelPackageVersion, getSubmoduleHead } from '$lib/server/theorum';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return json({
		version: getKernelPackageVersion(),
		submoduleHead: getSubmoduleHead(),
	});
};
