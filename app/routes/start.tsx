import { redirect } from 'react-router';

/** Get started is a screen on the landing page. */
export function loader() {
	return redirect('/#start');
}

export default function StartRedirect() {
	return null;
}
