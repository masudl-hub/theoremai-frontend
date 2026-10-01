import { data, redirect } from 'react-router';
import { DocsNotFound } from '../components/docs/not-found';
import { DocsReader } from '../components/docs/reader';
import { getDocIndex } from '../lib/docs/.server/load-index';
import { articleJsonLd } from '../lib/docs/machine';
import { blockHeading } from '../lib/docs/project-text';
import type { Th30PageHandle } from '../lib/th30-page';
import type { Route } from './+types/docs.$slug';

export const handle = {
	th30Page: (data: Route.ComponentProps['loaderData'], hash: string) => {
		if (!data.ok) {
			return { title: 'Not found', summary: `There is no docs chapter called '${data.slug}'.` };
		}
		const id = decodeURIComponent(hash.replace(/^#/, ''));
		const block = id ? data.article.blocks.find((candidate) => candidate.id === id) : undefined;
		return {
			title: data.article.title,
			summary: data.article.summary,
			viewing: block ? blockHeading(block) : undefined,
		};
	},
} satisfies Th30PageHandle;

export function loader({ params, request }: Route.LoaderArgs) {
	const index = getDocIndex();
	const article = index.bySlug[params.slug];
	if (article === undefined) {
		const retired = index.redirects.find((item) => item.from === `/docs/${params.slug}`);
		if (retired) return redirect(retired.to);
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
		{ property: 'og:image', content: article.cover.src },
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
