/** Same kernel repo the site rail already links. */
const KERNEL_GITHUB = 'https://github.com/masudl-hub/theoremai/blob/main';

export function chapterGithubHref(entry: string): string {
	return `${KERNEL_GITHUB}/${entry}`;
}
