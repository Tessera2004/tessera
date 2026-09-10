"""Simulierte Wirtschaft: Jobs, Markt und Kostenmodell fuer den Survival Agent.

Alles hier ist Spielgeld. Keine echten Zahlungen, keine echten Maerkte.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Literal

# --- Kostenmodell -----------------------------------------------------------

BASE_TICK_COST = 2.0          # Grundkosten pro Tick (Miete/Strom)
COST_PER_THINK = {            # Kosten pro Denkschritt je Modell
    "expensive": 3.0,
    "cheap": 0.5,
    "none": 0.0,
}

Mode = Literal["normal", "low", "critical"]

MODE_RULES: dict[Mode, dict] = {
    "normal":   {"model": "expensive", "max_actions": 2, "may_gamble": True},
    "low":      {"model": "cheap",     "max_actions": 1, "may_gamble": True},
    "critical": {"model": "cheap",     "max_actions": 1, "may_gamble": False},
}


def mode_for_balance(balance: float) -> Mode:
    """Ueberlebensmodus anhand des Guthabens."""
    if balance > 50:
        return "normal"
    if balance >= 20:
        return "low"
    return "critical"


# --- Jobs -------------------------------------------------------------------

JOB_TEMPLATES = [
    # (Titel, Basis-Belohnung, Basis-Schwierigkeit 0..1)
    ("Text schreiben",        12.0, 0.35),
    ("Daten sortieren",        7.0, 0.20),
    ("Rechenaufgabe loesen",   9.0, 0.30),
    ("Bug fixen",             18.0, 0.55),
    ("Uebersetzung",          10.0, 0.30),
    ("Bild beschriften",       5.0, 0.15),
    ("Recherche",             14.0, 0.45),
    ("Code-Review",           16.0, 0.50),
    ("Tabelle bereinigen",     8.0, 0.25),
    ("Zusammenfassung",        6.0, 0.20),
]


@dataclass
class Job:
    job_id: str
    title: str
    reward: float
    difficulty: float          # 0..1, hoeher = schwerer
    success_chance: float      # 0..1
    cost: float                # Aufwand, faellt auch bei Misserfolg an

    def as_prompt_dict(self) -> dict:
        return {
            "id": self.job_id,
            "titel": self.title,
            "belohnung": round(self.reward, 2),
            "schwierigkeit": round(self.difficulty, 2),
            "erfolgswahrscheinlichkeit": round(self.success_chance, 2),
            "kosten": round(self.cost, 2),
            "erwartungswert": round(self.reward * self.success_chance - self.cost, 2),
        }


@dataclass
class MarketOffer:
    """Riskanter Casino/Trading-Markt mit hoher Varianz."""

    stake: float
    win_chance: float
    payout_multiplier: float

    def as_prompt_dict(self) -> dict:
        return {
            "id": "market",
            "einsatz": round(self.stake, 2),
            "gewinnchance": round(self.win_chance, 2),
            "auszahlungs_faktor": round(self.payout_multiplier, 2),
            "erwartungswert": round(
                self.stake * self.win_chance * self.payout_multiplier - self.stake, 2
            ),
        }


@dataclass
class Economy:
    rng: random.Random = field(default_factory=random.Random)
    enable_market: bool = True

    def generate_jobs(self, tick: int) -> list[Job]:
        """3-5 zufaellige Jobs pro Tick."""
        jobs: list[Job] = []
        for i in range(self.rng.randint(3, 5)):
            title, base_reward, base_diff = self.rng.choice(JOB_TEMPLATES)
            difficulty = min(0.95, max(0.05, base_diff + self.rng.uniform(-0.12, 0.12)))
            reward = round(base_reward * self.rng.uniform(0.45, 1.05), 2)
            # Schwerere Jobs zahlen besser, gelingen aber seltener.
            success_chance = round(min(0.97, max(0.15, 1.0 - difficulty * 0.9)), 2)
            # Der Aufwand liegt nahe am Erwartungswert der Belohnung: manche Jobs
            # lohnen sich, manche nicht. Genau das macht die Auswahl relevant.
            cost = round(reward * success_chance * self.rng.uniform(0.72, 1.15), 2)
            jobs.append(
                Job(
                    job_id=f"t{tick}-j{i + 1}",
                    title=title,
                    reward=reward,
                    difficulty=round(difficulty, 2),
                    success_chance=success_chance,
                    cost=cost,
                )
            )
        return jobs

    def generate_market(self, balance: float) -> MarketOffer | None:
        if not self.enable_market:
            return None
        stake = round(max(3.0, min(balance * 0.25, 25.0)), 2)
        win_chance = round(self.rng.uniform(0.25, 0.48), 2)
        # Leicht negativer Erwartungswert - das Haus gewinnt langfristig.
        payout_multiplier = round(self.rng.uniform(1.6, 2.6), 2)
        return MarketOffer(stake=stake, win_chance=win_chance,
                           payout_multiplier=payout_multiplier)

    # --- Ausfuehrung --------------------------------------------------------

    def run_job(self, job: Job) -> tuple[bool, float, str]:
        """Fuehrt einen Job aus. Rueckgabe: (Erfolg, Netto-Delta, Beschreibung)."""
        success = self.rng.random() < job.success_chance
        if success:
            delta = job.reward - job.cost
            desc = f"Job '{job.title}' erfolgreich (+{job.reward:.2f}, Aufwand -{job.cost:.2f})"
        else:
            delta = -job.cost
            desc = f"Job '{job.title}' gescheitert (Aufwand -{job.cost:.2f})"
        return success, round(delta, 2), desc

    def run_market(self, offer: MarketOffer) -> tuple[bool, float, str]:
        win = self.rng.random() < offer.win_chance
        if win:
            delta = offer.stake * (offer.payout_multiplier - 1.0)
            desc = f"Markt gewonnen (Einsatz {offer.stake:.2f} -> +{delta:.2f})"
        else:
            delta = -offer.stake
            desc = f"Markt verloren (-{offer.stake:.2f})"
        return win, round(delta, 2), desc
