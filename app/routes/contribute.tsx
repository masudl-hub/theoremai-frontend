import { redirect } from 'react-router';

/** Contribute is a screen on the landing page. */
export function loader() {
	return redirect('/#contribute');
}

export default function ContributeRedirect() {
	return null;
}
