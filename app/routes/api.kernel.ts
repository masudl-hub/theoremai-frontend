import { kernelInfo } from '../lib/.server/api';

export function loader() {
	return kernelInfo();
}
