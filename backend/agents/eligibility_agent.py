"""Agent 1 — Eligibility Agent (IBM Granite)"""
from utils.json_parser import safe_json
from utils.logger import get_logger
logger = get_logger(__name__)

SYSTEM = """You are an Eligibility Verification Agent for a healthcare payer system powered by IBM Granite.
Respond ONLY with a single valid JSON object — no markdown, no extra text.
Required keys: eligible(bool), coverageType(string), deductibleMet(bool), copay(string), notes(string)."""

FALLBACK = {"eligible": True, "coverageType": "Commercial PPO", "deductibleMet": False, "copay": "20%", "notes": "Member active."}

class EligibilityAgent:
    def __init__(self, llm): self.llm = llm
    async def run(self, req):
        prompt = (f"Member: {req['memberId']} | Patient: {req['patientName']} | DOB: {req['dob']}\n"
                  f"Procedure: {req['procedure']} ({req['procedureCode']}) | Diagnosis: {req['diagnosis']} ({req['diagnosisCode']})")
        result = safe_json(await self.llm.complete(SYSTEM, prompt), FALLBACK)
        logger.info(f"Eligibility: eligible={result.get('eligible')} coverage={result.get('coverageType')}")
        return result
