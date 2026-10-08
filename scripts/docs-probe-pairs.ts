/**
 * Prints, as JSON, every adapter / profile-type pair `registerProfile` accepts.
 * It asks the kernel instead of reading its tables, so a rule the tables do not hold still counts.
 * Run by `docs-check-facts.mjs` with the package root as the first argument.
 */
const root = Deno.args[0];
const { createKernelScope, defineProvider, googleAdapter, openAIChat, openRouterAdapter, typesafeAdapter } =
	await import(`${root}/mod.ts`);

const adapters: Record<string, { connection: Record<string, unknown>; adapter: unknown }> = {
	openRouterAdapter: { connection: {}, adapter: openRouterAdapter() },
	googleAdapter: { connection: {}, adapter: googleAdapter() },
	openAIChat: { connection: { baseURL: 'http://localhost:11434/v1' }, adapter: openAIChat() },
	typesafeAdapter: { connection: {}, adapter: typesafeAdapter() },
};
const types = ['text', 'image', 'speech', 'live', 'decision'];

const extras: Record<string, Record<string, unknown>> = {
	text: { tools: { allow: [] }, inputs: {} },
	image: { tools: { allow: [] }, inputs: {}, image: {} },
	speech: { speech: {} },
	live: { tools: { allow: [] }, live: {} },
	decision: { inputs: { state: 'json' }, decision: { contract: 'probe.v1' } },
};

const accepted: string[] = [];
for (const [name, { connection, adapter }] of Object.entries(adapters)) {
	for (const type of types) {
		const scope = createKernelScope();
		scope.providers.register(defineProvider({ id: 'probe', connection, keySlot: 'probe', adapter }));
		try {
			scope.profiles.register({
				type,
				id: `probe.${type}`,
				identity: { handle: 'probe' },
				models: { main: { provider: 'probe', apiId: 'probe-model' } },
				...extras[type],
			});
			accepted.push(`${name}/${type}`);
		} catch {
			// A refused pair is the answer, not a failure.
		}
	}
}
console.log(JSON.stringify(accepted));
