"""
IBM Granite LLM Client
Supports two modes — switch via LLM_PROVIDER env var:
  - "watsonx"  : IBM WatsonX.ai (production / IBM Consulting standard)
  - "ollama"   : Local Ollama (development / demo)
"""
import os, httpx, json
from utils.logger import get_logger

logger = get_logger(__name__)

PROVIDER      = os.getenv("LLM_PROVIDER",     "ollama")          # "watsonx" or "ollama"
OLLAMA_URL    = os.getenv("OLLAMA_URL",        "http://localhost:11434")
GRANITE_MODEL = os.getenv("LLM_MODEL",         "granite3-dense:8b")

# WatsonX credentials (only needed in production)
WX_API_KEY    = os.getenv("WATSONX_API_KEY",   "")
WX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID","")
WX_URL        = os.getenv("WATSONX_URL",        "https://us-south.ml.cloud.ibm.com")
WX_MODEL      = os.getenv("WATSONX_MODEL",      "ibm/granite-13b-instruct-v2")


class LLMClient:
    """
    Unified IBM Granite client.
    Abstracts WatsonX (production) and Ollama (local) behind one interface.
    """

    async def complete(self, system: str, user: str) -> str:
        if PROVIDER == "watsonx":
            return await self._watsonx(system, user)
        return await self._ollama(system, user)

    # ── Ollama (local IBM Granite) ─────────────────────────────────────────
    async def _ollama(self, system: str, user: str) -> str:
        logger.info(f"[Granite/Ollama] model={GRANITE_MODEL}")
        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model":  GRANITE_MODEL,
                    "stream": False,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                },
            )
            r.raise_for_status()
            return r.json()["message"]["content"]

    # ── WatsonX.ai (IBM production) ────────────────────────────────────────
    async def _watsonx(self, system: str, user: str) -> str:
        logger.info(f"[Granite/WatsonX] model={WX_MODEL}")
        token = await self._get_iam_token()
        prompt = f"<|system|>\n{system}\n<|user|>\n{user}\n<|assistant|>"
        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(
                f"{WX_URL}/ml/v1/text/generation?version=2023-05-29",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_id":   WX_MODEL,
                    "project_id": WX_PROJECT_ID,
                    "input":      prompt,
                    "parameters": {
                        "decoding_method": "greedy",
                        "max_new_tokens":  1000,
                        "stop_sequences":  ["<|user|>"],
                    },
                },
            )
            r.raise_for_status()
            return r.json()["results"][0]["generated_text"].strip()

    async def _get_iam_token(self) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://iam.cloud.ibm.com/identity/token",
                data={"grant_type": "urn:ibm:params:oauth:grant-type:apikey", "apikey": WX_API_KEY},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            return r.json()["access_token"]
