import { redirect } from 'react-router';

/** Contribute is part of the landing page's get started screen. */
export function loader() {
	return redirect('/#start');
}

export default function ContributeRedirect() {
	return null;
}
