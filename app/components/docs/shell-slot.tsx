/** True when a route handle asks the page menu to take the shell's mobile bar. */
export function pageOwnsDocsNav(handle: unknown): boolean {
	if (typeof handle !== 'object' || handle === null || !('docsOwnsNav' in handle)) return false;
	return handle.docsOwnsNav === true;
}
