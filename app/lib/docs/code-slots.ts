/**
 * Which strings in the docs' code samples are choices. The type checker reads each sample as the
 * program `sampleProgram` makes of it: a string whose type names its values is a choice among them,
 * and a string that names something (a profile, a model, a key slot) is a choice among what the
 * research cookbook has of that kind. A choice must fit what the sample already says: a union's
 * member is one that has the fields beside it, and a profile is one of the same type. A model's
 * provider, protocol, id and key move together, as the cookbook's own models pair them. Nothing
 * here lists a value.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { catalogPathFor, fieldMeta } from '@theoremjs/agents/schema';
import { createResearchWorkspace } from '@theoremjs/studio';
import ts from 'typescript';
import { markdownFences } from './chapter-markdown';
import { rowStarts, type SampleNames, type SampleProgram, sampleProgram } from './sample-program';
import type {
	CodeChoice,
	CodeRoute,
	CodeSlot,
	CodeSlots,
	DocSection,
	ModelField,
	SnippetFrame,
} from './schema';

export type Roots = { repoRoot: string; kernelRoot: string };

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
	return [...source.matchAll(/^export (?:declare )?(?:const|function) (\w+)/gm)].map(
		(match) => match[1],
	);
}

/** The names a sample may use unimported. */
// fallow-ignore-next-line unused-export -- scripts/docs-index-plugin.mjs reads it at run time.
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
	const bindings = agents.flatMap((agent) =>
		agent.modelBindings.map((binding) => ({ ...binding, type: agent.identity.profileType })),
	);
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
		providers,
		bindings,
		distinct,
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

/** The keys an object literal sets. */
function keysSet(object: ts.ObjectLiteralExpression): string[] {
	return object.properties.flatMap((each) => {
		const key = each.name && !ts.isComputedPropertyName(each.name) ? keyOf(each.name) : undefined;
		return key ? [key] : [];
	});
}

/** The values the types allow: of a union, only what its members with every field beside this one take. */
function typedValues(checker: ts.TypeChecker, value: ts.Expression): string[] {
	const literal = stringValues(checker.getContextualType(value));
	const property = ownerProperty(value);
	if (!property || property.initializer !== value) return literal;
	const key = keyOf(property.name);
	const object = checker.getContextualType(property.parent);
	if (!key) return literal;
	const beside = keysSet(property.parent).filter((each) => each !== key);
	// why: A JSON Schema's `properties` or `items` beside its `type` say which type it is.
	if (key === 'type' && beside.some((each) => each === 'properties' || each === 'items')) return [];
	if (!object?.isUnion()) return literal;
	const field = object.types
		.filter((member) => beside.every((each) => member.getProperty(each)))
		.flatMap((member) => {
			const symbol = member.getProperty(key);
			return symbol ? stringValues(checker.getTypeOfSymbol(symbol)) : [];
		});
	return field.length > 0 ? [...new Set(field)] : literal;
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

/** The string a sibling property sets. */
function stated(object: ts.ObjectLiteralExpression, key: string): string | undefined {
	const value = sibling(object, key);
	return value && ts.isStringLiteralLike(value) ? value.text : undefined;
}

/** The names this object's `key: { … }` declares. */
function declaredNames(object: ts.ObjectLiteralExpression, key: string): string[] {
	const names = sibling(object, key);
	return names && ts.isObjectLiteralExpression(names) ? keysSet(names) : [];
}

/** The models this field can name: the sample's own, else those of the cookbook profile beside it. */
function modelChoices(property: ts.PropertyAssignment, cookbook: Cookbook): CodeChoice[] {
	const object = property.parent;
	const own = declaredNames(object, 'models');
	if (own.length > 0) return own.map((value) => ({ value }));
	const id = stated(object, 'profile');
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

/** The profile type the object is under: the nearest `type` it sits in, else the sample's frame. */
function profileTypeAt(
	object: ts.ObjectLiteralExpression,
	frame: SnippetFrame | undefined,
): string {
	for (let at: ts.Node = object; !ts.isSourceFile(at); at = at.parent) {
		const type = ts.isObjectLiteralExpression(at) ? stated(at, 'type') : undefined;
		if (type) return type;
	}
	return frame?.split(':')[1] ?? 'text';
}

/** The fields of a model that move together, read by the catalog path. */
function modelField(property: ts.PropertyAssignment): ModelField | undefined {
	const match = /^models\.\*\.(provider|protocol|apiId|keySlot)$/.exec(
		catalogField(property)?.path ?? '',
	);
	return match?.[1] as ModelField | undefined;
}

/** How this model can run: as it stands, and as the cookbook runs models of its type. Protocol options or a fallback key hold it to its protocol. */
function modelRoutes(
	object: ts.ObjectLiteralExpression,
	frame: SnippetFrame | undefined,
	cookbook: Cookbook,
): CodeRoute[] {
	const own: CodeRoute = {};
	for (const field of ['provider', 'protocol', 'apiId', 'keySlot'] as const) {
		const value = stated(object, field);
		if (value) own[field] = value;
	}
	const type = profileTypeAt(object, frame);
	const held = sibling(object, 'options') || sibling(object, 'fallbackKeySlot');
	const routes = cookbook.bindings
		.filter((each) => each.type === type && (!held || each.protocol === own.protocol))
		.map(
			(each): CodeRoute => ({
				provider: each.provider,
				protocol: each.protocol,
				apiId: each.apiId,
				keySlot: providerSlots(each.provider, cookbook)[0]?.value,
			}),
		);
	const seen = new Set<string>();
	return [own, ...routes].filter(({ provider, protocol, apiId }) => {
		const route = JSON.stringify([provider, protocol, apiId]);
		if (seen.has(route)) return false;
		seen.add(route);
		return true;
	});
}

/** The key slots the cookbook reads on a provider. */
function providerSlots(provider: string | undefined, cookbook: Cookbook): CodeChoice[] {
	const held = cookbook.providers.find((each) => each.id === provider);
	return cookbook.distinct([
		held?.keySlot,
		held?.fallbackKeySlot,
		...cookbook.bindings
			.filter((binding) => binding.provider === provider)
			.flatMap((binding) => [binding.keySlot, binding.fallbackKeySlot]),
	]);
}

/** The cookbook's profiles of the same type as this one: a run takes one type of profile. */
function profileChoices(current: string, cookbook: Cookbook): CodeChoice[] {
	const type = cookbook.profiles.find((profile) => profile.value === current)?.type;
	return cookbook.profiles.filter((profile) => profile.type === type);
}

/** What the cookbook offers for a field that names something, by its catalog path or declared type. */
function namedChoices(
	checker: ts.TypeChecker,
	property: ts.PropertyAssignment,
	current: string,
	cookbook: Cookbook,
): CodeChoice[] {
	const field = catalogField(property);
	if (field?.path === 'models.*.fallbackKeySlot') {
		return providerSlots(stated(property.parent, 'provider'), cookbook);
	}
	if (field?.path === 'models.*.defaultEffort') {
		return declaredNames(property.parent, 'efforts').map((value) => ({ value }));
	}
	if (field?.path === 'models.*.compaction.profile') return profileChoices(current, cookbook);
	switch (field?.meta?.type ?? declaredName(checker, property)) {
		case 'ProfileId':
			return profileChoices(current, cookbook);
		case 'ModelId':
			return modelChoices(property, cookbook);
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
	const named = property && !inArray ? namedChoices(checker, property, current, cookbook) : [];
	const choices = typed.length > 1 ? typed : named;
	if (choices.length === 0) return [];
	const all = choices.some((choice) => choice.value === current)
		? choices
		: [{ value: current }, ...choices];
	return all.length > 1 ? all : [];
}

/** The sample's slots, each at its place in the sample's own code, and the routes of its models. */
function samplePlaces(
	file: ts.SourceFile,
	sample: { code: string; frame?: SnippetFrame; program: SampleProgram },
	checker: ts.TypeChecker,
	cookbook: Cookbook,
): Pick<CodeSlots, 'slots' | 'models'> {
	const starts = rowStarts(sample.code.split('\n'));
	// why: the program's wrapper lines sit outside this list, so a line may have no row.
	const sourceRows: readonly (number | undefined)[] = sample.program.sourceLines;
	const codeAt = (position: number): number | undefined => {
		const { line, character } = file.getLineAndCharacterOfPosition(position);
		const row = sourceRows[line - sample.program.firstLine];
		const start = row === undefined ? undefined : starts[row];
		return start === undefined ? undefined : start + character;
	};
	const slots: CodeSlot[] = [];
	const models: CodeRoute[][] = [];
	const modelOf = new Map<ts.ObjectLiteralExpression, number>();
	const modelAt = (object: ts.ObjectLiteralExpression): number => {
		const known = modelOf.get(object);
		if (known !== undefined) return known;
		modelOf.set(object, models.length);
		models.push(modelRoutes(object, sample.frame, cookbook));
		return models.length - 1;
	};
	const visit = (node: ts.Node) => {
		if (ts.isStringLiteralLike(node)) {
			const value = valuePlace(node);
			const start = codeAt(node.getStart(file));
			if (start !== undefined && isSetValue(value)) {
				const end = start + node.getWidth(file);
				const property = ownerProperty(value);
				const field = property?.initializer === value ? modelField(property) : undefined;
				if (property && field) {
					const route = { field, model: modelAt(property.parent) };
					slots.push({ start, end, choices: [], route });
				} else {
					const choices = choicesOf(checker, value, node.text, cookbook);
					if (choices.length > 0) slots.push({ start, end, choices });
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	return { slots, models };
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
				frame,
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
			const { slots, models } = samplePlaces(source, sample, checker, cookbook);
			const tools = /\ballow\s*:\s*\[/.test(sample.code) ? cookbook.tools : [];
			if (slots.length === 0 && tools.length === 0) continue;
			chapters.set(slug, { ...chapters.get(slug), [sample.code]: { slots, tools, models } });
		}
		return chapters;
	} finally {
		rmSync(folder, { recursive: true, force: true });
	}
}
