import {
	createPlaygroundDecisionTransport,
	EXAMPLE_DECISION_STATE,
	EXAMPLE_SPAN_DECISION_STATE,
	type PlaygroundRunPayload,
} from '@theoremjs/playground';
import {
	createBrowserPlaygroundDecisionTransport,
	type PlaygroundBrowserRuntime,
} from '@theoremjs/playground/browser';
import { TheoremDecision } from '@theoremjs/react/ui';
import { useMemo } from 'react';

/** The same decision runner in the builder preview and the standalone run tab. */
export function PlaygroundDecision({
	payload,
	className,
	runtime = null,
}: {
	payload: PlaygroundRunPayload;
	className?: string;
	runtime?: PlaygroundBrowserRuntime | null;
}) {
	const transport = useMemo(
		() =>
			runtime
				? createBrowserPlaygroundDecisionTransport(payload, runtime)
				: createPlaygroundDecisionTransport(payload),
		[payload, runtime],
	);
	const model =
		payload.profile.type === 'decision' ? Object.values(payload.profile.models)[0] : undefined;
	return (
		<TheoremDecision
			transport={transport}
			defaultState={
				model?.apiId.startsWith('respan/') ? EXAMPLE_SPAN_DECISION_STATE : EXAMPLE_DECISION_STATE
			}
			className={className}
		/>
	);
}
