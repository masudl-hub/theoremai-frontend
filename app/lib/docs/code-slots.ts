/**
 * Which strings in the docs' code samples are choices. The type checker reads each sample as the
 * program `sampleProgram` makes of it: a string whose type names its values is a choice among them,
 * and a string that names something (a profile, a model, a key slot) is a choice among what the
 * research cookbook has of that kind. Nothing here lists a value.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { catalogPathFor, fieldMeta } from '@theoremjs/agents/schema';
import { createResearchWorkspace } from '@theoremjs/studio';
import ts from 'typescript';
import { markdownFences } from './chapter-markdown';
import { rowStarts, type SampleNames, type SampleProgram, sampleProgram } from './sample-program';
import type { CodeChoice, CodeSlot, CodeSlots, DocSection, SnippetFrame } from './schema';

type Roots = { repoRoot: string; kernelRoot: string };

/** The compiler options samples build with, for a folder two levels under the repo. */
export const SAMPLE_TSCONFIG = {
	extends: '../../tsconfig.json',
	include: ['./*.ts', './*.tsx', '../../theoremai-deno-shim.d.ts'],
	// `allowJs`: `@theoremjs/studio/vite` is a `.mjs` whose types come from its JSDoc, as the
	// declarations the published package ships are emitted from it.
	compilerOptions: { rootDirs: ['.', '../..'], noEmit: true, types: ['node'], allowJs: true },
};

/** A fresh folder for sample programs. The site installs no `@theoremjs/web`, so it links the package's. */
export function prepareSampleFolder(folder: string, kernelRoot: string): void {
	mkdirSync(path.join(folder, 'node_modules/@theoremjs'), { recursive: true });
	symlinkSync(
		path.join(kernelRoot, 'web'),
		path.join(folder, 'node_modules/@theoremjs/web'),
		'dir',
	);
}

/** The options a folder of samples builds with. No file: Vite reloads on any new tsconfig. */
function sampleOptions(folder: string): ts.ParsedCommandLine {
	return ts.parseJsonConfigFileContent(
		SAMPLE_TSCONFIG,
		ts.sys,
		folder,
		undefined,
		path.join(folder, 'tsconfig.json'),
	);
}

/** The value names `@theoremjs/agents` exports. */
function rootExports(kernelRoot: string, options: ts.CompilerOptions): string[] {
	const mod = path.join(kernelRoot, 'mod.ts');
	const program = ts.createProgram([mod], options);
	const checker = program.getTypeChecker();
	const file = program.getSourceFile(mod);
	const symbol = file && checker.getSymbolAtLocation(file);
	if (!symbol) throw new Error(`${mod} is not a module`);
	return checker
		.getExportsOfModule(symbol)
		.filter((each) => {
			const resolved = each.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(each) : each;
			return (resolved.flags & ts.SymbolFlags.Value) !== 0;
		})
		.map((each) => each.name);
}

function hostExports(repoRoot: string): string[] {
	const source = readFileSync(path.join(repoRoot, 'scripts/docs-snippet-host.ts'), 'utf8');
	return [...source.matchAll(/^export (?:declare )?(?:const|function) (\w+)/gm)].flatMap(
		(match) => match[1] ?? [],
	);
}

/** The names a sample may use unimported. */
export function sampleNames(repoRoot: string, kernelRoot: string): SampleNames {
	mkdirSync(path.join(repoRoot, 'tmp'), { recursive: true });
	const folder = mkdtempSync(path.join(repoRoot, 'tmp/docs-names-'));
	try {
		prepareSampleFolder(folder, kernelRoot);
		return {
			root: rootExports(kernelRoot, sampleOptions(folder).options),
			host: hostExports(repoRoot),
		};
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
}

/** What the research cookbook has of each kind a sample can name. */
function cookbookChoices() {
	const { agents, toolSpecs, providers } = createResearchWorkspace();
	const distinct = (values: readonly (string | undefined)[]): CodeChoice[] =>
		[...new Set(values.filter((value) => value !== undefined && value !== ''))].map((value) => ({
			value: value as string,
		}));
	const bindings = agents.flatMap((agent) => agent.modelBindings);
	const profiles = agents.map((agent) => ({
		value: agent.identity.agentId,
		description: `A ${agent.identity.profileType} agent`,
		icon: agent.identity.profileType,
		type: agent.identity.profileType,
		models: agent.modelBindings.map((binding) => binding.modelId),
	}));
	return {
		profiles,
		tools: toolSpecs.map(
			(tool): CodeChoice => ({
				value: tool.toolName,
				description: tool.description,
				icon: tool.toolType,
			}),
		),
		keySlots: distinct(bindings.map((binding) => binding.keySlot)),
		providers: distinct(providers.map((provider) => provider.id)),
		protocols: distinct(bindings.map((binding) => binding.protocol)),
		apiIds: distinct(bindings.map((binding) => binding.apiId)),
	};
}

type Cookbook = ReturnType<typeof cookbookChoices>;

/** The key a property assignment sets, unquoted. */
function keyOf(name: ts.PropertyName): string | undefined {
	return ts.isIdentifier(name) || ts.isStringLiteralLike(name) ? name.text : undefined;
}

/** The node that holds the string's value place, past any `as const`. */
function valuePlace(literal: ts.Expression): ts.Expression {
	let at = literal;
	while (ts.isAsExpression(at.parent) || ts.isSatisfiesExpression(at.parent)) at = at.parent;
	return at;
}

/** The property this value sets, directly or as one element of its array. */
function ownerProperty(value: ts.Expression): ts.PropertyAssignment | undefined {
	const { parent } = value;
	if (ts.isPropertyAssignment(parent) && parent.initializer === value) return parent;
	if (ts.isArrayLiteralExpression(parent) && ts.isPropertyAssignment(parent.parent)) {
		return parent.parent;
	}
	return undefined;
}

/** A string a builder sets: a field's value, an array's element, an argument or a JSX attribute. */
function isSetValue(value: ts.Expression): boolean {
	const { parent } = value;
	return (
		ownerProperty(value) !== undefined ||
		ts.isArrayLiteralExpression(parent) ||
		ts.isJsxAttribute(parent) ||
		((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression !== value)
	);
}

/** The keys from the outermost object down to this property, and the call the outermost feeds. */
function keyPath(property: ts.PropertyAssignment): { keys: string[]; call?: ts.CallExpression } {
	const keys: string[] = [];
	let at: ts.Node = property;
	while (ts.isPropertyAssignment(at)) {
		const key = keyOf(at.name);
		if (key === undefined) return { keys: [] };
		keys.unshift(key);
		const object: ts.Node = at.parent;
		at = ts.isPropertyAssignment(object.parent) ? object.parent : object;
	}
	return { keys, ...(ts.isCallExpression(at.parent) ? { call: at.parent } : {}) };
}

/** The string literals of a type, through its unions. */
function stringValues(type: ts.Type | undefined): string[] {
	if (!type) return [];
	if (type.isUnion()) return type.types.flatMap(stringValues);
	return type.isStringLiteral() ? [type.value] : [];
}

/** The values the types allow: the contextual type, and the field's whole union when a sibling narrowed it. */
function typedValues(checker: ts.TypeChecker, value: ts.Expression): string[] {
	const literal = stringValues(checker.getContextualType(value));
	const property = ownerProperty(value);
	if (!property || property.initializer !== value) return literal;
	const key = keyOf(property.name);
	const object = checker.getContextualType(property.parent);
	if (!key || !object) return literal;
	const members = object.isUnion() ? object.types : [object];
	const field = members.flatMap((member) => {
		const symbol = member.getProperty(key);
		return symbol ? stringValues(checker.getTypeOfSymbol(symbol)) : [];
	});
	return [...new Set([...field, ...literal])];
}

/** The type name a field's declaration writes, such as `ProfileId`. */
function declaredName(
	checker: ts.TypeChecker,
	property: ts.PropertyAssignment,
): string | undefined {
	const key = keyOf(property.name);
	const object = key ? checker.getContextualType(property.parent) : undefined;
	if (!key || !object) return undefined;
	const members = object.isUnion() ? object.types : [object];
	for (const member of members) {
		const declaration = member.getProperty(key)?.valueDeclaration;
		if (declaration && ts.isPropertySignature(declaration) && declaration.type) {
			return declaration.type.getText();
		}
	}
	return undefined;
}

/** The value of a sibling property in an object literal. */
function sibling(object: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
	for (const each of object.properties) {
		if (ts.isPropertyAssignment(each) && keyOf(each.name) === key) return each.initializer;
	}
	return undefined;
}

/** The names a `models: { … }` in this object declares. */
function declaredModels(object: ts.ObjectLiteralExpression): string[] {
	const models = sibling(object, 'models');
	if (!models || !ts.isObjectLiteralExpression(models)) return [];
	return models.properties.flatMap((each) => {
		const key = each.name && !ts.isComputedPropertyName(each.name) ? keyOf(each.name) : undefined;
		return ts.isPropertyAssignment(each) && key ? [key] : [];
	});
}

/** The models this field can name: the sample's own, else those of the cookbook profile beside it. */
function modelChoices(property: ts.PropertyAssignment, cookbook: Cookbook): CodeChoice[] {
	const object = property.parent;
	const own = declaredModels(object);
	if (own.length > 0) return own.map((value) => ({ value }));
	const profile = sibling(object, 'profile');
	const id = profile && ts.isStringLiteralLike(profile) ? profile.text : undefined;
	const known = cookbook.profiles.find((each) => each.value === id);
	return (known?.models ?? []).map((value) => ({ value }));
}

/** A field's catalog path and meta, when the string sets a field of a profile or a tool. */
function catalogField(property: ts.PropertyAssignment) {
	const { keys, call } = keyPath(property);
	const callee = call?.expression.getText();
	if (keys.length === 0) return undefined;
	if (callee !== 'defineProfile' && callee !== 'registerTool') return undefined;
	const path = callee === 'defineProfile' ? catalogPathFor(keys) : `registerTool.${keys.join('.')}`;
	return { path, meta: fieldMeta(path) };
}

/** What the cookbook offers for a field that names something, by its declared type or catalog path. */
function namedChoices(
	checker: ts.TypeChecker,
	property: ts.PropertyAssignment,
	cookbook: Cookbook,
): CodeChoice[] {
	const field = catalogField(property);
	switch (field?.path) {
		case 'models.*.provider':
			return cookbook.providers;
		case 'models.*.protocol':
			return cookbook.protocols;
		case 'models.*.apiId':
			return cookbook.apiIds;
		case 'models.*.compaction.profile':
			return cookbook.profiles.filter((profile) => profile.type === 'text');
		default:
			break;
	}
	switch (field?.meta?.type ?? declaredName(checker, property)) {
		case 'ProfileId':
			return cookbook.profiles;
		case 'ModelId':
			return modelChoices(property, cookbook);
		case 'KeySlot':
			return cookbook.keySlots;
		case 'ToolId':
			return cookbook.tools;
		default:
			return [];
	}
}

/** The choices a string has, or none: two at least, and always its own value. */
function choicesOf(
	checker: ts.TypeChecker,
	value: ts.Expression,
	current: string,
	cookbook: Cookbook,
): CodeChoice[] {
	const property = ownerProperty(value);
	const inArray = property !== undefined && property.initializer !== value;
	const meta = property && !inArray ? catalogField(property)?.meta : undefined;
	const order = meta?.options ?? [];
	const typed = typedValues(checker, value)
		.sort((a, b) => order.indexOf(a) - order.indexOf(b))
		.map((option): CodeChoice => {
			const description = meta?.optionDescriptions?.[option];
			return description ? { value: option, description } : { value: option };
		});
	const named = property && !inArray ? namedChoices(checker, property, cookbook) : [];
	const choices = typed.length > 1 ? typed : named;
	if (choices.length === 0) return [];
	const all = choices.some((choice) => choice.value === current)
		? choices
		: [{ value: current }, ...choices];
	return all.length > 1 ? all : [];
}

/** The sample's slots, each at its place in the sample's own code. */
function samplePlaces(
	file: ts.SourceFile,
	sample: { code: string; program: SampleProgram },
	checker: ts.TypeChecker,
	cookbook: Cookbook,
): CodeSlot[] {
	const starts = rowStarts(sample.code.split('\n'));
	const codeAt = (position: number): number | undefined => {
		const { line, character } = file.getLineAndCharacterOfPosition(position);
		const row = sample.program.sourceLines[line - sample.program.firstLine];
		const start = row === undefined ? undefined : starts[row];
		return start === undefined ? undefined : start + character;
	};
	const slots: CodeSlot[] = [];
	const visit = (node: ts.Node) => {
		if (ts.isStringLiteralLike(node)) {
			const value = valuePlace(node);
			const start = codeAt(node.getStart(file));
			if (start !== undefined && isSetValue(value)) {
				const choices = choicesOf(checker, value, node.text, cookbook);
				if (choices.length > 0) {
					slots.push({ start, end: start + node.getWidth(file), choices });
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	return slots;
}

/** The article's `ts` and `tsx` samples the checker can read: framed, or whole programs. */
function checkableSamples(body: string, names: SampleNames) {
	return markdownFences(body).flatMap((fence) => {
		if (fence.lang !== 'ts' && fence.lang !== 'tsx') return [];
		const frame = fence.meta.frame as SnippetFrame | undefined;
		if (!frame && !/^\s*import\s/m.test(fence.code)) return [];
		return [
			{
				code: fence.code,
				extension: fence.lang,
				program: sampleProgram(fence.code, frame, names),
			},
		];
	});
}

/** Each chapter's code tokens, by sample code. */
export function chapterCodeSlots(
	articles: readonly { slug: DocSection; body: string }[],
	{ repoRoot, kernelRoot }: Roots,
): Map<DocSection, Record<string, CodeSlots>> {
	mkdirSync(path.join(repoRoot, 'tmp'), { recursive: true });
	const folder = mkdtempSync(path.join(repoRoot, 'tmp/docs-slots-'));
	try {
		prepareSampleFolder(folder, kernelRoot);
		const names = {
			root: rootExports(kernelRoot, sampleOptions(folder).options),
			host: hostExports(repoRoot),
		};
		const written = articles.flatMap(({ slug, body }) =>
			checkableSamples(body, names).map((sample, at) => {
				const file = path.join(
					folder,
					`${slug.replaceAll('/', '--')}--${String(at)}.${sample.extension}`,
				);
				writeFileSync(file, sample.program.text);
				return { slug, sample, file };
			}),
		);
		const parsed = sampleOptions(folder);
		const program = ts.createProgram(parsed.fileNames, parsed.options);
		const checker = program.getTypeChecker();
		const cookbook = cookbookChoices();
		const chapters = new Map<DocSection, Record<string, CodeSlots>>();
		for (const { slug, sample, file } of written) {
			const source = program.getSourceFile(file);
			if (!source) throw new Error(`${file} is not in the sample program`);
			const slots = samplePlaces(source, sample, checker, cookbook);
			const tools = /\ballow\s*:\s*\[/.test(sample.code) ? cookbook.tools : [];
			if (slots.length === 0 && tools.length === 0) continue;
			chapters.set(slug, { ...chapters.get(slug), [sample.code]: { slots, tools } });
		}
		return chapters;
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
}
