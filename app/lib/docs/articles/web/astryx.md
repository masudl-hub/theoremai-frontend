---
title: Astryx UI Components
updated: 2026-10-26
summary: Ready-made Astryx components for chat, live, decision, embedding and host profiles.
entry: react/src/index.ts
covers: react
cover: /imagery/th30_geothermal.png
coverAlt: Smoking geothermal steam vents across colorful volcanic terrain
coverPosition: 50% 50%
---

The headless hooks leave all markup to you. To draw a chat from them, you build the transcript, the composer with its files and voice notes, the tool gates, and the waveform of a live call yourself.

Theorem provides a ready-made UI layer built on [Astryx](https://www.npmjs.com/package/@astryxdesign/core) in `@theoremjs/react/ui` and `@theoremjs/react/live`. These components announce failures and status changes to screen readers, drop their motion when the visitor asks for reduced motion, and take their wording from a catalog you can override per locale.

## Component Catalog

| Component | Profile Type | Package Entry | Description |
| :--- | :--- | :--- | :--- |
| [`<TheoremChat />`](#1-conversational-chat-theoremchat) | `text`, `image`, `speech` | `@theoremjs/react/ui` | Chat with transcript, composer, slot selectors, and tool gates answered in the transcript |
| [`<LiveRunner />`](#2-realtime-voice--video-liverunner) | `live` | `@theoremjs/react/live` | Voice and video call with the ink waveform, camera flip, a captions column, and tool gates in a dialog |
| [`<TheoremDecision />`](#3-decision-evaluations-theoremdecision) | `decision` | `@theoremjs/react/ui` | The state as fields or JSON, image attachments, and the answers with their confidence, scores and boxes |
| [`<TheoremEmbedding />`](#4-vector-search--embeddings-theoremembedding) | `embedding` | `@theoremjs/react/ui` | Split pasted text or drop files, index them, search by cosine similarity, and turn the index in a 3D view |
| [`<TheoremHost />`](#5-host--mcp-tools-theoremhost) | `host` | `@theoremjs/react/ui` | Console to pick one of the host's tools, fill in its request, run it, and answer its gates in place |

## 1. Conversational Chat (`<TheoremChat />`)

`<TheoremChat />` talks to a profile served by `createTheoremHandler`, at `/api/theorem` unless you set `endpoint`. It asks the host to describe the profile and draws the chat from that description. A `live` profile goes to `<LiveRunner />` instead.

### Lean Consumption

```tsx
import { TheoremChat } from '@theoremjs/react/ui';

export function VesselDispatchChat() {
	return <TheoremChat endpoint="/api/theorem" />;
}
```

### Context, Slots & Page Tools

```tsx
import { TheoremChat } from '@theoremjs/react/ui';

export function VesselDispatchChat() {
	return (
		<TheoremChat
			endpoint="/api/theorem"
			slots={{ sector: 'north-basin' }}
			context={{ activeVessel: 'VSL-409', quayPosition: 12 }}
			pageTools={{
				highlightQuay: async (args) => {
					document.getElementById(`quay-${args.quayId}`)?.scrollIntoView();
					return { output: { success: true } };
				},
			}}
			trace={true}
			usage={true}
		/>
	);
}
```

- **`slots`**: The value for each of the profile's slots, sent with every turn. A slot you name is fixed to that value. A slot you leave out gets a selector in the composer bar, which starts at its first allowed value.
- **`context`**: Any JSON the page wants the agent to know. The latest value goes with every turn, and the profile's `inputs.context.from` must list `client`.
- **`pageTools`**: A function for each tool the profile declares with `answeredBy: 'page'`, by name. The reply waits while the page answers, and no one is asked.
- **`trace`**: Drives the trace from your own control, and the built-in toggle hides. Omit it to keep the toggle. The trace needs a profile that records traces.
- **`usage`**: Shows tokens and cost: each reply's total under it, and, on an agent tool's call row, what that agent used. Off by default.

## 2. Realtime Voice & Video (`<LiveRunner />`)

`<LiveRunner />` runs calls for a `live` profile. Before a call, it offers a voice or video call. In a call, it shows the agent over the ink waveform, the captions in a column on the right, the call controls in a toolbar, and tool gates in a dialog. The call streams the microphone and camera over a WebSocket relay and plays the model's 24kHz audio without gaps.

```tsx
import { LiveRunner } from '@theoremjs/react/live';
import { useTheoremInterface, createHttpTransport } from '@theoremjs/react';

const transport = createHttpTransport({ endpoint: '/api/theorem' });

export function HarborCallView() {
	const described = useTheoremInterface(transport);

	if (described.status !== 'ready' || described.iface.type !== 'live') {
		return <div>Loading...</div>;
	}

	return (
		<LiveRunner
			iface={described.iface}
			connection={() => ({ profile: 'harbor.live_dispatch' })}
		/>
	);
}
```

`connection` returns what the call opens: a profile the relay knows by id, or your own `openMessage` for the relay. The relay is `/api/live/relay` on the page's host. To open another socket, return `createSocket`.

`<LiveRunner />` includes:
- **Waveform**: `InkWaveform`, driven by the microphone and model audio levels.
- **Camera Flip & Preview**: Manages front and rear camera selection (`facingMode: 'user' | 'environment'`) and downsamples frames to 640x480 at 400ms intervals.
- **Tool gates**: An `ApprovalCard` in a dialog over the call when a tool waits for a person's answer.
- **Captions**: `LiveCaptionsPanel` in the right-hand column: the call's transcript and a text composer.

## 3. Decision Evaluations (`<TheoremDecision />`)

`<TheoremDecision />` is a drop-in surface for a `decision` profile served by `createTheoremDecisionHandler`, at `/api/decision` unless you set `endpoint`. It shows the state as fields or JSON, takes image attachments, and shows the answers with their confidence, scores and boxes. Decide runs with the button or ⌘/Ctrl+Enter.

```tsx
import { TheoremDecision } from '@theoremjs/react/ui';

export function CargoSafetyConsole() {
	return (
		<TheoremDecision
			endpoint="/api/decision"
			defaultState={JSON.stringify(
				{ vesselId: 'VSL-409', grossTonnage: 32000, hazardousCargo: true },
				null,
				2,
			)}
		/>
	);
}
```

## 4. Vector Search & Embeddings (`<TheoremEmbedding />`)

`<TheoremEmbedding />` is a drop-in search over an `embedding` profile served by `createTheoremEmbeddingHandler`, at `/api/embedding` unless you set `endpoint`. Paste text and split it into paragraphs, or drop files. Index embeds them as documents in as many requests as the profile's limits need. Search embeds a query and ranks the documents by cosine similarity. Every request shows as JSON and in the trace.

```tsx
import { TheoremEmbedding } from '@theoremjs/react/ui';

export function HarborSearchBench() {
	return (
		<TheoremEmbedding
			endpoint="/api/embedding"
			defaultText="Berth 4 clearance protocols require tugboat escort for vessels over 20,000 DWT."
			defaultQuery="When is tugboat escort required?"
		/>
	);
}
```

Once the documents are indexed, `EmbeddingSpaceView` draws the index as a space. Each document is a dot, placed by the three directions the vectors differ most along. A line joins a document to its nearest neighbour when that pair stands out, and a query's dot has a line to each match that stands out. Drag to turn it, and point at a dot to name its document.

## 5. Host & MCP Tools (`<TheoremHost />`)

`<TheoremHost />` is a drop-in console for a `host` profile served by `createTheoremHostHandler`, at `/api/host` unless you set `endpoint`. Pick a tool (a function, an HTTP endpoint or an MCP server's tool), fill in the request its input schema draws, and Run it with the button or ⌘/Ctrl+Enter. The response is laid out from what the tool returned: figures, charts, images and the data. Gates are answered in place.

```tsx
import { TheoremHost } from '@theoremjs/react/ui';

export function HarborToolWorkbench() {
	return <TheoremHost endpoint="/api/host" />;
}
```

## 6. Composable UI Primitives

When building hybrid interfaces that combine custom layouts with pre-built Theorem elements, import sub-components directly from `@theoremjs/react/ui`:

```tsx
import {
	ChatTranscript,
	ChatComposerBar,
	ApprovalCard,
	InkWaveform,
	LiveCaptionsPanel,
} from '@theoremjs/react/ui';
```

- **`<ChatTranscript />`**: Theorem transcript blocks drawn as Astryx chat messages.
- **`<ChatComposerBar />`**: The Astryx composer wired to send, stop, queue, steer and stash. For a live profile, it is the text field and send button only.
- **`<ApprovalCard />`**: The card for a tool gate: the tool, its access, the gate's summary and the call's input, and an answer of `'allow'` or `'deny'`.
- **`<InkWaveform />`**: Waveform bars driven by microphone and speaker levels.
- **`<LiveCaptionsPanel />`**: A live call's captions: the transcript, an empty state, and the text composer.

## 7. Theming & Styling

Theorem UI is styled with Astryx. `@theoremjs/react/ui` and `@theoremjs/react/live` import their stylesheets themselves, in Astryx's order: `@astryxdesign/core/reset.css`, `@astryxdesign/core/astryx.css`, then the Theorem theme sheet. Your bundler must resolve CSS imports.

The reset lives in `@layer reset`, so any unlayered CSS of yours still wins over it.

### Theme Extensions

The `theme` prop takes any `defineTheme` result. Extend `theoremTheme` like any Astryx theme, or wrap your app in your own `<Theme>` and omit the prop:

```ts
import { defineTheme } from '@astryxdesign/core/theme';
import { theoremTheme } from '@theoremjs/react/ui/theme';

export const maritimeTheme = defineTheme({
	name: 'maritime',
	extends: theoremTheme,
	tokens: {
		'--color-accent': '#0066cc',
		'--radius-chat': '8px',
	},
});
```

Pass the customized theme and mode directly to components:

```tsx
<TheoremChat endpoint="/api/theorem" theme={maritimeTheme} mode="dark" />
```

### Layout Variables

Adjust pane geometry using scoped CSS custom properties:
- `--theorem-pane-background`: The background of raised side panes. The default is `--color-background-card`.
- `--theorem-pane-edge`: A raised pane's gap from the page's end and bottom edges. The default is `12px`. Set it to `0` when your page already insets its content.

## 8. Localized Labels & ICU Overrides

All user-visible text in Astryx components is defined in an internationalized message catalog. Theorem messages use `@theorem.*` keys, while Astryx core messages use `@astryx.*` keys.

Override messages per locale using the `labels` prop:

```tsx
<TheoremChat
	endpoint="/api/theorem"
	labels={{
		en: {
			'@theorem.chat.greeting': 'Harbor Dispatch Console',
			'@theorem.composer.placeholder': 'Send instruction to @{handle}...',
			'@astryx.chatSendButton.send': 'Dispatch',
		},
		fr: {
			'@theorem.chat.greeting': 'Console de régulation portuaire',
			'@theorem.composer.placeholder': 'Envoyer un message à @{handle}...',
			'@astryx.chatSendButton.send': 'Envoyer',
		},
	}}
/>
```

The locale is the one your Astryx `InternationalizationProvider` sets, `en` by default. Components check the table before it renders, and throw, naming the locale and key, when:
1. A locale is not a BCP 47 locale.
2. A key does not start with `@theorem.` or `@astryx.`, or a `@theorem.*` key is not in `THEOREM_UI_CATALOG`.
3. A message is not valid ICU.
4. A `@theorem.*` message uses a value its key does not take. `@theorem.composer.placeholder` takes `{handle}`; `@theorem.chat.greeting` takes none.

## Related Guides

* **[Text Profiles](/docs/profiles/text)**: Declaring inputs, models, and tools for conversational agents.
* **[Headless Web & Transport](/docs/web)**: Web-standard server route dispatchers and conversation stores.
* **[Headless React Hooks](/docs/web/react-hooks)**: Building unstyled interfaces using Theorem hooks.
* **[Realtime Voice & Video](/docs/web/realtime)**: Audio worklets, Web Audio playback, and video streaming.
