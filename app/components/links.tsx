import type { ComponentProps } from 'react';

/**
 * Astryx link component for off-site destinations: opens in a new tab with no opener.
 * Astryx hands custom link components `to` alongside `href` (for routers); a plain anchor drops it.
 */
export function NewTabLink({ to: _to, ...props }: ComponentProps<'a'> & { to?: string }) {
	return <a {...props} target="_blank" rel="noopener noreferrer" />;
}
