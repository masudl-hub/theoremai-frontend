let articleEnterTimer = 0;

function releaseArticleEnter(): void {
	document.querySelector<HTMLElement>('.docs-reader')?.style.removeProperty('view-transition-name');
}

/**
 * Name the reader for one article change so the new pane can slide in from
 * above. The name has to come off afterwards: while it is on the scroller,
 * `scrollIntoView` does not move it, and that is how the outline scrolls.
 */
export function holdDocsArticleTransition(): void {
	document
		.querySelector<HTMLElement>('.docs-reader')
		?.style.setProperty('view-transition-name', 'docs-article');
	window.clearTimeout(articleEnterTimer);
	articleEnterTimer = window.setTimeout(releaseArticleEnter, 400);
}
