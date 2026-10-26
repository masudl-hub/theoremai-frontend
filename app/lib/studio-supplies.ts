/**
 * What the site gives every studio it opens, and every run on its keys: its keys, and its tools' handlers.
 */
import { COOKBOOK_TOOL_HANDLERS } from '@theoremjs/studio';
import type { StudioRuntime } from '@theoremjs/studio/runtime';
import type { StudioSupplies } from '@theoremjs/studio/ui/studio-host.ts';
import { SITE_KEYS } from './studio-keys';

export const SITE_SUPPLIES: StudioSupplies = {
	lentKeys: SITE_KEYS,
	toolHandlers: COOKBOOK_TOOL_HANDLERS,
};

/** A run on the site's keys, with its tools' handlers. */
export const ON_SITE = {
	mode: 'demo',
	keys: SITE_KEYS,
	toolHandlers: COOKBOOK_TOOL_HANDLERS,
} as const satisfies StudioRuntime;
