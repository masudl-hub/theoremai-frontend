/**
 * Soft two-tone session-ready chime (calm, not a notification ding).
 * Short sine pair with gentle attack/release.
 */
export async function playTh30ReadyChime(existing?: AudioContext | null): Promise<void> {
	const owned = !existing || existing.state === 'closed';
	const ctx = owned ? new AudioContext() : existing;
	if (ctx.state === 'suspended') {
		await ctx.resume();
	}

	const now = ctx.currentTime;
	const master = ctx.createGain();
	master.gain.setValueAtTime(0.0001, now);
	master.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
	master.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
	master.connect(ctx.destination);

	const tones: Array<{ freq: number; start: number; dur: number }> = [
		{ freq: 523.25, start: 0, dur: 0.9 }, // C5
		{ freq: 659.25, start: 0.18, dur: 1.05 }, // E5
	];

	for (const tone of tones) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(tone.freq, now + tone.start);
		gain.gain.setValueAtTime(0.0001, now + tone.start);
		gain.gain.exponentialRampToValueAtTime(0.55, now + tone.start + 0.05);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);
		osc.connect(gain);
		gain.connect(master);
		osc.start(now + tone.start);
		osc.stop(now + tone.start + tone.dur + 0.02);
	}

	await new Promise((resolve) => setTimeout(resolve, 1400));
	if (owned) {
		try {
			await ctx.close();
		} catch {
			/* ignore */
		}
	}
}
