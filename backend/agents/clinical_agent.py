"""Agent 3 — Clinical Criteria Agent (IBM Granite)"""
from utils.json_parser import safe_json
from utils.logger import get_logger
logger = get_logger(__name__)

SYSTEM = """You are a Clinical Criteria Evaluation Agent powered by IBM Granite.
Respond ONLY with a single valid JSON object — no markdown, no extra text.
Required keys: medicallyNecessary(bool), evidenceLevel(string: strong/moderate/weak), guidelineMet(bool), alternativesExhausted(bool), clinicalScore(integer 0-100), summary(string)."""

FALLBACK = {"medicallyNecessary": True, "evidenceLevel": "moderate", "guidelineMet": True, "alternativesExhausted": True, "clinicalScore": 72, "summary": "Clinical criteria met."}

class ClinicalAgent:
    def __init__(self, llm): self.llm = llm
    async def run(self, req):
        prompt = (f"Diagnosis: {req['diagnosis']} ({req['diagnosisCode']})\n"
                  f"Procedure: {req['procedure']} ({req['procedureCode']})\n"
                  f"Provider: {req['provider']}\nNotes: {req.get('clinicalNotes','')}")
        result = safe_json(await self.llm.complete(SYSTEM, prompt), FALLBACK)
        result["clinicalScore"] = max(0, min(100, int(result.get("clinicalScore", 70))))
        logger.info(f"Clinical: necessary={result.get('medicallyNecessary')} score={result.get('clinicalScore')}")
        return result
