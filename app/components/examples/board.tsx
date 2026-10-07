import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { EXAMPLES, type ExampleAction } from '../../lib/home-content';
import { NewTabLink } from '../links';
import './examples.css';

type ExampleCard = (typeof EXAMPLES)[number];

function ExampleActionButton({ action }: { action: ExampleAction }) {
	if (action.kind === 'hosted') {
		return (
			<Button label={action.label} variant="primary" size="sm" href={action.href} as={NewTabLink} />
		);
	}
	return <Button label="Open in playground" variant="primary" size="sm" href={action.href} />;
}

/** A still, a title, and a short description, with one way to open the example. */
function ExampleCardView({ example }: { example: ExampleCard }) {
	return (
		<div className="examples-card" data-place={example.id}>
			<VStack gap={3}>
				<Card padding={0}>
					<AspectRatio ratio={5 / 2} fit="cover">
						<img src={example.image} alt={example.imageAlt} />
					</AspectRatio>
				</Card>
				<VStack gap={2}>
					<Heading level={2}>{example.title}</Heading>
					<Text color="secondary">{example.description}</Text>
					<ExampleActionButton action={example.action} />
				</VStack>
			</VStack>
		</div>
	);
}

/**
 * Agents on a field you pan in both directions. The title stays in the corner
 * of the panel; the cards travel with the canvas.
 */
export function ExamplesBoard() {
	return (
		<div className="examples-frame">
			<div className="examples-mark">
				<VStack gap={2}>
					<Heading level={1} justify="end">
						showcase
					</Heading>
					<Text color="secondary" justify="end" display="block">
						Built with theorem.
					</Text>
				</VStack>
			</div>
			<ScrollableArea
				className="examples-scroll"
				axis="both"
				role="region"
				label="Showcase"
				height="100%"
				overscroll="allow"
			>
				<div className="examples-canvas">
					{EXAMPLES.map((example) => (
						<ExampleCardView key={example.id} example={example} />
					))}
				</div>
			</ScrollableArea>
		</div>
	);
}
