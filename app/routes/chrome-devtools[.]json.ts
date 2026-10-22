/**
 * why: Chrome's DevTools asks every page's origin for this file to offer a workspace. The site has
 * none to offer, so it answers that there is none, quietly, instead of the router logging a miss.
 */
export function loader() {
	return new Response(null, { status: 404 });
}
