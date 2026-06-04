"""
Orchestrator — coordinates the 5-agent IBM Granite pipeline.
Eligibility → Policy → Clinical → Compliance → Decision
"""
from .eligibility_agent import EligibilityAgent
from .policy_agent      import PolicyAgent
from .clinical_agent    import ClinicalAgent
from .compliance_agent  import ComplianceAgent
from .decision_agent    import DecisionAgent
from utils.logger import get_logger

logger = get_logger(__name__)

class PriorAuthOrchestrator:
    def __init__(self, llm_client):
        self.eligibility = EligibilityAgent(llm_client)
        self.policy      = PolicyAgent(llm_client)
        self.clinical    = ClinicalAgent(llm_client)
        self.compliance  = ComplianceAgent(llm_client)
        self.decision    = DecisionAgent(llm_client)

    async def run(self, request: dict) -> dict:
        logger.info(f"PA pipeline start — member {request.get('memberId')}")
        results = {}
        results["eligibility"] = await self.eligibility.run(request)
        results["policy"]      = await self.policy.run(request)
        results["clinical"]    = await self.clinical.run(request)
        results["compliance"]  = await self.compliance.run(request)
        results["decision"]    = await self.decision.run(request, results)
        logger.info(f"Pipeline complete — {results['decision'].get('decision')}")
        return results
