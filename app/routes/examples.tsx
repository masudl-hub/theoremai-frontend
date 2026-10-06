import { redirect } from 'react-router';

/** The showcase is a panel on the home page. */
export function loader() {
	return redirect('/#examples');
}

export default function ExamplesRedirect() {
	return null;
}
