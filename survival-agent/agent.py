"""Der Survival Agent: trifft pro Tick eine Entscheidung.

Zwei Entscheider:
  * ClaudeDecider  - fragt die Anthropic API (Claude)
  * MockDecider    - einfache Regel-Logik, kostenlos, fuer Tests (--mock)
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any

from economy import COST_PER_THINK, MODE_RULES, Job, MarketOffer, Mode

# Teures vs. billiges Modell - das Kostenmodell der Simulation unterscheidet
# beide Stufen, siehe COST_PER_THINK in economy.py.
EXPENSIVE_MODEL = os.getenv("EXPENSIVE_MODEL", "claude-opus-5")
CHEAP_MODEL = os.getenv("CHEAP_MODEL", "claude-haiku-4-5")

MAX_API_CALLS = 200  # Sicherheitslimit pro Lauf


class ApiLimitReached(RuntimeError):
    """Wird geworfen, wenn das API-Aufruf-Limit erreicht ist."""


@dataclass
class Decision:
    action: str                 # "take_jobs" | "gamble" | "idle"
    job_ids: list[str] = field(default_factory=list)
    reason: str = ""
    source: str = "mock"        # "claude" oder "mock"

    def summary(self) -> str:
        if self.action == "take_jobs":
            return f"take_jobs({', '.join(self.job_ids) or '-'})"
        return self.action


SYSTEM_PROMPT = """Du bist ein "Survival Agent" in einer Simulation mit Spielgeld.
Dein einziges Ziel: moeglichst lange ueberleben, also das Guthaben ueber 0 halten.

Regeln:
- Jeder Tick kostet Grundkosten plus Denkkosten. Nichtstun kostet also auch.
- Jobs haben Belohnung, Erfolgswahrscheinlichkeit und Aufwandskosten. Der Aufwand
  faellt auch bei Misserfolg an.
- Der Markt (Casino/Trading) hat hohe Varianz und meist negativen Erwartungswert.
- Du darfst pro Tick hoechstens so viele Jobs annehmen, wie "max_aktionen" erlaubt.
- Im Modus "critical" ist der Markt verboten.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown und ohne Zusatztext:
{"action": "take_jobs" | "gamble" | "idle",
 "job_ids": ["<id>", ...],
 "reason": "<eine kurze Begruendung, max. 20 Woerter>"}

"job_ids" nur bei action "take_jobs" fuellen, sonst leere Liste."""


def _build_user_prompt(
    balance: float,
    mode: Mode,
    tick: int,
    jobs: list[Job],
    market: MarketOffer | None,
    memory: list[str],
) -> str:
    rules = MODE_RULES[mode]
    payload: dict[str, Any] = {
        "tick": tick,
        "guthaben": round(balance, 2),
        "modus": mode,
        "max_aktionen": rules["max_actions"],
        "markt_erlaubt": rules["may_gamble"],
        "jobs": [j.as_prompt_dict() for j in jobs],
        "markt": market.as_prompt_dict() if (market and rules["may_gamble"]) else None,
        "letzte_ereignisse": memory[-10:],
    }
    return (
        "Aktuelle Lage:\n"
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + "\n\nWelche Aktion waehlst du? Antworte nur mit dem JSON-Objekt."
    )


def _extract_json(text: str) -> dict:
    """Robustes Parsen: auch wenn das Modell Codefences oder Text drumherum liefert."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    raise ValueError(f"Keine JSON-Antwort erkennbar: {text[:200]!r}")


def _sanitize(
    raw: dict, jobs: list[Job], mode: Mode, source: str
) -> Decision:
    """Antwort der KI auf gueltige Aktionen begrenzen - nie blind vertrauen."""
    rules = MODE_RULES[mode]
    action = str(raw.get("action", "idle")).strip()
    if action not in ("take_jobs", "gamble", "idle"):
        action = "idle"
    if action == "gamble" and not rules["may_gamble"]:
        action = "idle"

    valid_ids = {j.job_id for j in jobs}
    job_ids = [str(i) for i in raw.get("job_ids", []) if str(i) in valid_ids]
    job_ids = job_ids[: rules["max_actions"]]
    if action == "take_jobs" and not job_ids:
        action = "idle"

    reason = str(raw.get("reason", "")).strip()[:200] or "(keine Begruendung)"
    return Decision(action=action, job_ids=job_ids, reason=reason, source=source)


# --- Mock-Entscheider -------------------------------------------------------


class MockDecider:
    """Regel-Logik ohne API: waehlt die Jobs mit dem besten Erwartungswert."""

    name = "mock"
    api_calls = 0

    def think_cost(self, mode: Mode) -> float:
        return COST_PER_THINK["none"]

    def decide(
        self, balance, mode, tick, jobs, market, memory
    ) -> Decision:
        rules = MODE_RULES[mode]
        ranked = sorted(
            jobs,
            key=lambda j: j.reward * j.success_chance - j.cost,
            reverse=True,
        )
        picks = [
            j for j in ranked
            if j.reward * j.success_chance - j.cost > 0
            and j.cost < balance * 0.5
        ][: rules["max_actions"]]

        if picks:
            best = picks[0]
            return Decision(
                action="take_jobs",
                job_ids=[j.job_id for j in picks],
                reason=f"Bester Erwartungswert: '{best.title}' "
                       f"(EV {best.reward * best.success_chance - best.cost:.1f}).",
                source="mock",
            )

        # Notfall: nichts lohnt sich, aber Nichtstun toetet uns langsam.
        if mode != "critical" and market and rules["may_gamble"] and balance < 12:
            return Decision(
                action="gamble",
                reason="Kein lohnender Job und kaum Guthaben - Risiko als letzte Chance.",
                source="mock",
            )
        if ranked:
            cheapest = min(ranked, key=lambda j: j.cost)
            return Decision(
                action="take_jobs",
                job_ids=[cheapest.job_id],
                reason="Kein positiver Erwartungswert - billigster Job als Notloesung.",
                source="mock",
            )
        return Decision(action="idle", reason="Keine Jobs verfuegbar.", source="mock")


# --- Claude-Entscheider -----------------------------------------------------


class ClaudeDecider:
    """Fragt Claude ueber die Anthropic API. API-Key kommt aus der .env-Datei."""

    name = "claude"

    def __init__(self, max_api_calls: int = MAX_API_CALLS):
        import anthropic  # lokaler Import, damit --mock ohne SDK laeuft

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY fehlt. Lege eine .env-Datei an "
                "(siehe .env.example) oder starte mit --mock."
            )
        self._client = anthropic.Anthropic(api_key=api_key)
        self.api_calls = 0
        self.max_api_calls = max_api_calls

    def think_cost(self, mode: Mode) -> float:
        return COST_PER_THINK[MODE_RULES[mode]["model"]]

    def _model_for(self, mode: Mode) -> str:
        return EXPENSIVE_MODEL if MODE_RULES[mode]["model"] == "expensive" else CHEAP_MODEL

    def decide(
        self, balance, mode, tick, jobs, market, memory
    ) -> Decision:
        if self.api_calls >= self.max_api_calls:
            raise ApiLimitReached(
                f"Sicherheitslimit von {self.max_api_calls} API-Aufrufen erreicht."
            )

        prompt = _build_user_prompt(balance, mode, tick, jobs, market, memory)
        model = self._model_for(mode)
        extra: dict[str, Any] = {}
        if model != CHEAP_MODEL:
            # Haiku kennt output_config.effort nicht - nur fuer das teure Modell setzen.
            extra["output_config"] = {"effort": "low"}

        self.api_calls += 1
        response = self._client.messages.create(
            model=model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            **extra,
        )

        if response.stop_reason == "refusal":
            return Decision(action="idle", reason="Modell hat abgelehnt.", source="claude")

        text = "".join(b.text for b in response.content if b.type == "text")
        try:
            raw = _extract_json(text)
        except ValueError:
            return Decision(
                action="idle",
                reason="Antwort nicht lesbar - sicherheitshalber nichts tun.",
                source="claude",
            )
        return _sanitize(raw, jobs, mode, source="claude")
