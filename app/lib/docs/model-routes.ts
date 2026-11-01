import type { CodeRoute, CodeSlot, ModelField } from './schema';

/** What a model's fields say now, read off the code. */
function currentRoute(code: string, slots: readonly CodeSlot[], model: number): CodeRoute {
	const route: CodeRoute = {};
	for (const slot of slots) {
		if (slot.route?.model === model) {
			route[slot.route.field] = code.slice(slot.start + 1, slot.end - 1);
		}
	}
	return route;
}

/** The values a field can take: any provider or protocol, and the models and keys of this provider. */
export function routeChoices(
	routes: readonly CodeRoute[],
	field: ModelField,
	current: CodeRoute,
): string[] {
	const reachable =
		field === 'provider' || field === 'protocol'
			? routes
			: routes.filter((route) => route.provider === current.provider);
	return [...new Set(reachable.flatMap((route) => route[field] ?? []))];
}

/** The model once `field` is `value`: a new provider, protocol or model brings the fields that go with it. */
export function pickRoute(
	routes: readonly CodeRoute[],
	field: ModelField,
	value: string,
	current: CodeRoute,
): CodeRoute {
	if (field === 'keySlot') return { ...current, keySlot: value };
	const next = routes.find(
		(route) => route[field] === value && (field !== 'apiId' || route.provider === current.provider),
	);
	if (!next) return current;
	return next.provider === current.provider ? { ...next, keySlot: current.keySlot } : next;
}

/** The menu a model's slot shows. */
export function slotRouteChoices(
	code: string,
	slots: readonly CodeSlot[],
	models: readonly (readonly CodeRoute[])[],
	slot: CodeSlot,
): string[] {
	if (!slot.route) return [];
	const { field, model } = slot.route;
	return routeChoices(models[model] ?? [], field, currentRoute(code, slots, model));
}

/** The code once a model's slot is `value`, every field that moves with it rewritten. */
export function swapRoute(
	code: string,
	slots: readonly CodeSlot[],
	models: readonly (readonly CodeRoute[])[],
	slot: CodeSlot,
	value: string,
): string {
	if (!slot.route) return code;
	const { field, model } = slot.route;
	const next = pickRoute(models[model] ?? [], field, value, currentRoute(code, slots, model));
	const fields = slots
		.filter((each) => each.route?.model === model)
		.sort((a, b) => b.start - a.start);
	let swapped = code;
	for (const each of fields) {
		const text = each.route ? next[each.route.field] : undefined;
		if (text === undefined) continue;
		const quote = code[each.start];
		swapped = `${swapped.slice(0, each.start)}${quote}${text}${quote}${swapped.slice(each.end)}`;
	}
	return swapped;
}
