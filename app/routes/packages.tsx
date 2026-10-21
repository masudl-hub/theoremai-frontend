import { redirect } from 'react-router';

/** The packages are a screen on the landing page. */
export function loader() {
	return redirect('/#packages');
}

export default function PackagesRedirect() {
	return null;
}
