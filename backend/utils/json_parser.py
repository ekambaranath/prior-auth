"""Safe JSON extraction — never throws, always returns a valid dict."""
import json, re

def safe_json(text: str, fallback: dict) -> dict:
    try:
        cleaned = re.sub(r"```json|```", "", text or "").strip()
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return dict(fallback)
