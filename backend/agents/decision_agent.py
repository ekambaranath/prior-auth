"""Agent 5 — Decision Agent (IBM Granite)"""
import json
from utils.json_parser import safe_json
from utils.logger import get_logger
logger = get_logger(__name__)

SYSTEM = """You are the Final Decision Agent for a healthcare prior authorization pipeline powered by IBM Granite.
Respond ONLY with a single valid JSON object — no markdown, no extra text.
Required keys: decision(exactly APPROVED or DENIED or PENDING_INFO), authorizationNumber(string format PA-YYYY-XXXXXX), validDays(integer), confidenceScore(integer 0-100), primaryReason(string), conditions(array of strings), nextSteps(array of strings), reviewedBy(string)."""

FALLBACK = {"decision": "PENDING_INFO", "authorizationNumber": "PA-2024-000001", "validDays": 180, "confidenceScore": 75,
            "primaryReason": "Additional information required.", "conditions": ["Submit supporting documentation"],
            "nextSteps": ["Contact provider for records", "Re-submit within 14 days"], "reviewedBy": "IBM Granite PriorAuthAI"}

VALID = {"APPROVED", "DENIED", "PENDING_INFO"}

class DecisionAgent:
    def __init__(self, llm): self.llm = llm
    async def run(self, req, agent_results):
        prompt = (f"Eligibility: {json.dumps(agent_results.get('eligibility',{}))}\n"
                  f"Policy: {json.dumps(agent_results.get('policy',{}))}\n"
                  f"Clinical: {json.dumps(agent_results.get('clinical',{}))}\n"
                  f"Compliance: {json.dumps(agent_results.get('compliance',{}))}\n"
                  f"Patient: {req['patientName']} | Procedure: {req['procedure']} | Urgency: {req['urgency']}")
        result = safe_json(await self.llm.complete(SYSTEM, prompt), FALLBACK)
        if result.get("decision") not in VALID: result["decision"] = "PENDING_INFO"
        result["confidenceScore"] = max(0, min(100, int(result.get("confidenceScore", 75))))
        result["validDays"]       = max(1, int(result.get("validDays", 180)))
        if not isinstance(result.get("conditions"), list):  result["conditions"]  = FALLBACK["conditions"]
        if not isinstance(result.get("nextSteps"), list):   result["nextSteps"]   = FALLBACK["nextSteps"]
        logger.info(f"Decision: {result.get('decision')} confidence={result.get('confidenceScore')}%")
        return result
