/**
 * A path thirty may open. Pages of this site only: a leading slash, no other origin.
 */

const PAGES = new Set(['/', '/overview', '/examples', '/playground', '/playground/run', '/docs']);

export type SitePath =
	| { ok: true; href: string; hash: string | undefined }
	| { ok: false; error: string };

/** `knownDocsSlug` checks `/docs/<slug>` against the index. Without it, any one-segment chapter is allowed. */
export function resolveSitePath(to: string, knownDocsSlug?: (slug: string) => boolean): SitePath {
	const trimmed = to.trim();
	if (
		!trimmed ||
		trimmed.includes('://') ||
		trimmed.startsWith('//') ||
		trimmed.includes('\\') ||
		trimmed.split('/').includes('..')
	) {
		return { ok: false, error: 'Give a path on this site, like /playground or /docs/start.' };
	}
	const hashAt = trimmed.indexOf('#');
	const pathPart = hashAt === -1 ? trimmed : trimmed.slice(0, hashAt);
	const rawHash = hashAt === -1 ? '' : trimmed.slice(hashAt + 1);
	let hash: string | undefined;
	if (rawHash) {
		try {
			hash = decodeURIComponent(rawHash);
		} catch {
			return { ok: false, error: 'That hash is not a valid target.' };
		}
	}
	let path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
	if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
	if (!PAGES.has(path)) {
		const docs = /^\/docs\/([^/]+)$/.exec(path);
		if (!docs) return { ok: false, error: 'That is not a page on this site.' };
		let slug: string;
		try {
			slug = decodeURIComponent(docs[1] ?? '');
		} catch {
			return { ok: false, error: 'That docs path is not valid.' };
		}
		if (knownDocsSlug && !knownDocsSlug(slug)) {
			return { ok: false, error: `No docs chapter "${slug}".` };
		}
		path = `/docs/${slug}`;
	}
	return { ok: true, href: hash ? `${path}#${hash}` : path, hash };
}
