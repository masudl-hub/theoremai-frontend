import { kernelInfo } from '$lib/server/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => kernelInfo();
