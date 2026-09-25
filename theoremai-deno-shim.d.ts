/** Minimal Deno surface used by sibling theorem source under Node/Vite typechecking. */
declare namespace Deno {
	function cwd(): string;
	function mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<void>;
	function writeTextFile(
		path: string,
		data: string,
		options?: { append?: boolean; mode?: number }
	): Promise<void>;
	function remove(path: string): Promise<void>;
	function stat(path: string): Promise<{ size?: number }>;
	function readDir(path: string): AsyncIterable<{ name: string }>;
	namespace env {
		function get(name: string): string | undefined;
	}
}
