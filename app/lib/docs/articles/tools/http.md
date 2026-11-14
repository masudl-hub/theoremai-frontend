---
title: HTTP Tools
updated: 2026-11-13
summary: Declarative REST API tools with URL argument mapping, request limits, timeouts, and media.
entry: src/kernel/tools/remote.ts
covers: src/kernel/tools/remote.ts, src/kernel/tools/http-limit.ts, src/kernel/tools/image-fetch.ts
cover: /imagery/th30_mistyforest.png
coverAlt: Dense mountain evergreen forest enveloped in early morning mist
coverPosition: 50% 50%
---

An `http` tool sends an HTTP request to an external REST endpoint with no handler code. Theorem validates the input with Zod, places the arguments in the URL path, the query string or the JSON body, and checks the response body against the output schema.

```figure
{
  "kind": "lanes",
  "still": {
    "src": "/imagery/th30_meltedbronze.png",
    "position": "50% 50%"
  },
  "caption": "The scout's list_arxiv. The model fills in arguments, and the mapping says where each one goes in the request.",
  "lanes": [
    "The model",
    "mapping",
    "The service"
  ],
  "steps": [
    {
      "lane": "The model",
      "label": "{ search_query: 'all:episodic' }",
      "text": "Theorem validates the input with Zod.",
      "kind": "model"
    },
    {
      "lane": "mapping",
      "label": "queryParams: ['search_query']",
      "text": "pathParams fills {name} placeholders. bodyParam names the JSON body.",
      "kind": "tool"
    },
    {
      "lane": "The service",
      "label": "…&search_query=all%3Aepisodic",
      "text": "GET to export.arxiv.org. The argument goes after the query already in endpoint.",
      "kind": "egress"
    },
    {
      "lane": "The model",
      "label": "The checked response",
      "text": "Theorem checks the response body against the output schema.",
      "kind": "ingress"
    }
  ]
}
```

## Registering an HTTP Tool

Register HTTP tools using `registerTool()` with `type: 'http'`. This is the tool `research.scout` uses to find papers:

```ts frame=tool:http
name: 'list_arxiv',
// ...
endpoint:
	'https://export.arxiv.org/api/query?sortBy=submittedDate&sortOrder=descending&max_results=10',
method: 'GET',

mapping: {
	queryParams: ['search_query'],
},
// ...
```

## Argument Mapping (`mapping`)

The `mapping` configuration defines where model-generated arguments are placed in the outgoing HTTP request:

* **`pathParams`**: Names arguments that replace `{name}` placeholders in `endpoint`. A placeholder left unfilled fails the call. The scout's `read_model_card` sets `pathParams: ['owner', 'name']` for `https://huggingface.co/{owner}/{name}/raw/main/README.md`.
* **`queryParams`**: Names arguments appended to the URL query string, after any query already in `endpoint` (e.g., `&search_query=all%3Aepisodic`).
* **`bodyParam`**: For methods other than `GET`, names a single input field sent as the whole JSON body. If omitted, all arguments not consumed by `pathParams` or `queryParams` are sent as a JSON object.

## Upstream Protection & Bounds

Remote HTTP services often enforce rate limits or answer slowly. Theorem bounds outbound calls with three controls. Each one left out is no limit:

```ts frame=tool:http
name: 'list_arxiv',
// ...
// The scout's tools set no bounds. Add these to fit the service:
limit: { requests: 60, windowMs: 60_000 },
timeoutMs: 8000,
maxResponseBytes: 1024 * 1024,
// ...
```

* **`limit`**: The service's own limit (`requests` per `windowMs`); the kernel keeps this tool's requests within it. A request holds its place from when it is sent until one window after its answer. A `429` with `Retry-After` holds every request of the tool until then. A call waits up to 5 seconds for a place; past that it sends nothing and fails with `rate_limit_window`.
* **`timeoutMs`**: How long the service may take to answer, reading the body included. The clock starts at send, so waiting for a `limit` place does not count. A call past it fails with `timeout`.
* **`maxResponseBytes`**: The most of a response body the kernel reads. A body past it fails the call with `response_too_large`.
* **Who Sends It**: The kernel sends the request with `runTurn`'s `fetch`, once its [network checks](/docs/guardrails/network) pass. Left out, it uses the global `fetch`.

## Media (`media`)

When an HTTP tool returns data that names pictures (for example satellite imagery or product photos), set the `media` hook to say which ones the model and the person see. Each entry is one of two kinds:

- **`{ url }`**: an https address of a picture the model should see. The kernel fetches it and hands it to the model as an image part. Add `sent: true` to show it to the person too.
- **A reference, `{ type, mimeType, uri }`**: a file the person is shown through your app's own resolver, such as a `gs://` object. The model never reads it, and the kernel never fetches it, so a private address never reaches a provider.

```text
// ...
media: (output) => output.results.map((item) => ({ url: item.thumbnailUrl, sent: true })),

imageLimits: {
	count: 3,                 // Fetch the first 3 pictures named
	bytes: 1024 * 1024,       // Max 1 MiB per picture
	totalBytes: 2 * 1024 * 1024, // Max 2 MiB across all pictures
	timeoutMs: 4000,          // 4s timeout per picture
},
// ...
```

Each `imageLimits` field left out is no limit, and references are not counted. Theorem fetches each picture after the result passes the output guard, through the profile's network policy, without the tool's credentials. Only PNG, JPEG, GIF and WebP images are kept. An address that is not https, a reference that is not a valid part, or an image that is blocked, too slow, too large, past `totalBytes` or not an image, is left out and reported in one `images_unfetched` warning, which says why; the tool call itself does not fail. Images named past `count` are not fetched.

## Related Guides

* **[Tools & Execution Pipeline](/docs/tools)**: Universal tool attributes, pipeline stages, and dynamic loading.
* **[MCP Tools](/docs/tools/mcp)**: Connecting Model Context Protocol servers.
* **[Auth & Credentials](/docs/tools/auth)**: Authenticating HTTP tools with API keys or OAuth.
* **[Network Safety & Guardrails](/docs/guardrails/network)**: Restricting outbound destination domains and IP ranges.
