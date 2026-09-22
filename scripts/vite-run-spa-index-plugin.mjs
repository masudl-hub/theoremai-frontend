/**
 * Vite/SvelteKit does not map `/playground/run/` → `static/.../index.html` in
 * dev. Rewrite so Playground “Run” (same-origin `/playground/run/`) works.
 * Preserve `?run=` (and any other query) on the rewritten request.
 */
export function runSpaIndexPlugin() {
	return {
		name: 'theorem-run-spa-index',
		configureServer(server) {
			server.middlewares.use((req, _res, next) => {
				const raw = req.url ?? '';
				const path = raw.split('?')[0] ?? '';
				const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
				if (path === '/playground/run' || path === '/playground/run/') {
					req.url = `/playground/run/index.html${query}`;
				}
				next();
			});
		},
		configurePreviewServer(server) {
			server.middlewares.use((req, _res, next) => {
				const raw = req.url ?? '';
				const path = raw.split('?')[0] ?? '';
				const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
				if (path === '/playground/run' || path === '/playground/run/') {
					req.url = `/playground/run/index.html${query}`;
				}
				next();
			});
		},
	};
}
