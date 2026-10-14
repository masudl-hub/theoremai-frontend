/** What the site gives every studio it opens, and every run on its keys: its keys, and its tools' handlers. */
import type { StudioRuntime } from '@theoremjs/studio/runtime';
import type { StudioSupplies } from '@theoremjs/studio/ui/studio-host.ts';
import { SITE_KEYS } from './studio-keys';
import { SITE_TOOL_HANDLERS } from './studio-tool-handlers';

export const SITE_SUPPLIES: StudioSupplies = {
	lentKeys: SITE_KEYS,
	toolHandlers: SITE_TOOL_HANDLERS,
};

/** A run on the site's keys, with its tools' handlers. */
export const ON_SITE = {
	mode: 'demo',
	keys: SITE_KEYS,
	toolHandlers: SITE_TOOL_HANDLERS,
} as const satisfies StudioRuntime;
