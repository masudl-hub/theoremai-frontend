import { AppShell } from '@astryxdesign/core/AppShell';
import { LinkProvider } from '@astryxdesign/core/Link';
import { useSideNavRenderMode } from '@astryxdesign/core/SideNav';
import { BootMark } from '@theoremjs/studio/ui/boot-mark.tsx';
import {
	captureShape,
	enterShell,
	HOLD_MS,
	holdShell,
	peekShape,
	shellCanMove,
} from '@theoremjs/studio/ui/shell-motion.ts';
import { ShellBounds, StudioRail } from '@theoremjs/studio/ui/studio-shell.tsx';
import {
	Link,
	type LinkProps,
	Outlet,
	type ShouldRevalidateFunctionArgs,
	useLocation,
	useMatches,
	useNavigate,
} from 'react-router';
import { theoremSiteTheme } from '../built/theorem-site';
import '../components/docs/docs.css';
import '../components/page-transition.css';
import '@theoremjs/studio/ui/shell-motion.css';
import '../components/shell.css';
import { holdDocsArticleTransition } from '../components/docs/article-transition';
import { pageOwnsDocsNav } from '../components/docs/shell-slot';
import { shapeAt, shellKindFor, shellKindOfHref } from '../components/shell-motion';
import { NavMark } from '../components/shell-navigation';
import { Th30Provider, Th30Trigger } from '../components/th30-dock';
import { getDocIndex } from '../lib/docs/.server/load-index';
import { PACKAGE_LINKS } from '../lib/home-content';
import { studioJsonLd } from '../lib/studio-content';
import type { Route } from './+types/shell';

/** Route `handle` a page exports to change how the shell frames it. */
export type ShellHandle = {
	/** Put the page on the black base beside the rail instead of in the elevated panel. */
	isOnBase?: boolean;
	/** On a narrow screen the page's own menu takes the shell bar's place. */
	docsOwnsNav?: boolean;
	/** Home landing: full-bleed panel until scroll reveals the rail. */
	homeImmersive?: boolean;
};

function isOnBase(handle: unknown): boolean {
	return typeof handle === 'object' && handle !== null && (handle as ShellHandle).isOnBase === true;
}

function isHomeImmersive(handle: unknown): boolean {
	return (
		typeof handle === 'object' && handle !== null && (handle as ShellHandle).homeImmersive === true
	);
}

/**
 * In-app links between pages of one shape crossfade the page panel; the rail is not part of that
 * snapshot. A link to a page of another shape lets the page fade out first, then the shell moves.
 */
function ShellLink({ onClick, to, ...props }: LinkProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const href = typeof to === 'string' ? to : undefined;
	const next = href ? shellKindOfHref(href) : null;
	/* The landing shell is a full-bleed box clipped to its shape, so a view transition between it and
	   a page in a plain panel would morph one box into the other and zoom the page. Those links move
	   the shell themselves, even when both ends are the regular shape. */
	const moves =
		next !== null &&
		next.pathname !== location.pathname &&
		(next.kind !== shellKindFor(location.pathname, location.hash) ||
			next.pathname === '/' ||
			location.pathname === '/');
	return (
		<Link
			{...props}
			to={to}
			viewTransition={!moves}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (
					event.button !== 0 ||
					event.metaKey ||
					event.altKey ||
					event.ctrlKey ||
					event.shiftKey
				) {
					return;
				}
				if (moves && shellCanMove()) {
					event.preventDefault();
					captureShape(shapeAt(location.pathname, location.hash));
					holdShell();
					window.setTimeout(() => {
						enterShell(peekShape());
						void navigate(to);
					}, HOLD_MS);
					return;
				}
				if (!href?.startsWith('/docs/') || !location.pathname.startsWith('/docs/')) return;
				const nextPath = href.split(/[?#]/)[0] ?? href;
				if (nextPath === location.pathname) return;
				holdDocsArticleTransition();
			}}
		/>
	);
}

/** Rail and mobile top bar only. The drawer repeats footer icons, and this one does not belong there. */
function Th30Button() {
	const mode = useSideNavRenderMode();
	if (mode === 'drawer' || mode === 'drawer-content') return null;
	return <Th30Trigger placement="rail" />;
}

/**
 * The studio draws in the browser, so React Router withholds its own loader data from the
 * server render. The shell's is kept, so the studio's structured data and canonical URL
 * ride here and still reach crawlers in the first HTML.
 */
export function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	return {
		origin: url.origin,
		studioJsonLd: url.pathname === '/studio' ? studioJsonLd(getDocIndex(), url.origin) : undefined,
	};
}

/**
 * The structured data follows the path, so moving to or from the studio refetches it. A move
 * within one page (the landing page's scroll rewrites its hash) never does: a refetch is a pending
 * navigation, and a pending navigation hides the page behind the mark.
 */
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
	if (currentUrl.pathname === nextUrl.pathname) return false;
	const studio = (url: URL) => url.pathname === '/studio';
	return studio(currentUrl) !== studio(nextUrl);
}

/**
 * The frame every page sits in: the icon rail on the black base, the page as a panel beside it.
 * The rail is always dark so its icons read on black in either mode. A page whose handle sets
 * `isOnBase` sits on the black base itself and draws its own panels.
 */
export default function Shell({ loaderData }: Route.ComponentProps) {
	const { pathname } = useLocation();
	const matches = useMatches();
	const onBase = matches.some((match) => isOnBase(match.handle));
	const pageOwnsNav = matches.some((match) => pageOwnsDocsNav(match.handle));
	const homeImmersive = matches.some((match) => isHomeImmersive(match.handle));
	const shellClass = [
		pageOwnsNav ? 'docs-owns-nav' : null,
		homeImmersive ? 'theorem-home-shell' : null,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<Th30Provider>
			<LinkProvider component={ShellLink}>
				<AppShell
					className={shellClass || undefined}
					variant={onBase ? 'wash' : 'elevated'}
					mobileNav={pageOwnsNav ? false : undefined}
					sideNav={
						<StudioRail
							theme={theoremSiteTheme}
							pathname={pathname}
							packages={PACKAGE_LINKS}
							footerIcons={<Th30Button />}
						/>
					}
				>
					<BootMark shape={() => shapeAt(window.location.pathname, window.location.hash)} />
					<Outlet context={{ origin: loaderData.origin, studioJsonLd: loaderData.studioJsonLd }} />
					<NavMark />
					<ShellBounds />
				</AppShell>
			</LinkProvider>
		</Th30Provider>
	);
}
