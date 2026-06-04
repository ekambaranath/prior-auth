from fastapi import APIRouter, HTTPException
from .models import PriorAuthRequest, PriorAuthResponse
from agents.orchestrator import PriorAuthOrchestrator
from utils.llm_client import LLMClient

router = APIRouter(prefix="/api/v1")
orchestrator = PriorAuthOrchestrator(LLMClient())

@router.get("/health")
async def health():
    return {"status": "ok", "service": "PriorAuthAI", "model": "IBM Granite"}

@router.post("/authorize", response_model=PriorAuthResponse)
async def authorize(request: PriorAuthRequest):
    try:
        results = await orchestrator.run(request.model_dump())
        return PriorAuthResponse(**results)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent pipeline error: {str(e)}")
