import { data, redirect } from 'react-router';
import { DocsNotFound } from '../components/docs/not-found';
import { DocsReader } from '../components/docs/reader';
import { PageJsonLd } from '../components/page-summary';
import { getDocIndex } from '../lib/docs/.server/load-index';
import { articleJsonLd } from '../lib/docs/machine';
import { SITE_NAME } from '../lib/home-content';
import type { Route } from './+types/docs.$slug';

export function loader({ params, request }: Route.LoaderArgs) {
	const index = getDocIndex();
	const article = index.bySlug[params.slug];
	if (article === undefined) {
		const retired = index.redirects.find((item) => item.from === `/docs/${params.slug}`);
		if (retired) return redirect(retired.to);
		return data({ ok: false as const, index, slug: params.slug }, { status: 404 });
	}
	const origin = new URL(request.url).origin;
	return { ok: true as const, index, article, origin, jsonLd: articleJsonLd(article, origin) };
}

export function headers() {
	return { 'Cache-Control': 'no-cache, must-revalidate' };
}

export function meta({ loaderData }: Route.MetaArgs) {
	if (!loaderData.ok) {
		return [{ title: 'Not found · theorem docs' }, { name: 'robots', content: 'noindex' }];
	}
	const { article, origin } = loaderData;
	const image = `${origin}${article.cover.src}`;
	return [
		{ title: `${article.title} · theorem docs` },
		{ name: 'description', content: article.summary },
		{ property: 'og:title', content: `${article.title} · theorem docs` },
		{ property: 'og:description', content: article.summary },
		{ property: 'og:type', content: 'article' },
		{ property: 'og:site_name', content: SITE_NAME },
		{ property: 'og:url', content: `${origin}${article.canonicalPath}` },
		{ property: 'og:image', content: image },
		{ property: 'og:image:alt', content: article.cover.alt },
		{ property: 'article:modified_time', content: article.dateModified },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: `${article.title} · theorem docs` },
		{ name: 'twitter:description', content: article.summary },
		{ name: 'twitter:image', content: image },
		{ tagName: 'link', rel: 'canonical', href: `${origin}${article.canonicalPath}` },
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
			<PageJsonLd data={loaderData.jsonLd} />
			<DocsReader index={loaderData.index} article={loaderData.article} />
		</>
	);
}
