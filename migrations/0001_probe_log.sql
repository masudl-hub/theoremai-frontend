-- Texts sent through the guardrail tester that at least one boundary let through
-- untouched, as sent, for review.
CREATE TABLE probes (
	id TEXT PRIMARY KEY,
	at TEXT NOT NULL,
	text TEXT NOT NULL,
	-- The draft's guardrails as written (JSON).
	guardrails TEXT NOT NULL,
	kernel TEXT NOT NULL
);

CREATE INDEX probes_at ON probes (at);

-- What each boundary's guardrails did with a probe's text: one row a boundary.
CREATE TABLE probe_answers (
	probe TEXT NOT NULL REFERENCES probes (id),
	boundary TEXT NOT NULL,
	-- passed, flagged, redacted or blocked.
	status TEXT NOT NULL,
	-- tainted or steered, when a call was made after a remote read.
	taint TEXT,
	-- The turn's guardrail events (JSON).
	events TEXT NOT NULL,
	-- The text past its boundary, when it went on.
	passed TEXT,
	PRIMARY KEY (probe, boundary)
);

CREATE INDEX probe_answers_status ON probe_answers (boundary, status);
