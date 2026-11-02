import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import {
	IconActivity,
	IconArrowLeft,
	IconArrowRight,
	IconCpu,
	IconDatabase,
	IconFileSmile,
	IconPlayerPlay,
	IconShieldCheck,
	IconWorld,
} from '@tabler/icons-react';
import type { TokenKind } from '../../lib/docs/figure';

/** Exact icon mapping from `@theoremjs/studio/ui/lib/type-icons.ts` */
const KIND_ICON: Record<TokenKind, IconType> = {
	profile: IconFileSmile,
	model: IconCpu,
	tool: IconWorld,
	ingress: IconArrowRight,
	egress: IconArrowLeft,
	guardrail: IconShieldCheck,
	stream: IconActivity,
	store: IconDatabase,
	runner: IconPlayerPlay,
};

/** One step of a figure's line: its name as a token, and what it does on hover. */
export function FlowToken({
	label,
	kind,
	text,
	placement,
}: {
	label: string;
	kind?: TokenKind;
	text?: string;
	placement: 'above' | 'below';
}) {
	const icon = kind && <Icon icon={KIND_ICON[kind]} size="sm" />;
	if (!text) return <Token size="sm" label={label} icon={icon} />;
	return (
		<Tooltip content={text} placement={placement} hasHoverIndication={false} delay={120}>
			<Token size="sm" label={label} icon={icon} description={text} />
		</Tooltip>
	);
}
