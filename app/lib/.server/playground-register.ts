/**
 * Playground drafts, each run on a kernel scope of its own. Two visitors can
 * name the same profile, tool, or schema without either one seeing the other's.
 */
import {
	createKernelScope,
	defineProfile,
	type KernelScope,
	type Profile,
	type ProfileDefinition,
	standardEgressEnforce,
} from '@theoremai/agents';
import {
	registerPlaygroundTools,
	type StructuredRegistration,
	type ToolRegistration,
} from '@theoremai/playground';

/** Swaps the draft's egress enforcer for the standard one, keeping the guardrails' own type. */
function withStandardEgress<G extends { egress?: { enforce: unknown } }>(guardrails: G): G {
	if (!guardrails.egress) return guardrails;
	return { ...guardrails, egress: { ...guardrails.egress, enforce: standardEgressEnforce } };
}

/**
 * Drops the draft's network exemptions. They are for the host the profile is
 * exported to; the playground's own server reaches public hosts only.
 */
function withoutNetworkExemptions<G extends { network?: unknown }>(guardrails: G): G {
	return { ...guardrails, network: undefined };
}

function runtimeProfileDefinition(def: ProfileDefinition): ProfileDefinition {
	if (!def.guardrails) return def;
	if (def.type === 'host') return { ...def, guardrails: withoutNetworkExemptions(def.guardrails) };
	// Speech narrows guardrails (no canary), so it is spread on its own to keep that type.
	if (def.type === 'speech') {
		return { ...def, guardrails: withStandardEgress(withoutNetworkExemptions(def.guardrails)) };
	}
	return { ...def, guardrails: withStandardEgress(withoutNetworkExemptions(def.guardrails)) };
}

/** Registers the draft's tools, schema, and profile into `scope`. */
function registerDraft(
	scope: KernelScope,
	profile: ProfileDefinition,
	customTools: readonly ToolRegistration[],
	structured: StructuredRegistration | undefined,
): Profile {
	registerPlaygroundTools(scope.tools, customTools);
	if (structured && profile.type !== 'live') {
		scope.schemas.register(structured.id, structured.spec);
	}
	const defined = defineProfile(runtimeProfileDefinition(profile));
	scope.profiles.register(defined);
	return defined;
}

/** A new scope holding one request's draft, and the profile to run on it. */
export function playgroundScope(
	profile: ProfileDefinition,
	customTools: readonly ToolRegistration[],
	structured: StructuredRegistration | undefined,
): { scope: KernelScope; profile: Profile } {
	const scope = createKernelScope();
	return { scope, profile: registerDraft(scope, profile, customTools, structured) };
}
