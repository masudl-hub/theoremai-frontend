/**
 * The headers every response of the site carries, in one table. The Worker sets them on what it
 * answers; `public/_headers` repeats them for the static files, and a test holds it to this table.
 *
 * - A browser never guesses a response's type, and sends other sites the origin alone.
 * - Only the site's own pages may frame it, post a form to it or set its base address.
 * - A browser that reached the site over HTTPS stays on HTTPS for a year.
 * - A window the site opens (a tool's sign-in) keeps its opener; any other window gets none.
 *
 * It names no script or style sources: the pages write both inline, so that rule needs a nonce
 * on every one of them, and is not here.
 */
export const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'SAMEORIGIN',
	'Content-Security-Policy':
		"frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
	'Strict-Transport-Security': 'max-age=31536000',
	'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
} as const;

/** `response` with the site's headers; one a route set itself stays as the route set it. */
export function withSecurityHeaders(response: Response): Response {
	// A socket's 101 carries no page, and its headers are the upgrade's own.
	if (response.status === 101) return response;
	const secured = new Response(response.body, response);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!secured.headers.has(name)) secured.headers.set(name, value);
	}
	return secured;
}
