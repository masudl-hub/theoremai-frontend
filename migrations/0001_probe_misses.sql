-- Guardrail probes no guardrail acted on, as sent, for review.
CREATE TABLE probe_misses (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	at TEXT NOT NULL,
	boundary TEXT NOT NULL,
	text TEXT NOT NULL,
	-- The draft's guardrails as written (JSON).
	guardrails TEXT NOT NULL,
	-- The turn's guardrail events (JSON): none, or ones that were no hit.
	events TEXT NOT NULL,
	-- The text past its boundary, when it went on.
	passed TEXT,
	kernel TEXT NOT NULL
);

CREATE INDEX probe_misses_at ON probe_misses (at);
