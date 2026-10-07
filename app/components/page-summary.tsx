/**
 * A page's structured data, rendered in the server HTML where crawlers and answer engines read
 * it. th30 reads the same script from the DOM, so what it knows of a page is what the page
 * tells search. Build `data` from the constants that render the page, never from a copy.
 */
export function PageJsonLd({ data }: { data: Record<string, unknown> }) {
	return (
		<script type="application/ld+json" data-page-summary="">
			{JSON.stringify(data).replaceAll('<', '\\u003c')}
		</script>
	);
}
