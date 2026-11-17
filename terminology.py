"""Shared display wording. Stored keys, statuses and source schemas are unchanged."""
import json
from pathlib import Path

CATALOGUE = json.loads((Path(__file__).resolve().parent / "static" / "terminology.json").read_text(encoding="utf-8"))
INPUT_LABELS = CATALOGUE["inputs"]


def input_label(key, fallback=None):
    return INPUT_LABELS.get(key, fallback if fallback is not None else key)


def display_label(value):
    if value in CATALOGUE["labels"]:
        return CATALOGUE["labels"][value]
    if value.endswith(":"):
        return CATALOGUE["labels"].get(value[:-1], value[:-1]) + ":"
    return value
