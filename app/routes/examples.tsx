import { redirect } from 'react-router';

/** Showcase is a screen on the landing page. */
export function loader() {
	return redirect('/#showcase');
}

export default function ExamplesRedirect() {
	return null;
}
