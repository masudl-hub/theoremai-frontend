import { redirect } from 'react-router';

/** Examples alias the cookbook screen on the landing page. */
export function loader() {
	return redirect('/#cookbook');
}

export default function ExamplesRedirect() {
	return null;
}
