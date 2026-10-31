/**
 * Prints, as JSON, every protocol / profile-type pair `registerProfile` accepts from a first-party provider.
 * It asks the kernel instead of reading its tables, so a rule the tables do not hold still counts.
 * Run by `docs-check-facts.mjs` with the package root as the first argument.
 */
const root = Deno.args[0];
const { createKernelScope, geminiProvider, localProvider, openRouterProvider, typesafeProvider } = await import(
	`${root}/mod.ts`
);

const providers: { definition: any; connection: Record<string, unknown> }[] = [
	{ definition: openRouterProvider, connection: {} },
	{ definition: geminiProvider, connection: {} },
	{ definition: typesafeProvider, connection: {} },
	{ definition: localProvider, connection: { baseUrl: 'http://localhost:11434/v1' } },
];
const types = ['text', 'image', 'speech', 'transcription', 'live', 'decision', 'embedding'];

const extras: Record<string, Record<string, unknown>> = {
	text: { tools: { allow: [] }, inputs: {} },
	image: { tools: { allow: [] }, inputs: {}, image: {} },
	speech: { speech: {} },
	transcription: { inputs: { voice: { accept: ['audio/*'] }, maxFiles: 1, maxBytes: 20971520, maxTurnBytes: 20971520 } },
	live: { tools: { allow: [] }, live: {} },
	decision: { inputs: { state: 'json' }, decision: { contract: 'probe.v1' } },
	embedding: { inputs: { text: true } },
};

const accepted = new Set<string>();
for (const { definition, connection } of providers) {
	for (const { protocol } of definition.serves(connection)) {
		for (const type of types) {
			const scope = createKernelScope();
			scope.providers.register(definition, { connection, keySlot: 'probe' });
			try {
				scope.profiles.register({
					type,
					id: `probe.${type}`,
					identity: { handle: 'probe' },
					models: { main: { protocol: protocol.id, provider: definition.id, apiId: 'probe-model' } },
					...extras[type],
				});
				accepted.add(`${protocol.id}/${type}`);
			} catch {
				// A refused pair is the answer, not a failure.
			}
		}
	}
}
console.log(JSON.stringify([...accepted]));
