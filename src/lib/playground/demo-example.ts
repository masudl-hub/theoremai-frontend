import type { ToolSpecData } from './types';

/** System prompt for the playground demo agent. */
export const DEMO_CONCIERGE_SYSTEM = `You are Travel Concierge, a playground demo agent that exercises Theorum tools.

Workflow:
1. Resolve place names with geocode_city before calling get_weather (use latitude/longitude from results).
2. Use convert_currency for FX questions (Frankfurter rates).
3. Use get_pokemon when asked about Pokémon.
4. Call discover_tools when the user wants jokes, cat facts, or "bonus" entertainment — then use those tools.
5. Use plan_day to draft a lightweight itinerary after you have weather context.

Rules:
- Never invent weather, rates, or API data — call the tool.
- Prefer geocode_city → get_weather for city weather questions.
- Keep answers concise and cite which tools you used.`;

type DemoToolSeed = { id: string; data: ToolSpecData };

const WEATHER_OUTPUT = `{
  "type": "object",
  "properties": {
    "latitude": { "type": "number" },
    "longitude": { "type": "number" },
    "current_weather": {
      "type": "object",
      "properties": {
        "temperature": { "type": "number" },
        "windspeed": { "type": "number" },
        "weathercode": { "type": "number" },
        "time": { "type": "string" }
      }
    }
  },
  "required": ["current_weather"]
}`;

const GEOCODE_OUTPUT = `{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "latitude": { "type": "number" },
          "longitude": { "type": "number" },
          "country_code": { "type": "string" }
        }
      }
    }
  }
}`;

const FX_OUTPUT = `{
  "type": "object",
  "properties": {
    "amount": { "type": "number" },
    "base": { "type": "string" },
    "date": { "type": "string" },
    "rates": { "type": "object" }
  },
  "required": ["amount", "base", "rates"]
}`;

const POKEMON_OUTPUT = `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "height": { "type": "number" },
    "weight": { "type": "number" },
    "types": { "type": "array" }
  }
}`;

const JOKE_OUTPUT = `{
  "type": "object",
  "properties": {
    "setup": { "type": "string" },
    "punchline": { "type": "string" },
    "type": { "type": "string" }
  },
  "required": ["setup", "punchline"]
}`;

const CAT_FACT_OUTPUT = `{
  "type": "object",
  "properties": {
    "fact": { "type": "string" },
    "length": { "type": "number" }
  },
  "required": ["fact"]
}`;

/** Tool facet seeds for the travel concierge demo (positions assigned by graph layout). */
export function demoToolSeeds(): DemoToolSeed[] {
	return [
		{
			id: 'tool-geocode-city',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'geocode_city',
				toolType: 'http',
				description:
					'Resolve a city or place name to coordinates using the Open-Meteo geocoding API.',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T0',
				paths: '*',
				endpoint: 'https://geocoding-api.open-meteo.com/v1/search?count=1',
				method: 'GET',
				queryParams: 'name',
				inputJson: `{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "City or place name, e.g. Paris or San Francisco" }
  },
  "required": ["name"]
}`,
				outputJson: GEOCODE_OUTPUT,
			},
		},
		{
			id: 'tool-get-weather',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'get_weather',
				toolType: 'http',
				description:
					'Fetch current weather for coordinates via Open-Meteo. Use geocode_city first when the user names a city.',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T0',
				paths: '*',
				endpoint: 'https://api.open-meteo.com/v1/forecast?current_weather=true',
				method: 'GET',
				queryParams: 'latitude, longitude',
				inputJson: `{
  "type": "object",
  "properties": {
    "latitude": { "type": "number" },
    "longitude": { "type": "number" }
  },
  "required": ["latitude", "longitude"]
}`,
				outputJson: WEATHER_OUTPUT,
			},
		},
		{
			id: 'tool-convert-currency',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'convert_currency',
				toolType: 'http',
				description:
					'Convert an amount between ISO currencies using live ECB reference rates (Frankfurter API).',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T0',
				paths: '*',
				endpoint: 'https://api.frankfurter.app/latest',
				method: 'GET',
				queryParams: 'from, to, amount',
				inputJson: `{
  "type": "object",
  "properties": {
    "from": { "type": "string", "description": "Source currency code, e.g. USD" },
    "to": { "type": "string", "description": "Target currency code, e.g. EUR" },
    "amount": { "type": "number", "description": "Amount in source currency" }
  },
  "required": ["from", "to", "amount"]
}`,
				outputJson: FX_OUTPUT,
			},
		},
		{
			id: 'tool-get-pokemon',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'get_pokemon',
				toolType: 'http',
				description: 'Look up a Pokémon by name from the public PokéAPI.',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T0',
				paths: '*',
				endpoint: 'https://pokeapi.co/api/v2/pokemon/{name}',
				method: 'GET',
				pathParams: 'name',
				inputJson: `{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Pokémon name, e.g. pikachu" }
  },
  "required": ["name"]
}`,
				outputJson: POKEMON_OUTPUT,
			},
		},
		{
			id: 'tool-discover-tools',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'discover_tools',
				toolType: 'function',
				description:
					'Discover bonus entertainment tools (cat facts, jokes) for this session. Call before using get_cat_fact or tell_joke.',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T0',
				paths: '*',
				inputJson: `{ "type": "object", "properties": {} }`,
				outputJson: `{
  "type": "object",
  "properties": {
    "loaded": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["loaded"]
}`,
				stubOutputJson: `{ "loaded": ["get_cat_fact", "tell_joke"] }`,
			},
		},
		{
			id: 'tool-plan-day',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'plan_day',
				toolType: 'function',
				description:
					'Draft a simple day plan from destination context and user preferences (playground stub).',
				category: 'demo',
				access: 'read-write',
				permission: 'auto',
				loadTier: 'T0',
				paths: '*',
				inputJson: `{
  "type": "object",
  "properties": {
    "destination": { "type": "string" },
    "focus": { "type": "string", "description": "e.g. museums, food, outdoors" }
  },
  "required": ["destination"]
}`,
				outputJson: `{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "stops": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["summary", "stops"]
}`,
				stubOutputJson: `{
  "summary": "A balanced day mixing local culture, a weather-aware outdoor block, and an easy evening.",
  "stops": [
    "Morning: coffee near the main square",
    "Midday: flagship museum or gallery",
    "Afternoon: walkable neighborhood based on weather",
    "Evening: casual dinner with a local specialty"
  ]
}`,
			},
		},
		{
			id: 'tool-cat-fact',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'get_cat_fact',
				toolType: 'http',
				description: 'Return a random cat fact (requires discover_tools first — T2 tool).',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T2',
				paths: '*',
				endpoint: 'https://catfact.ninja/fact?max_length=160',
				method: 'GET',
				inputJson: `{ "type": "object", "properties": {} }`,
				outputJson: CAT_FACT_OUTPUT,
			},
		},
		{
			id: 'tool-tell-joke',
			data: {
				kind: 'toolSpec',
				expanded: false,
				toolName: 'tell_joke',
				toolType: 'http',
				description: 'Tell a random joke (requires discover_tools first — T2 tool).',
				category: 'demo',
				access: 'read-only',
				permission: 'auto',
				loadTier: 'T2',
				paths: '*',
				endpoint: 'https://official-joke-api.appspot.com/random_joke',
				method: 'GET',
				inputJson: `{ "type": "object", "properties": {} }`,
				outputJson: JOKE_OUTPUT,
			},
		},
	];
}
