import { useState, useEffect, useRef } from "react";

const AGENTS = [
  { id:"eligibility", name:"Eligibility Agent",       icon:"🔍", desc:"Verifying member eligibility & coverage"       },
  { id:"policy",      name:"Policy Lookup Agent",     icon:"📋", desc:"Checking payer policy rules & formulary"       },
  { id:"clinical",    name:"Clinical Criteria Agent", icon:"🏥", desc:"Evaluating clinical guidelines & necessity"    },
  { id:"compliance",  name:"Compliance Agent",        icon:"⚖️",  desc:"HIPAA & regulatory compliance check"          },
  { id:"decision",    name:"Decision Agent",          icon:"🎯", desc:"Synthesising final authorization decision"     },
];

const SAMPLES = [
  { label:"🔵 Diabetes CGM", patientName:"Robert Chen", memberId:"BCB-2024-887234", dob:"1968-03-15",
    diagnosis:"Type 2 Diabetes with Peripheral Neuropathy", diagnosisCode:"E11.40",
    procedure:"Continuous Glucose Monitor (CGM) - Dexcom G7", procedureCode:"A9278",
    provider:"Dr. Sarah Mitchell, Endocrinology", npi:"1234567890",
    clinicalNotes:"Patient has failed conventional fingerstick monitoring. HbA1c at 9.2%. Multiple hypoglycemic episodes in last 6 months.",
    urgency:"standard" },
  { label:"🔴 Rheumatoid Arthritis", patientName:"Maria González", memberId:"UHC-2024-445891", dob:"1975-09-22",
    diagnosis:"Severe Rheumatoid Arthritis", diagnosisCode:"M05.79",
    procedure:"Adalimumab (Humira) 40mg Biweekly", procedureCode:"J0135",
    provider:"Dr. James Park, Rheumatology", npi:"9876543210",
    clinicalNotes:"Patient has tried and failed methotrexate and hydroxychloroquine over 6 months. DAS28 score 5.8.",
    urgency:"urgent" },
  { label:"🟡 Spinal Fusion", patientName:"David Thompson", memberId:"AET-2024-112093", dob:"1952-11-08",
    diagnosis:"Lumbar Spinal Stenosis", diagnosisCode:"M48.06",
    procedure:"Lumbar Spinal Fusion Surgery (L4-L5)", procedureCode:"22612",
    provider:"Dr. Angela Torres, Neurosurgery", npi:"5678901234",
    clinicalNotes:"Conservative treatment including PT (12 weeks), epidural injections (x3) have failed. MRI confirms severe stenosis.",
    urgency:"standard" },
];

const EMPTY = { patientName:"", memberId:"", dob:"", diagnosis:"", diagnosisCode:"",
                procedure:"", procedureCode:"", provider:"", npi:"", clinicalNotes:"", urgency:"standard" };

const DEFAULTS = {
  eligibility: { eligible:true,  coverageType:"Commercial PPO", deductibleMet:false, copay:"20%", notes:"Member active." },
  policy:      { policyExists:true, requiresStepTherapy:true, stepTherapyMet:true, quantityLimits:"As prescribed", requiresPA:true, policyNotes:"Standard PA applies." },
  clinical:    { medicallyNecessary:true, evidenceLevel:"moderate", guidelineMet:true, alternativesExhausted:true, clinicalScore:72, summary:"Clinical criteria met." },
  compliance:  { hipaaCompliant:true, npiValid:true, icd10Valid:true, cptValid:true, regulatoryFlags:[], complianceScore:95 },
  decision:    { decision:"PENDING_INFO", authorizationNumber:"PA-2024-000001", validDays:180, confidenceScore:75,
                 primaryReason:"Additional info required.", conditions:["Submit supporting documentation"],
                 nextSteps:["Contact provider","Re-submit within 14 days"], reviewedBy:"IBM Granite PriorAuthAI" },
};

let API_BASE = "http://localhost:8000/api/v1";
try { if (import.meta?.env?.VITE_API_BASE) API_BASE = import.meta.env.VITE_API_BASE; } catch(_) {}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function safeNum(v, fallback=0){ const n=Number(v); return isNaN(n)?fallback:n; }

export default function App() {
  const [screen,    setScreen]    = useState("home");
  const [form,      setForm]      = useState(EMPTY);
  const [agentSt,   setAgentSt]   = useState({});
  const [logs,      setLogs]      = useState([]);
  const [result,    setResult]    = useState(null);
  const [runError,  setRunError]  = useState("");
  const [backendOk, setBackendOk] = useState(null); // null=checking, true=ok, false=down
  const logsEnd = useRef(null);

  useEffect(()=>{ logsEnd.current?.scrollIntoView({behavior:"smooth"}); },[logs]);

  // Check backend health on mount
  useEffect(()=>{
    const check = async () => {
      try {
        const r = await fetch(`${API_BASE}/health`, {signal: AbortSignal.timeout(5000)});
        setBackendOk(r.ok);
      } catch(_) {
        setBackendOk(false);
      }
    };
    check();
  },[]);

  const addLog = (agentId, msg, type="info") =>
    setLogs(p=>[...p,{agentId,msg,type,t:new Date().toLocaleTimeString()}]);

  const setAgent = (id, state) => setAgentSt(p=>({...p,[id]:state}));
  const isValid  = () => ["patientName","memberId","dob","diagnosis","diagnosisCode",
                           "procedure","procedureCode","provider","npi"].every(k=>form[k]?.trim());

  const reset = () => { setScreen("home"); setForm(EMPTY); setAgentSt({}); setLogs([]); setResult(null); setRunError(""); };

  const runAgents = async () => {
    setScreen("processing"); setLogs([]); setAgentSt({}); setResult(null); setRunError("");

    // Animate agent states while backend processes
    const sequence = async () => {
      for (const agent of AGENTS) {
        setAgent(agent.id, "running");
        addLog(agent.id, `${agent.desc}…`);
        await sleep(400);
      }
    };
    sequence(); // fire animation, don't await

    try {
      const res = await fetch(`${API_BASE}/authorize`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e?.detail || `Server error ${res.status}`);
      }

      const data = await res.json();

      // Mark all agents done
      for (const a of AGENTS) {
        setAgent(a.id, "done");
        addLog(a.id, "Complete ✓", "success");
        await sleep(150);
      }

      // Enrich with safe defaults
      const R = {
        eligibility: {...DEFAULTS.eligibility, ...(data.eligibility||{})},
        policy:      {...DEFAULTS.policy,      ...(data.policy||{})},
        clinical:    {...DEFAULTS.clinical,    ...(data.clinical||{})},
        compliance:  {...DEFAULTS.compliance,  ...(data.compliance||{})},
        decision:    {...DEFAULTS.decision,    ...(data.decision||{})},
        form: {...form},
      };
      R.clinical.clinicalScore    = Math.max(0,Math.min(100,safeNum(R.clinical.clinicalScore,72)));
      R.compliance.complianceScore= Math.max(0,Math.min(100,safeNum(R.compliance.complianceScore,95)));
      R.decision.confidenceScore  = Math.max(0,Math.min(100,safeNum(R.decision.confidenceScore,75)));
      R.decision.validDays        = Math.max(1,safeNum(R.decision.validDays,180));
      if(!["APPROVED","DENIED","PENDING_INFO"].includes(R.decision.decision)) R.decision.decision="PENDING_INFO";
      if(!Array.isArray(R.decision.conditions))  R.decision.conditions  = DEFAULTS.decision.conditions;
      if(!Array.isArray(R.decision.nextSteps))    R.decision.nextSteps   = DEFAULTS.decision.nextSteps;
      if(!Array.isArray(R.compliance.regulatoryFlags)) R.compliance.regulatoryFlags=[];

      const dtype = R.decision.decision==="APPROVED"?"success":R.decision.decision==="DENIED"?"error":"warn";
      addLog("decision", `FINAL: ${R.decision.decision} — ${R.decision.confidenceScore}% confidence`, dtype);

      setResult(R);
      await sleep(600);
      setScreen("result");

    } catch(err) {
      for (const a of AGENTS) setAgent(a.id, "error");
      setRunError(err.message || "Unexpected error. Is the backend running?");
    }
  };

  // ── Design tokens ──────────────────────────────────────────────────────
  const DC = {
    APPROVED:     {bg:"rgba(0,200,160,0.08)",  border:"rgba(0,200,160,0.35)", text:"#00c8a0", icon:"✅"},
    DENIED:       {bg:"rgba(255,60,60,0.08)",   border:"rgba(255,60,60,0.35)",  text:"#ff6b6b", icon:"❌"},
    PENDING_INFO: {bg:"rgba(255,193,7,0.08)",   border:"rgba(255,193,7,0.35)",  text:"#ffc107", icon:"⏳"},
  };
  const dc = d => DC[d] || DC.PENDING_INFO;

  // ── Sub-components ─────────────────────────────────────────────────────
  const Tag = ({val, tc="0,200,160", fc="255,60,60", tl, fl}) => {
    const c = val?tc:fc;
    return <span style={{display:"inline-block",fontSize:"10px",fontWeight:"700",padding:"2px 8px",borderRadius:"4px",
      background:`rgba(${c},0.14)`,color:`rgb(${c})`,border:`1px solid rgba(${c},0.3)`,letterSpacing:"0.4px"}}>
      {val?(tl||"YES"):(fl||"NO")}
    </span>;
  };

  const Bar = ({score=0}) => {
    const s=Math.max(0,Math.min(100,safeNum(score)));
    const c=s>70?"0,200,160":s>40?"255,193,7":"255,80,80";
    return <div style={{marginTop:"8px",height:"5px",borderRadius:"3px",background:"rgba(255,255,255,0.07)"}}>
      <div style={{width:`${s}%`,height:"100%",borderRadius:"3px",background:`rgb(${c})`,transition:"width 1.2s ease"}}/>
    </div>;
  };

  const MRow = ({label,children}) =>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <span style={{fontSize:"12px",color:"rgba(255,255,255,0.42)"}}>{label}</span>
      <span style={{fontSize:"12px",fontWeight:"600",color:"#e2e8f0"}}>{children}</span>
    </div>;

  const Card = ({children,style={}}) =>
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"16px",padding:"22px",...style}}>
      {children}
    </div>;

  const CardTitle = ({children}) =>
    <div style={{fontSize:"10px",fontWeight:"700",color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"1.4px",marginBottom:"12px"}}>
      {children}
    </div>;

  const S = {
    app:  {minHeight:"100vh",background:"#080d1a",color:"#e2e8f0",fontFamily:"'DM Sans',sans-serif",position:"relative"},
    grid: {position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,150,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,150,255,0.022) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none",zIndex:0},
    g1:   {position:"fixed",top:"-15%",right:"-8%",width:"600px",height:"600px",background:"radial-gradient(circle,rgba(0,70,255,0.08) 0%,transparent 70%)",pointerEvents:"none",zIndex:0},
    g2:   {position:"fixed",bottom:"-15%",left:"-8%",width:"500px",height:"500px",background:"radial-gradient(circle,rgba(0,180,140,0.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0},
    wrap: {position:"relative",zIndex:1,maxWidth:"1080px",margin:"0 auto",padding:"0 24px"},
    hdr:  {borderBottom:"1px solid rgba(255,255,255,0.055)",padding:"18px 0",marginBottom:"36px"},
    btnP: {background:"linear-gradient(135deg,#054ADA,#0369a1)",color:"#fff",border:"none",borderRadius:"11px",padding:"14px 32px",fontSize:"14px",fontWeight:"700",cursor:"pointer",boxShadow:"0 6px 24px rgba(5,74,218,0.32)",transition:"opacity .2s"},
    btnS: {background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.65)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"11px",padding:"13px 24px",fontSize:"14px",fontWeight:"600",cursor:"pointer"},
    inp:  {background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:"9px",padding:"10px 13px",color:"#fff",fontSize:"13px",outline:"none",width:"100%",fontFamily:"inherit",boxSizing:"border-box"},
    lbl:  {fontSize:"10px",fontWeight:"700",color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px",display:"block"},
    err:  {background:"rgba(255,60,60,0.08)",border:"1px solid rgba(255,60,60,0.22)",borderRadius:"9px",padding:"12px 16px",fontSize:"13px",color:"#ff7a7a",marginTop:"14px"},
    spin: {width:"15px",height:"15px",border:"2px solid rgba(5,74,218,0.2)",borderTop:"2px solid #4d8fff",borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0},
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.18)}
        input:focus,textarea:focus,select:focus{border-color:rgba(5,74,218,0.5)!important;outline:none}
        select option{background:#0d1526}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease both}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>
      <div style={S.grid}/><div style={S.g1}/><div style={S.g2}/>

      {/* HEADER */}
      <div style={S.hdr}>
        <div style={S.wrap}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
              <div style={{width:"36px",height:"36px",background:"linear-gradient(135deg,#054ADA,#0369a1)",borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px"}}>🏥</div>
              <div style={{fontSize:"17px",fontWeight:"800",letterSpacing:"-0.5px",color:"#fff"}}>PriorAuth<span style={{color:"#054ADA"}}>AI</span></div>
              <div style={{fontSize:"9px",background:"rgba(5,74,218,0.15)",color:"#4d8fff",border:"1px solid rgba(5,74,218,0.3)",borderRadius:"4px",padding:"2px 8px",fontWeight:"700",letterSpacing:"1.2px"}}>MULTI-AGENT</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <div style={{width:"7px",height:"7px",borderRadius:"50%",background:backendOk===true?"#00c8a0":backendOk===false?"#ff6b6b":"#ffc107",boxShadow:`0 0 6px ${backendOk===true?"#00c8a0":backendOk===false?"#ff6b6b":"#ffc107"}`}}/>
              <span style={{fontSize:"11px",color:"rgba(255,255,255,0.3)"}}>
                {backendOk===true?"IBM Granite Connected":backendOk===false?"Backend Offline":"Connecting…"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={S.wrap}>

        {/* ══ HOME ══════════════════════════════════════════════════════════ */}
        {screen==="home" && (
          <div className="fu" style={{paddingTop:"40px",paddingBottom:"60px"}}>
            <div style={{textAlign:"center",marginBottom:"48px"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:"8px",fontSize:"10px",letterSpacing:"2.5px",color:"#4d8fff",background:"rgba(5,74,218,0.1)",border:"1px solid rgba(5,74,218,0.22)",borderRadius:"20px",padding:"5px 16px",marginBottom:"22px",textTransform:"uppercase",fontWeight:"700"}}>
                <span>🔷</span> Powered by IBM Granite
              </div>
              <h1 style={{fontSize:"clamp(30px,5vw,52px)",fontWeight:"800",lineHeight:"1.1",letterSpacing:"-2px",marginBottom:"18px",background:"linear-gradient(140deg,#fff 30%,rgba(255,255,255,0.5))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                Prior Authorization<br/>Automation Agent
              </h1>
              <p style={{fontSize:"16px",color:"rgba(255,255,255,0.42)",maxWidth:"480px",margin:"0 auto 36px",lineHeight:"1.65"}}>
                5 specialised IBM Granite agents delivering instant, HIPAA-compliant prior authorization decisions — reducing 14-day manual reviews to seconds.
              </p>

              {/* Agent pipeline */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",flexWrap:"wrap",marginBottom:"44px"}}>
                {AGENTS.map((a,i)=>(
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"20px",padding:"5px 13px",fontSize:"12px",color:"rgba(255,255,255,0.58)"}}>
                      {a.icon} {a.name}
                    </div>
                    {i<AGENTS.length-1 && <span style={{color:"rgba(255,255,255,0.18)",fontSize:"13px"}}>→</span>}
                  </div>
                ))}
              </div>

              {/* Backend status card */}
              <div style={{maxWidth:"460px",margin:"0 auto 32px"}}>
                <Card>
                  <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                    <div style={{fontSize:"28px"}}>🔷</div>
                    <div style={{flex:1,textAlign:"left"}}>
                      <div style={{fontSize:"13px",fontWeight:"700",color:"#fff",marginBottom:"3px"}}>IBM Granite (via Ollama)</div>
                      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)"}}>
                        {backendOk===true ? "Backend connected — ready to process" :
                         backendOk===false ? "Start backend: uvicorn api.main:app --reload" :
                         "Checking connection…"}
                      </div>
                    </div>
                    <div style={{width:"10px",height:"10px",borderRadius:"50%",flexShrink:0,
                      background:backendOk===true?"#00c8a0":backendOk===false?"#ff6b6b":"#ffc107",
                      boxShadow:`0 0 8px ${backendOk===true?"#00c8a0":backendOk===false?"#ff6b6b":"#ffc107"}`}}/>
                  </div>
                </Card>
              </div>

              <button
                style={{...S.btnP,fontSize:"15px",padding:"16px 44px",opacity:backendOk?1:0.5,cursor:backendOk?"pointer":"not-allowed"}}
                onClick={()=>backendOk&&setScreen("form")}>
                Start New Authorization →
              </button>
              {backendOk===false && (
                <div style={{marginTop:"16px",fontSize:"12px",color:"rgba(255,255,255,0.3)"}}>
                  Run <code style={{background:"rgba(255,255,255,0.06)",padding:"2px 6px",borderRadius:"4px",color:"#4d8fff"}}>cd backend && uvicorn api.main:app --reload</code> to start
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ FORM ═════════════════════════════════════════════════════════ */}
        {screen==="form" && (
          <div className="fu" style={{paddingBottom:"60px"}}>
            <div style={{marginBottom:"26px"}}>
              <h2 style={{fontSize:"22px",fontWeight:"800",letterSpacing:"-0.5px",marginBottom:"5px"}}>New Prior Authorization Request</h2>
              <p style={{fontSize:"13px",color:"rgba(255,255,255,0.38)"}}>Fill in details or load a sample case — IBM Granite will process all 5 agents.</p>
            </div>

            <div style={{marginBottom:"20px"}}>
              <span style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"1px",marginRight:"12px"}}>Quick Load:</span>
              {SAMPLES.map((s,i)=>(
                <button key={i} style={{background:"rgba(5,74,218,0.09)",border:"1px solid rgba(5,74,218,0.2)",borderRadius:"7px",padding:"6px 14px",color:"rgba(255,255,255,0.7)",fontSize:"12px",cursor:"pointer",marginRight:"8px",marginBottom:"6px"}}
                  onClick={()=>setForm(s)}>{s.label}</button>
              ))}
            </div>

            <Card style={{marginBottom:"16px"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:"#4d8fff",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"18px"}}>👤 Patient Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                {[["patientName","Patient Full Name","Robert Chen"],["memberId","Member ID","BCB-2024-XXXXXX"]].map(([k,l,ph])=>(
                  <div key={k}><label style={S.lbl}>{l}</label><input style={S.inp} placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>
                ))}
                <div><label style={S.lbl}>Date of Birth</label><input style={S.inp} type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})}/></div>
                <div>
                  <label style={S.lbl}>Urgency</label>
                  <select style={{...S.inp,background:"rgba(8,13,26,0.95)"}} value={form.urgency} onChange={e=>setForm({...form,urgency:e.target.value})}>
                    <option value="standard">Standard (5–7 days)</option>
                    <option value="urgent">Urgent (72 hours)</option>
                    <option value="emergency">Emergency (24 hours)</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card style={{marginBottom:"16px"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:"#4d8fff",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"18px"}}>🏥 Clinical Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
                {[["diagnosis","Primary Diagnosis","Type 2 Diabetes…"],["diagnosisCode","ICD-10 Code","E11.40"],
                  ["procedure","Procedure / Drug","Continuous Glucose Monitor…"],["procedureCode","CPT / HCPCS Code","A9278"]].map(([k,l,ph])=>(
                  <div key={k}><label style={S.lbl}>{l}</label><input style={S.inp} placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></div>
                ))}
              </div>
              <div>
                <label style={S.lbl}>Clinical Notes & Justification</label>
                <textarea style={{...S.inp,minHeight:"88px",resize:"vertical"}} placeholder="Patient history, prior treatments tried, clinical justification…"
                  value={form.clinicalNotes} onChange={e=>setForm({...form,clinicalNotes:e.target.value})}/>
              </div>
            </Card>

            <Card style={{marginBottom:"24px"}}>
              <div style={{fontSize:"11px",fontWeight:"700",color:"#4d8fff",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"18px"}}>👨‍⚕️ Provider Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                <div><label style={S.lbl}>Requesting Provider</label><input style={S.inp} placeholder="Dr. Name, Specialty" value={form.provider} onChange={e=>setForm({...form,provider:e.target.value})}/></div>
                <div><label style={S.lbl}>NPI Number</label><input style={S.inp} placeholder="10-digit NPI" value={form.npi} onChange={e=>setForm({...form,npi:e.target.value})}/></div>
              </div>
            </Card>

            <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
              <button style={S.btnS} onClick={reset}>← Back</button>
              <button style={{...S.btnP,opacity:isValid()?1:0.38,cursor:isValid()?"pointer":"not-allowed"}}
                onClick={()=>isValid()&&runAgents()}>Run IBM Granite Analysis →</button>
            </div>
          </div>
        )}

        {/* ══ PROCESSING ════════════════════════════════════════════════════ */}
        {screen==="processing" && (
          <div className="fu" style={{paddingTop:"32px",paddingBottom:"60px"}}>
            <h2 style={{fontSize:"22px",fontWeight:"800",letterSpacing:"-0.5px",marginBottom:"4px"}}>⚡ IBM Granite Processing</h2>
            <p style={{fontSize:"13px",color:"rgba(255,255,255,0.38)",marginBottom:"30px"}}>{form.patientName} · {form.procedure}</p>

            <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"26px"}}>
              {AGENTS.map(a=>{
                const st=agentSt[a.id]||"waiting";
                const border=st==="running"?"rgba(5,74,218,0.35)":st==="done"?"rgba(0,200,160,0.25)":st==="error"?"rgba(255,60,60,0.3)":"rgba(255,255,255,0.06)";
                const bg=st==="running"?"rgba(5,74,218,0.07)":st==="done"?"rgba(0,200,160,0.05)":st==="error"?"rgba(255,60,60,0.05)":"rgba(255,255,255,0.018)";
                return (
                  <div key={a.id} style={{display:"flex",alignItems:"center",gap:"14px",background:bg,border:`1px solid ${border}`,borderRadius:"13px",padding:"14px 18px",transition:"all .3s"}}>
                    <span style={{fontSize:"20px",width:"34px",textAlign:"center"}}>{a.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"13px",fontWeight:"700",color:"#fff",marginBottom:"1px"}}>{a.name}</div>
                      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.38)"}}>{a.desc}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
                      {st==="running" && <div style={S.spin}/>}
                      {st==="done"    && <span style={{color:"#00c8a0",fontSize:"17px"}}>✓</span>}
                      {st==="error"   && <span style={{color:"#ff6b6b",fontSize:"15px"}}>✗</span>}
                      <span style={{fontSize:"11px",fontWeight:"700",color:st==="running"?"#4d8fff":st==="done"?"#00c8a0":st==="error"?"#ff6b6b":"rgba(255,255,255,0.2)"}}>
                        {st==="running"?"PROCESSING":st==="done"?"COMPLETE":st==="error"?"ERROR":"WAITING"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background:"rgba(0,0,0,0.35)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"13px",padding:"14px 16px",maxHeight:"190px",overflowY:"auto",fontFamily:"monospace",fontSize:"11.5px"}}>
              {logs.length===0 && <span style={{color:"rgba(255,255,255,0.18)"}}>Initialising IBM Granite agents…</span>}
              {logs.map((l,i)=>(
                <div key={i} style={{marginBottom:"5px",lineHeight:"1.5",color:l.type==="success"?"#00c8a0":l.type==="error"?"#ff7a7a":l.type==="warn"?"#ffc107":"rgba(255,255,255,0.42)"}}>
                  <span style={{color:"rgba(255,255,255,0.2)"}}>[{l.t}]</span>{" "}
                  <span style={{color:"rgba(255,255,255,0.3)"}}>{AGENTS.find(a=>a.id===l.agentId)?.name}:</span>{" "}{l.msg}
                </div>
              ))}
              <div ref={logsEnd}/>
            </div>

            {runError && (
              <div style={S.err}>
                ⚠ {runError}
                <div style={{marginTop:"10px"}}>
                  <button style={{...S.btnS,fontSize:"12px",padding:"8px 16px"}} onClick={()=>setScreen("form")}>← Go Back</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ RESULT ════════════════════════════════════════════════════════ */}
        {screen==="result" && result && (()=>{
          const d={...DEFAULTS.decision,...(result.decision||{})}, el={...DEFAULTS.eligibility,...(result.eligibility||{})},
                po={...DEFAULTS.policy,...(result.policy||{})},    cl={...DEFAULTS.clinical,...(result.clinical||{})},
                co={...DEFAULTS.compliance,...(result.compliance||{})}, col=dc(d.decision||"PENDING_INFO");
          return (
            <div className="fu" style={{paddingBottom:"60px"}}>

              {/* Decision banner */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:"20px",marginBottom:"26px"}}>
                <div>
                  <div style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.32)",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:"10px"}}>Authorization Decision — IBM Granite</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:"14px",background:col.bg,border:`2px solid ${col.border}`,borderRadius:"14px",padding:"16px 22px"}}>
                    <span style={{fontSize:"30px"}}>{col.icon}</span>
                    <div>
                      <div style={{fontSize:"26px",fontWeight:"900",color:col.text,letterSpacing:"-1px"}}>{d.decision}</div>
                      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.32)",fontFamily:"monospace",marginTop:"3px"}}>{d.authorizationNumber}</div>
                    </div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"1px"}}>Confidence</div>
                  <div style={{fontSize:"44px",fontWeight:"900",color:"#fff",letterSpacing:"-2px",lineHeight:"1"}}>{d.confidenceScore}<span style={{fontSize:"18px",color:"rgba(255,255,255,0.3)"}}>%</span></div>
                  <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginTop:"4px"}}>Valid {d.validDays} days · {d.reviewedBy}</div>
                </div>
              </div>

              {/* Rationale */}
              <Card style={{marginBottom:"16px"}}>
                <CardTitle>📝 Decision Rationale</CardTitle>
                <p style={{fontSize:"14px",color:"rgba(255,255,255,0.75)",lineHeight:"1.65"}}>{d.primaryReason}</p>
              </Card>

              {/* 4 agent cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"14px",marginBottom:"16px"}}>
                <Card>
                  <CardTitle>🔍 Eligibility Agent</CardTitle>
                  <MRow label="Status"><Tag val={el.eligible} tl="ELIGIBLE" fl="INELIGIBLE"/></MRow>
                  <MRow label="Coverage">{el.coverageType||"—"}</MRow>
                  <MRow label="Copay">{el.copay||"—"}</MRow>
                  <MRow label="Deductible"><Tag val={el.deductibleMet} tl="MET" fl="NOT MET" fc="255,193,7"/></MRow>
                </Card>
                <Card>
                  <CardTitle>📋 Policy Agent</CardTitle>
                  <MRow label="PA Required"><Tag val={!po.requiresPA} tl="NOT REQ." fl="REQUIRED" fc="255,193,7"/></MRow>
                  <MRow label="Step Therapy"><Tag val={po.stepTherapyMet} tl="MET" fl="NOT MET"/></MRow>
                  <MRow label="Qty Limits">{po.quantityLimits||"As prescribed"}</MRow>
                </Card>
                <Card>
                  <CardTitle>🏥 Clinical Agent</CardTitle>
                  <MRow label="Med. Necessity"><Tag val={cl.medicallyNecessary} tl="CONFIRMED" fl="NOT MET"/></MRow>
                  <MRow label="Evidence">{(cl.evidenceLevel||"moderate").toUpperCase()}</MRow>
                  <MRow label="Score">{cl.clinicalScore}/100</MRow>
                  <Bar score={cl.clinicalScore}/>
                </Card>
                <Card>
                  <CardTitle>⚖️ Compliance Agent</CardTitle>
                  <MRow label="HIPAA"><Tag val={co.hipaaCompliant} tl="COMPLIANT" fl="FLAG"/></MRow>
                  <MRow label="NPI"><Tag val={co.npiValid} tl="VALID" fl="INVALID"/></MRow>
                  <MRow label="Score">{co.complianceScore}/100</MRow>
                  <Bar score={co.complianceScore}/>
                </Card>
              </div>

              {/* Conditions + Next Steps */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"16px"}}>
                <Card>
                  <CardTitle>📌 Conditions</CardTitle>
                  {(d.conditions||[]).map((c,i)=>(
                    <div key={i} style={{display:"flex",gap:"8px",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"13px",color:"rgba(255,255,255,0.65)",lineHeight:"1.5"}}>
                      <span style={{color:"#4d8fff",flexShrink:0}}>•</span>{c}
                    </div>
                  ))}
                </Card>
                <Card>
                  <CardTitle>🚀 Next Steps</CardTitle>
                  {(d.nextSteps||[]).map((s,i)=>(
                    <div key={i} style={{display:"flex",gap:"8px",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:"13px",color:"rgba(255,255,255,0.65)",lineHeight:"1.5"}}>
                      <span style={{color:"#00c8a0",fontWeight:"700",flexShrink:0}}>{i+1}.</span>{s}
                    </div>
                  ))}
                </Card>
              </div>

              {/* Patient summary */}
              <Card style={{display:"flex",gap:"28px",flexWrap:"wrap",marginBottom:"28px"}}>
                {[["Patient",result.form?.patientName],["Member ID",result.form?.memberId],
                  ["Procedure",result.form?.procedure],["Provider",result.form?.provider],
                  ["Urgency",(result.form?.urgency||"").toUpperCase()]].map(([lbl,val])=>(
                  <div key={lbl}>
                    <div style={{fontSize:"9px",color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:"3px"}}>{lbl}</div>
                    <div style={{fontSize:"13px",fontWeight:"600",color:"#e2e8f0"}}>{val||"—"}</div>
                  </div>
                ))}
              </Card>

              <div style={{display:"flex",gap:"10px",justifyContent:"flex-end"}}>
                <button style={S.btnS} onClick={()=>setScreen("form")}>← New Request</button>
                <button style={S.btnP} onClick={reset}>🏠 Home</button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
