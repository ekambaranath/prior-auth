"""Agent 2 — Policy Lookup Agent (IBM Granite)"""
from utils.json_parser import safe_json
from utils.logger import get_logger
logger = get_logger(__name__)

SYSTEM = """You are a Payer Policy Lookup Agent powered by IBM Granite.
Respond ONLY with a single valid JSON object — no markdown, no extra text.
Required keys: policyExists(bool), requiresStepTherapy(bool), stepTherapyMet(bool), quantityLimits(string), requiresPA(bool), policyNotes(string)."""

FALLBACK = {"policyExists": True, "requiresStepTherapy": True, "stepTherapyMet": True, "quantityLimits": "As prescribed", "requiresPA": True, "policyNotes": "Standard PA applies."}

class PolicyAgent:
    def __init__(self, llm): self.llm = llm
    async def run(self, req):
        prompt = (f"Procedure: {req['procedure']} ({req['procedureCode']})\n"
                  f"Diagnosis: {req['diagnosisCode']}\nClinical Notes: {req.get('clinicalNotes','')}")
        result = safe_json(await self.llm.complete(SYSTEM, prompt), FALLBACK)
        logger.info(f"Policy: requiresPA={result.get('requiresPA')} stepTherapyMet={result.get('stepTherapyMet')}")
        return result
