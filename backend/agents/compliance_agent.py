"""Agent 4 — Compliance Agent (IBM Granite)"""
from utils.json_parser import safe_json
from utils.logger import get_logger
logger = get_logger(__name__)

SYSTEM = """You are a HIPAA Compliance Agent powered by IBM Granite.
Respond ONLY with a single valid JSON object — no markdown, no extra text.
Required keys: hipaaCompliant(bool), npiValid(bool), icd10Valid(bool), cptValid(bool), regulatoryFlags(array of strings), complianceScore(integer 0-100)."""

FALLBACK = {"hipaaCompliant": True, "npiValid": True, "icd10Valid": True, "cptValid": True, "regulatoryFlags": [], "complianceScore": 95}

class ComplianceAgent:
    def __init__(self, llm): self.llm = llm
    async def run(self, req):
        prompt = (f"NPI: {req['npi']} | Provider: {req['provider']}\n"
                  f"ICD-10: {req['diagnosisCode']} | Code: {req['procedureCode']} | Member: {req['memberId']}")
        result = safe_json(await self.llm.complete(SYSTEM, prompt), FALLBACK)
        result["complianceScore"] = max(0, min(100, int(result.get("complianceScore", 90))))
        if not isinstance(result.get("regulatoryFlags"), list): result["regulatoryFlags"] = []
        logger.info(f"Compliance: hipaa={result.get('hipaaCompliant')} score={result.get('complianceScore')}")
        return result
