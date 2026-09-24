import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { HeroVideo } from '../components/hero-video';
import { getKernelPackageVersion } from '../lib/.server/theoremai';
import type { Route } from './+types/home';

export function meta() {
	return [
		{ title: 'THEOREM' },
		{
			name: 'description',
			content: 'A TypeScript kernel for typed agent profiles and deterministic turns.',
		},
	];
}

export function loader() {
	return { version: getKernelPackageVersion() };
}

/** Landing hero: the wordmark over the valley footage. */
export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<HeroVideo src="/hero/valley.mp4" poster="/hero/valley.webp">
			<VStack height="100%" justify="end" gap={2} padding={10}>
				<Text type="label">{loaderData.version}</Text>
				<Heading level={1} type="wordmark" hasCapsize>
					THEOREM
				</Heading>
				<Text type="large">
					Typed, composable agents for text, image, speech, and live voice — guarded on every turn.
				</Text>
			</VStack>
		</HeroVideo>
	);
}
