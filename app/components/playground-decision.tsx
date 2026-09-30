import {
	createPlaygroundDecisionTransport,
	EXAMPLE_DECISION_STATE,
	EXAMPLE_SPAN_DECISION_STATE,
	type PlaygroundRunPayload,
} from '@theoremjs/playground';
import { TheoremDecision } from '@theoremjs/react/ui';
import { useMemo } from 'react';

/** The same decision runner in the builder preview and the standalone run tab. */
export function PlaygroundDecision({
	payload,
	className,
}: {
	payload: PlaygroundRunPayload;
	className?: string;
}) {
	const transport = useMemo(() => createPlaygroundDecisionTransport(payload), [payload]);
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
