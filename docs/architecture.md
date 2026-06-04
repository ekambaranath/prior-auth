# Architecture

## Agent Communication Pattern

Each agent receives the original request dict.
The Decision Agent additionally receives all upstream results.
All agents return safe, validated dicts — never crash the pipeline.

## IBM Granite Integration

`utils/llm_client.py` abstracts the LLM:
- `LLM_PROVIDER=ollama`   → granite3-dense:8b via Ollama API
- `LLM_PROVIDER=watsonx`  → IBM Granite via WatsonX.ai REST API

## Why No LangChain?

Custom orchestrator = full control, no framework overhead, easier to debug in consulting engagements.
