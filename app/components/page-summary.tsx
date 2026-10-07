/**
 * What a part of the page says, as data beside the copy it describes. It is built from the
 * same constants that render the page, so it changes when the page does. It ships in the
 * server-rendered HTML for crawlers and answer engines, and th30 reads it from the DOM.
 */
export function PageSummary({ name, text }: { name?: string; text: string }) {
	const json = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebPageElement',
		...(name ? { name } : {}),
		description: text,
	}).replaceAll('<', '\\u003c');
	return (
		<script type="application/ld+json" data-page-summary="">
			{json}
		</script>
	);
}
