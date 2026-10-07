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
import { Link, type LinkProps, Outlet, useLocation, useMatches } from 'react-router';
import { theoremSiteTheme } from '../built/theorem-site';
import '../components/docs/docs.css';
import '../components/page-transition.css';
import '../components/shell.css';
import { holdDocsArticleTransition } from '../components/docs/article-transition';
import { pageOwnsDocsNav } from '../components/docs/shell-slot';
import { NewTabLink } from '../components/links';
import { LogoMark } from '../components/logo-mark';
import { NavMark } from '../components/nav-mark';
import { Th30Provider, Th30Trigger } from '../components/th30-dock';
import { SITE_PACKAGES, SITE_SECTIONS } from '../lib/site-nav';

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
	return typeof handle === 'object' && handle !== null && (handle as ShellHandle).homeImmersive === true;
}

/** In-app links crossfade the page panel. The rail is not part of that snapshot. */
function ShellLink({ onClick, to, ...props }: LinkProps) {
	const location = useLocation();
	return (
		<Link
			{...props}
			to={to}
			viewTransition
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
				const href = typeof to === 'string' ? to : undefined;
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
	const shellClass = [pageOwnsNav ? 'docs-owns-nav' : null, homeImmersive ? 'theorem-home-shell' : null]
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
								header={<SideNavHeading heading="Theorem" headingHref="/" icon={<LogoMark />} />}
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
					<Outlet />
					<NavMark />
				</AppShell>
			</LinkProvider>
		</Th30Provider>
	);
}
