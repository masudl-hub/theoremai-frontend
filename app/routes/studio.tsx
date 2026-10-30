import { COOKBOOK_IDS, COOKBOOKS, type CookbookId } from '@theoremjs/studio';
import { openStudio } from '@theoremjs/studio/ui/lib/studio-open.ts';
import type { ProjectSession } from '@theoremjs/studio/ui/lib/studio-project.ts';
import type { StudioHost, StudioOpened } from '@theoremjs/studio/ui/studio-host.ts';
import { StudioScreen } from '@theoremjs/studio/ui/studio-screen.tsx';
import { useOutletContext } from 'react-router';
import { PageJsonLd } from '../components/page-summary';
import { isStudioSeed } from '../lib/docs/schema';
import { docsSeedDraft, docsSeedQuestion } from '../lib/docs/seeds';
import { takeHomeAgent } from '../lib/home-agent-handoff';
import { SITE_NAME } from '../lib/home-content';
import { KERNEL_PACKAGE_VERSION } from '../lib/kernel-version';
import { STUDIO_TITLE, studioDescription } from '../lib/studio-content';
import { SITE_SUPPLIES } from '../lib/studio-supplies';
import { reportTh30Studio } from '../lib/th30-studio-state';
import { th30Surfaces } from '../lib/th30-surfaces';
import type { Route } from './+types/studio';
import type { ShellHandle, loader as shellLoader } from './shell';

export const handle = { isOnBase: true } satisfies ShellHandle;

export function meta({ matches }: Route.MetaArgs) {
	const shell = matches.find((match) => match?.id === 'routes/shell')?.loaderData as
		| { origin?: string }
		| undefined;
	const origin = shell?.origin;
	const title = `${STUDIO_TITLE} · ${SITE_NAME}`;
	const description = studioDescription();
	return [
		{ title },
		{ name: 'description', content: description },
		...(origin ? [{ tagName: 'link', rel: 'canonical', href: `${origin}/studio` }] : []),
		{ property: 'og:type', content: 'website' },
		{ property: 'og:site_name', content: SITE_NAME },
		...(origin ? [{ property: 'og:url', content: `${origin}/studio` }] : []),
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ name: 'twitter:card', content: 'summary' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description },
	];
}

function isCookbookId(value: string | null): value is CookbookId {
	return Boolean(value && (COOKBOOK_IDS as readonly string[]).includes(value));
}

/** The studio opens on this tab's kept draft, unless a cookbook, docs seed, or the home page asks for another. */
export async function clientLoader({ request }: Route.ClientLoaderArgs): Promise<StudioOpened> {
	const params = new URL(request.url).searchParams;
	// The goals screen hands its agent over. The tab's kept draft waits behind Undo, as for a seed.
	const handed = params.get('from') === 'home' ? takeHomeAgent() : undefined;
	if (handed) return openStudio({ workspace: handed, question: undefined });
	const cookbook = params.get('cookbook');
	if (isCookbookId(cookbook)) {
		const entry = COOKBOOKS[cookbook];
		return openStudio({
			workspace: await entry.createWorkspace(),
			question: entry.question,
		});
	}
	const seed = params.get('seed');
	return openStudio(
		isStudioSeed(seed)
			? { draft: docsSeedDraft(seed), question: docsSeedQuestion(seed) }
			: undefined,
	);
}

export function HydrateFallback() {
	return <ShellJsonLd />;
}

/** The studio's structured data, from the shell's loader. */
function ShellJsonLd() {
	const shell = useOutletContext<ReturnType<typeof shellLoader>>();
	return <PageJsonLd data={shell.studioJsonLd} />;
}

/** What the site gives the studio screen: its build's pieces, and th30 following along. */
const HOST: StudioHost = {
	kernelVersion: KERNEL_PACKAGE_VERSION,
	mountSurface: (surface) => th30Surfaces.mount(surface),
	onReport: reportTh30Studio,
	...SITE_SUPPLIES,
};

/** The studio screen from `@theoremjs/studio`, on the site's page. */
export default function Studio({
	loaderData,
}: {
	loaderData: StudioOpened & { project?: ProjectSession };
}) {
	return (
		<>
			<ShellJsonLd />
			<StudioScreen opened={loaderData} host={HOST} />
		</>
	);
}
