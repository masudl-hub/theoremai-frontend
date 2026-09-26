/**
 * Display labels for in-page heading ids. Tree, reader, and projector share this.
 */

export function headingLabel(id: string): string {
	if (id === 'ui') return 'UI';
	if (id === 't0') return 'T0';
	if (id === 'openrouter') return 'OpenRouter';
	return id
		.split(/[-_]/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** Search / tile label for a fragment. Field paths stay the path; headings title-case. */
export function fragmentLabel(id: string): string {
	if (id.includes('.')) return id;
	const colon = id.lastIndexOf(':');
	const leaf = colon === -1 ? id : id.slice(colon + 1);
	return headingLabel(leaf);
}
