from pydantic import BaseModel
from typing import Literal

class PriorAuthRequest(BaseModel):
    patientName:   str
    memberId:      str
    dob:           str
    diagnosis:     str
    diagnosisCode: str
    procedure:     str
    procedureCode: str
    provider:      str
    npi:           str
    clinicalNotes: str = ""
    urgency:       Literal["standard", "urgent", "emergency"] = "standard"

class PriorAuthResponse(BaseModel):
    eligibility: dict
    policy:      dict
    clinical:    dict
    compliance:  dict
    decision:    dict
