/**
 * Prints, as JSON, every protocol / provider / profile-type triple `defineProfile` accepts.
 * It asks the kernel instead of reading its tables, so a rule the tables do not hold still counts.
 * Run by `docs-check-facts.mjs` with the package root as the first argument.
 */
const root = Deno.args[0];
const { defineProfile } = await import(`${root}/mod.ts`);

const protocols = ['geminiInteractions', 'geminiLive', 'openAi', 'decision'];
const providers = ['google', 'openrouter', 'local', 'typesafe'];
const types = ['text', 'image', 'speech', 'live', 'decision'];

const extras: Record<string, Record<string, unknown>> = {
	text: { tools: { allow: [] }, inputs: {} },
	image: { tools: { allow: [] }, inputs: {}, image: {} },
	speech: { speech: {} },
	live: { tools: { allow: [] }, live: {} },
	decision: { inputs: { state: 'json' }, decision: { contract: 'probe.v1' } },
};

const accepted: string[] = [];
for (const type of types) {
	for (const protocol of protocols) {
		for (const provider of providers) {
			const binding: Record<string, unknown> = { protocol, provider, apiId: 'probe-model' };
			if (provider === 'local') binding.server = 'probe';
			if (protocol === 'geminiInteractions') binding.persistViaInteractionId = false;
			try {
				defineProfile({
					type,
					id: `probe.${type}`,
					key: provider === 'local' ? undefined : provider,
					identity: { handle: 'probe' },
					models: { main: binding },
					...extras[type],
				});
				accepted.push(`${protocol}/${provider}/${type}`);
			} catch {
				// A refused triple is the answer, not a failure.
			}
		}
	}
}
console.log(JSON.stringify(accepted));
