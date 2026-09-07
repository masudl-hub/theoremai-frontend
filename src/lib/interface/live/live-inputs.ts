import { liveIngressEnabledFromSpec } from 'theorum';
import type { LiveProfileInterface } from 'theorum/interface';

function channelEnabled(iface: LiveProfileInterface, channel: 'audio' | 'video' | 'text'): boolean {
	return liveIngressEnabledFromSpec(iface.live.ingress, channel);
}

/** Live realtime mic ingress — gated by `live.ingress.audio`. */
export function liveVoiceEnabled(iface: LiveProfileInterface): boolean {
	return channelEnabled(iface, 'audio');
}

/** Live webcam JPEG frames — gated by `live.ingress.video` (opt-in). */
export function liveVideoEnabled(iface: LiveProfileInterface): boolean {
	return channelEnabled(iface, 'video');
}

/** Live typed text — gated by `live.ingress.text`. */
export function liveTextEnabled(iface: LiveProfileInterface): boolean {
	return channelEnabled(iface, 'text');
}
