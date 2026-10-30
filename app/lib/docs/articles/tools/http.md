---
title: HTTP Tools
updated: 2026-10-29
summary: Declarative REST API tools with URL argument mapping, request limits, timeouts, and image fetching.
entry: src/kernel/tools/remote.ts
covers: src/kernel/tools/remote.ts, src/kernel/tools/http-limit.ts, src/kernel/tools/image-fetch.ts
cover: /imagery/th30_mistyforest.png
coverAlt: Dense mountain evergreen forest enveloped in early morning mist
coverPosition: 50% 50%
---

An `http` tool sends an HTTP request to an external REST endpoint with no handler code. Theorem validates the input with Zod, places the arguments in the URL path, the query string or the JSON body, and checks the response body against the output schema.

## Registering an HTTP Tool

Register HTTP tools using `registerTool()` with `type: 'http'`:

```ts
import { registerTool } from '@theoremjs/agents';
import { z } from 'zod';

export const marineWeatherTool = registerTool({
	type: 'http',
	name: 'get_marine_weather',
	description: 'Retrieve current wave height, wind speed, and water temperature for a port.',
	category: 'maritime',
	access: 'read-only',
	paths: ['*'],
	loadTier: 'T0',
	permission: 'auto',

	endpoint: 'https://api.oceanweather.example/v1/ports/{portCode}/conditions',
	method: 'GET',

	mapping: {
		pathParams: ['portCode'],
		queryParams: ['units'],
	},

	limit: { requests: 60, windowMs: 60_000 },
	timeoutMs: 8000,
	maxResponseBytes: 1024 * 1024,

	input: z.object({
		portCode: z.string().describe('Three-letter port identifier'),
		units: z.enum(['metric', 'imperial']).default('metric'),
	}),

	output: z.object({
		waveHeightMeters: z.number(),
		windSpeedKnots: z.number(),
		waterTempCelsius: z.number(),
	}),
});
```

## Argument Mapping (`mapping`)

The `mapping` configuration defines where model-generated arguments are placed in the outgoing HTTP request:

* **`pathParams`**: Names arguments that replace `{name}` placeholders in `endpoint`. A placeholder left unfilled fails the call.
* **`queryParams`**: Names arguments appended to the URL query string (e.g., `?units=metric`).
* **`bodyParam`**: For methods other than `GET`, names a single input field sent as the whole JSON body. If omitted, all arguments not consumed by `pathParams` or `queryParams` are sent as a JSON object.

## Upstream Protection & Bounds

Remote HTTP services often enforce rate limits or answer slowly. Theorem bounds outbound calls with three controls. Each one left out is no limit:

* **`limit`**: The service's own limit (`requests` per `windowMs`); the kernel keeps this tool's requests within it. A request holds its place from when it is sent until one window after its answer. A `429` with `Retry-After` holds every request of the tool until then. A call waits up to 5 seconds for a place; past that it sends nothing and fails with `rate_limit_window`.
* **`timeoutMs`**: How long the service may take to answer, reading the body included. The clock starts at send, so waiting for a `limit` place does not count. A call past it fails with `timeout`.
* **`maxResponseBytes`**: The most of a response body the kernel reads. A body past it fails the call with `response_too_large`.

## Image Fetching (`images`)

When an HTTP tool returns data that names image URLs (for example satellite imagery or product photos), set the `images` hook to return the https addresses the model should see. The kernel fetches each one and hands it to the model as an image part:

```text
// ... inside http tool definition
images: (output) => output.results.map((item) => item.thumbnailUrl),

imageLimits: {
	count: 3,                 // Fetch the first 3 images named
	bytes: 1024 * 1024,       // Max 1 MiB per image
	totalBytes: 2 * 1024 * 1024, // Max 2 MiB across all images
	timeoutMs: 4000,          // 4s timeout per image
},
```

Each `imageLimits` field left out is no limit. Theorem fetches each image after the result passes the output guard, through the profile's network policy, without the tool's credentials. Only PNG, JPEG, GIF and WebP images are kept. An address that is not https, or an image that is blocked, too slow, too large, past `totalBytes` or not an image, is left out and reported in one `images_unfetched` warning; the tool call itself does not fail. Images named past `count` are not fetched.

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Universal tool attributes, pipeline stages, and dynamic loading.
* **[MCP Tools](/docs/tools/mcp)**: Connecting Model Context Protocol servers.
* **[Auth & Credentials](/docs/tools/auth)**: Authenticating HTTP tools with API keys or OAuth.
* **[Network Safety & Guardrails](/docs/guardrails/network)**: Restricting outbound destination domains and IP ranges.
