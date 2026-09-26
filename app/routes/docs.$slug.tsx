import { data } from 'react-router';
import { DocsNotFound } from '../components/docs/not-found';
import { DocsReader } from '../components/docs/reader';
import { getDocIndex } from '../lib/docs/.server/load-index';
import { articleJsonLd } from '../lib/docs/machine';
import type { Route } from './+types/docs.$slug';

export function loader({ params, request }: Route.LoaderArgs) {
	const index = getDocIndex();
	const article = index.bySlug[params.slug];
	if (article === undefined) {
		return data({ ok: false as const, index, slug: params.slug }, { status: 404 });
	}
	const origin = new URL(request.url).origin;
	return { ok: true as const, index, article, jsonLd: articleJsonLd(article, origin) };
}

export function headers() {
	return { 'Cache-Control': 'no-cache, must-revalidate' };
}

export function meta({ loaderData }: Route.MetaArgs) {
	if (!loaderData.ok) {
		return [{ title: 'Not found · Theorem docs' }, { name: 'robots', content: 'noindex' }];
	}
	const { article } = loaderData;
	return [
		{ title: `${article.title} · Theorem docs` },
		{ name: 'description', content: article.summary },
		{ property: 'og:title', content: `${article.title} · Theorem docs` },
		{ property: 'og:description', content: article.summary },
		...(article.cover ? [{ property: 'og:image', content: article.cover.src }] : []),
		{ tagName: 'link', rel: 'canonical', href: article.canonicalPath },
		{
			tagName: 'link',
			rel: 'alternate',
			type: 'text/markdown',
			href: `${article.canonicalPath}.md`,
		},
	];
}

export default function DocsArticlePage({ loaderData }: Route.ComponentProps) {
	if (!loaderData.ok) {
		return <DocsNotFound index={loaderData.index} slug={loaderData.slug} />;
	}
	return (
		<>
			<script type="application/ld+json">{JSON.stringify(loaderData.jsonLd)}</script>
			<DocsReader index={loaderData.index} article={loaderData.article} />
		</>
	);
}
