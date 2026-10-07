import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Selector } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { IconBrowser } from '@tabler/icons-react';
import { useDisclosureMotion } from '@theoremjs/react/ui';
import { useRef } from 'react';
import {
	type PageInputs,
	type PageValues,
	sentPageValues,
	slotValue,
} from '../lib/playground-page';
import { InspectorRow } from './inspector';

const CONTEXT_PLACEHOLDER = `{
  "page": "Checkout"
}`;

/** What the closed panel says is going out: each slot's value, then whether context is. */
function summary(inputs: PageInputs, values: PageValues): string {
	const sent = sentPageValues(inputs, values);
	const parts = Object.entries(sent.slots ?? {}).map(([name, value]) => `${name} ${value}`);
	if (sent.contextError) parts.push('context not sent');
	else if (sent.context !== undefined) parts.push('context sent');
	return parts.join(' · ');
}

/**
 * The page the playground stands in for: the value picked for each slot, the context it sends, and
 * the tools it answers. A chat reads them with each turn; a call reads slots as it starts and
 * context whenever it changes.
 */
export function PlaygroundPage({
	inputs,
	values,
	onChange,
}: {
	inputs: PageInputs;
	values: PageValues;
	onChange: (next: PageValues) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	useDisclosureMotion(ref);
	const { contextError } = sentPageValues(inputs, values);
	return (
		<div ref={ref}>
			<CollapsibleGroup type="multiple" density="compact">
				<Collapsible
					value="page"
					trigger={
						<HStack gap={2} align="center" justify="between">
							<HStack gap={2} align="center">
								<Icon icon={IconBrowser} size="sm" color="secondary" />
								<Text type="supporting">Page</Text>
							</HStack>
							<Text type="supporting" color="secondary">
								{summary(inputs, values)}
							</Text>
						</HStack>
					}
				>
					<VStack gap={3}>
						{Object.entries(inputs.slots).map(([name, allowed]) => (
							<InspectorRow key={name} label={name} path="inputs.slots">
								<StackItem size="fill">
									<Selector
										label={name}
										isLabelHidden
										isRequired
										size="sm"
										placement="below"
										options={[...allowed]}
										value={slotValue(inputs, values, name)}
										onChange={(next) => {
											if (next) onChange({ ...values, slots: { ...values.slots, [name]: next } });
										}}
									/>
								</StackItem>
							</InspectorRow>
						))}
						{inputs.takesContext && (
							<InspectorRow label="Context" path="inputs.context">
								<StackItem size="fill">
									<TextArea
										label="Context"
										isLabelHidden
										size="sm"
										rows={3}
										hasSpellCheck={false}
										placeholder={CONTEXT_PLACEHOLDER}
										status={contextError ? { type: 'error', message: contextError } : undefined}
										value={values.contextJson}
										onChange={(contextJson) => {
											onChange({ ...values, contextJson });
										}}
									/>
								</StackItem>
							</InspectorRow>
						)}
						{inputs.pageTools.length > 0 && (
							<InspectorRow label="Answers" path="answeredBy">
								<HStack gap={1} wrap="wrap">
									{inputs.pageTools.map((name) => (
										<Token key={name} label={name} size="sm" />
									))}
								</HStack>
							</InspectorRow>
						)}
					</VStack>
				</Collapsible>
			</CollapsibleGroup>
		</div>
	);
}
