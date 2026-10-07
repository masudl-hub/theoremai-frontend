import { initialize } from 'monaco-editor/internal/common/initialize';
import { TypeScriptWorker } from 'monaco-editor/languages/features/typescript/tsWorker';

/**
 * Monaco treats every extra library as its own program. The declarations are
 * only there so the open file can import them, so the program is that file.
 */
class PlaygroundTypeScriptWorker extends TypeScriptWorker {
	override getScriptFileNames(): string[] {
		return super.getScriptFileNames().filter((name) => name.startsWith('file:///agent'));
	}
}

const scope = self as unknown as {
	onmessage: (event: MessageEvent) => void;
};

scope.onmessage = () => {
	initialize((ctx, createData) => new PlaygroundTypeScriptWorker(ctx, createData));
};
