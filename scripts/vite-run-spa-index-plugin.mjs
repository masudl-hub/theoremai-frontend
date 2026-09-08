/**
 * Vite/SvelteKit does not map `/playground/run/` → `static/.../index.html` in
 * dev. Rewrite so Playground “Run” (same-origin `/playground/run/`) works.
 */
export function runSpaIndexPlugin() {
	return {
		name: 'theorum-run-spa-index',
		configureServer(server) {
			server.middlewares.use((req, _res, next) => {
				const url = req.url?.split('?')[0] ?? '';
				if (url === '/playground/run' || url === '/playground/run/') {
					req.url = '/playground/run/index.html';
				}
				next();
			});
		},
		configurePreviewServer(server) {
			server.middlewares.use((req, _res, next) => {
				const url = req.url?.split('?')[0] ?? '';
				if (url === '/playground/run' || url === '/playground/run/') {
					req.url = '/playground/run/index.html';
				}
				next();
			});
		},
	};
}
