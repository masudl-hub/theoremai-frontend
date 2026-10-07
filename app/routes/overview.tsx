import { redirect } from 'react-router';

/** Overview is a screen on the landing page. */
export function loader() {
	return redirect('/#overview');
}

export default function OverviewRedirect() {
	return null;
}
