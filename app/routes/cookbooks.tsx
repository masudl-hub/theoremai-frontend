import { redirect } from 'react-router';

/** Cookbooks alias the cookbook screen on the landing page. */
export function loader() {
	return redirect('/#cookbook');
}

export default function CookbooksRedirect() {
	return null;
}
