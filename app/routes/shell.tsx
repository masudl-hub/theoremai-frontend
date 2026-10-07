import { AppShell } from '@astryxdesign/core/AppShell';
import { LinkProvider } from '@astryxdesign/core/Link';
import {
	SideNav,
	SideNavHeading,
	SideNavItem,
	SideNavSection,
	useSideNavRenderMode,
} from '@astryxdesign/core/SideNav';
import { Theme } from '@astryxdesign/core/theme';
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
import '../components/shell.css';
import { BootMark } from '../components/boot-mark';
import { holdDocsArticleTransition } from '../components/docs/article-transition';
import { pageOwnsDocsNav } from '../components/docs/shell-slot';
import { NewTabLink } from '../components/links';
import { LogoMark } from '../components/logo-mark';
import {
	captureShape,
	enterShell,
	HOLD_MS,
	holdShell,
	peekShape,
	shellCanMove,
	shellKindFor,
	shellKindOfHref,
} from '../components/shell-motion';
import { NavMark } from '../components/shell-navigation';
import { Th30Provider, Th30Trigger } from '../components/th30-dock';
import { getDocIndex } from '../lib/docs/.server/load-index';
import { playgroundJsonLd } from '../lib/playground-content';
import { SITE_PACKAGES, SITE_SECTIONS } from '../lib/site-nav';
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
					captureShape(location.pathname, location.hash);
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
 * The playground draws in the browser, so React Router withholds its own loader data from the
 * server render. The shell's is kept, so the playground's structured data and canonical URL
 * ride here and still reach crawlers in the first HTML.
 */
export function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	return {
		origin: url.origin,
		playgroundJsonLd:
			url.pathname === '/playground' ? playgroundJsonLd(getDocIndex(), url.origin) : undefined,
	};
}

/** The structured data follows the path, so moving to or from the playground refetches it. */
export function shouldRevalidate({
	currentUrl,
	nextUrl,
	defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
	const playground = (url: URL) => url.pathname === '/playground';
	return playground(currentUrl) !== playground(nextUrl) || defaultShouldRevalidate;
}

/**
 * The frame every page sits in: the icon rail on the black base, the page as a panel beside it.
 * The rail is always dark so its icons read on black in either mode. A page whose handle sets
 * `isOnBase` sits on the black base itself and draws its own panels.
 */
export default function Shell() {
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
						<Theme theme={theoremSiteTheme} mode="dark">
							<SideNav
								collapsible={{ isCollapsed: true, hasButton: false }}
								header={<SideNavHeading heading="theorem" headingHref="/" icon={<LogoMark />} />}
								footerIcons={<Th30Button />}
							>
								<SideNavSection title="Site" isHeaderHidden>
									{SITE_SECTIONS.map(({ label, href, icon }) => (
										<SideNavItem
											key={href}
											label={label}
											href={href}
											icon={icon}
											isSelected={pathname === href || pathname.startsWith(`${href}/`)}
											data-home-nav-anchor={href}
										/>
									))}
								</SideNavSection>
								<SideNavSection title="Packages" isHeaderHidden>
									{SITE_PACKAGES.map(({ label, href, icon }) => (
										<SideNavItem
											key={href}
											label={label}
											href={href}
											icon={icon}
											as={NewTabLink}
											data-home-nav-anchor={href}
										/>
									))}
								</SideNavSection>
							</SideNav>
						</Theme>
					}
				>
					<BootMark />
					<Outlet />
					<NavMark />
				</AppShell>
			</LinkProvider>
		</Th30Provider>
	);
}
