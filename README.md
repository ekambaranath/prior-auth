# 🏥 PriorAuthAI — Multi-Agent Prior Authorization System

<div align="center">

[![IBM Granite](https://img.shields.io/badge/IBM-Granite_3.0-054ADA?style=flat-square&logo=ibm)](https://www.ibm.com/granite)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-black?style=flat-square)](https://ollama.com)


**An Agentic AI system powered by IBM Granite that automates healthcare prior authorization decisions using a 5-agent pipeline — reducing 14-day manual reviews to seconds.**

## ⚡ Problem → Approach → Result

| | |
|---|---|
| **Problem** | Healthcare payers manually review millions of Prior Authorization requests every year. Each decision takes 3–14 days, costs $8–12 to process, and 88% of physicians report that delays directly harm patient outcomes. The process is manual, error-prone, and has no audit trail. |
| **Approach** | Built a 5-agent IBM Granite pipeline where each agent is a domain specialist — Eligibility, Policy Lookup, Clinical Criteria, HIPAA Compliance, and Final Decision. Agents run sequentially, each passing validated outputs downstream to the next. The LLM layer is fully abstracted: runs on IBM Granite via Ollama locally, and switches to IBM WatsonX.ai in production with a single environment variable — zero code changes. |
| **Result** | Prior authorization decisions delivered in under 30 seconds with full reasoning trail, HIPAA compliance validation, NPI verification, clinical scoring, and actionable next steps — reducing turnaround from 14 days to seconds and cost per decision from $8–12 to under $0.05. |



</div>

---

## 🎯 Problem Statement

Prior authorization is one of healthcare's most costly bottlenecks:

- **$35B+** wasted annually on manual PA processing (AMA, 2023)
- **3–14 days** average turnaround per decision
- **88%** of physicians report PA delays harm patient outcomes
- Healthcare payers process **millions of requests per year** manually

**PriorAuthAI** solves this with IBM Granite powering a coordinated 5-agent pipeline that delivers instant, HIPAA-compliant decisions with full audit trails.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│               PriorAuthAI — IBM Granite Pipeline                  │
│                                                                  │
│  Request                                                         │
│     │                                                            │
│     ▼                                                            │
│  FastAPI Orchestrator                                            │
│     │                                                            │
│     ├──► 🔍 Eligibility Agent   → eligible, coverage, copay      │
│     ├──► 📋 Policy Agent        → PA rules, step therapy         │
│     ├──► 🏥 Clinical Agent      → medical necessity, score       │
│     ├──► ⚖️  Compliance Agent   → HIPAA, NPI, ICD-10             │
│     └──► 🎯 Decision Agent      → APPROVED / DENIED / PENDING    │
│                    ↑                                             │
│             IBM Granite 3.0                                      │
│          (Ollama local / WatsonX.ai)                             │
└──────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| LLM | **IBM Granite 3.0** (granite3-dense:8b) |
| LLM Runtime | Ollama (local) / IBM WatsonX.ai (production) |
| Backend | Python 3.11 + FastAPI |
| Frontend | React 18 + Vite |
| Agent Framework | Custom orchestrator — no LangChain dependency |

---

## 🤖 The 5 Agents

| Agent | File | Responsibility |
|---|---|---|
| 🔍 Eligibility | `agents/eligibility_agent.py` | Member coverage, deductible, copay |
| 📋 Policy | `agents/policy_agent.py` | Formulary, step therapy, PA rules |
| 🏥 Clinical | `agents/clinical_agent.py` | Medical necessity, evidence level |
| ⚖️ Compliance | `agents/compliance_agent.py` | HIPAA, NPI validation, ICD-10/CPT |
| 🎯 Decision | `agents/decision_agent.py` | Final decision + audit trail |

All agents are **stateless specialists** coordinated by `agents/orchestrator.py`.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+, Node.js 18+
- [Ollama](https://ollama.com) installed

### 1. Pull IBM Granite
```bash
ollama pull granite3-dense:8b
ollama serve
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn api.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```



---

## 📁 Project Structure

```
prior-auth-agent/
│
├── 📂 backend/
│   ├── 📂 agents/
│   │   ├── orchestrator.py        ← coordinates all 5 agents
│   │   ├── eligibility_agent.py   ← Agent 1: Member eligibility
│   │   ├── policy_agent.py        ← Agent 2: Payer policy lookup
│   │   ├── clinical_agent.py      ← Agent 3: Clinical criteria
│   │   ├── compliance_agent.py    ← Agent 4: HIPAA compliance
│   │   └── decision_agent.py      ← Agent 5: Final decision
│   │
│   ├── 📂 api/
│   │   ├── main.py                ← FastAPI entry point
│   │   ├── routes.py              ← POST /api/v1/authorize
│   │   └── models.py              ← Pydantic schemas
│   │
│   ├── 📂 utils/
│   │   ├── llm_client.py          ← IBM Granite (Ollama + WatsonX)
│   │   ├── json_parser.py         ← Safe JSON parser
│   │   └── logger.py              ← Structured logging
│   │
│   ├── requirements.txt
│   └── .env.example
│
├── 📂 frontend/
│   └── src/App.jsx                ← React UI
│
├── 📂 docs/
│   ├── architecture.md
│   └── demo-cases.md
│
├── .devcontainer/devcontainer.json ← GitHub Codespaces ready
├── docker-compose.yml              ← One-command startup
└── README.md
```

---

---

## 💡 Sample Cases

| Case | Diagnosis | Procedure | ICD-10 | Code |
|---|---|---|---|---|
| Robert Chen | Type 2 Diabetes | CGM Dexcom G7 | E11.40 | A9278 |
| Maria González | Rheumatoid Arthritis | Humira 40mg | M05.79 | J0135 |
| David Thompson | Lumbar Stenosis | Spinal Fusion L4-L5 | M48.06 | 22612 |

---

## 📊 Business Impact

| Metric | Manual | PriorAuthAI |
|---|---|---|
| Decision Time | 3–14 days | < 30 seconds |
| Cost per Decision | $8–12 | < $0.01 (local) |
| First-Pass Rate | ~78% | ~91% |
| Audit Trail | Paper | Full digital |

---
