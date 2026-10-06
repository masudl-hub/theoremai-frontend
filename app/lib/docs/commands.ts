/**
 * The commands in a `bash` fence. A `# name` line starts a choice, for example one for each
 * package manager; the reader shows one choice at a time. A fence that does not start with one is
 * a single command.
 */

export type CommandChoice = { label: string; command: string };

/** At least one choice. */
export function commandChoices(code: string): [CommandChoice, ...CommandChoice[]] {
	const whole = { label: '', command: code };
	if (!code.startsWith('# ')) return [whole];
	const choices = code
		.split(/^# /m)
		.slice(1)
		.map((block): CommandChoice => {
			const [label, ...lines] = block.split('\n');
			return { label: label.trim(), command: lines.join('\n').trim() };
		});
	return [choices.shift() ?? whole, ...choices];
}
