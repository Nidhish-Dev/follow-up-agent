"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { Activity, AlertTriangle, Check, ChevronRight, CircleAlert, Clock, Cloud, Code2, Copy, Eye, EyeOff, GitBranch, Globe, KeyRound, LoaderCircle, LockKeyhole, Mail, Play, PowerOff, Radio, RefreshCw, Save, Send, Sheet, Sparkles, Square, Trash2, Webhook, Workflow, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { User, getAuth, signInAnonymously } from "firebase/auth";
import { getApps, initializeApp } from "firebase/app";

type ID = "openai" | "gmail" | "sheets" | "telegram" | "n8n" | "drive";
type Item = { id: ID; name: string; description: string; icon: typeof Sparkles; color: string; fields: { key: string; label: string; placeholder: string; secret?: boolean; textarea?: boolean }[] };
const services: Item[] = [
  {id:"openai",name:"OpenAI",description:"Generate outreach copy and revisions",icon:Sparkles,color:"#10a37f",fields:[{key:"apiKey",label:"API key",placeholder:"sk-...",secret:true},{key:"model",label:"Default model",placeholder:"gpt-4o-mini"},{key:"systemPrompt",label:"System prompt",placeholder:"You are an outreach assistant. Write concise, professional cold emails...",textarea:true}]},
  {id:"gmail",name:"Gmail",description:"Send approved outreach emails",icon:Mail,color:"#ea4335",fields:[{key:"email",label:"Sending address",placeholder:"hello@company.com"},{key:"oauthClientId",label:"OAuth client ID",placeholder:"...apps.googleusercontent.com",secret:true},{key:"oauthClientSecret",label:"OAuth client secret",placeholder:"Client secret",secret:true}]},
  {id:"sheets",name:"Google Sheets",description:"Lead tracking and approval states",icon:Sheet,color:"#34a853",fields:[{key:"spreadsheetId",label:"Spreadsheet ID",placeholder:"From the Google Sheets URL"},{key:"serviceAccountJson",label:"Service account JSON",placeholder:"Paste service account JSON",secret:true}]},
  {id:"telegram",name:"Telegram",description:"Approval buttons and draft previews",icon:Send,color:"#229ed9",fields:[{key:"botToken",label:"Bot token",placeholder:"123456:ABC...",secret:true},{key:"chatId",label:"Default chat ID",placeholder:"1965644994"}]},
  {id:"n8n",name:"n8n",description:"Run and receive workflow webhooks",icon:Workflow,color:"#ff6d5a",fields:[{key:"baseUrl",label:"n8n base URL",placeholder:"https://your-n8n.app"},{key:"webhookUrl",label:"Workflow webhook URL",placeholder:"https://.../webhook/...",secret:true},{key:"apiKey",label:"n8n API key",placeholder:"n8n_api_...",secret:true}]},
  {id:"drive",name:"Google Drive",description:"Publish outreach architecture diagrams",icon:Cloud,color:"#4285f4",fields:[{key:"folderId",label:"Destination folder ID",placeholder:"Google Drive folder ID"},{key:"oauthClientId",label:"OAuth client ID",placeholder:"...apps.googleusercontent.com",secret:true},{key:"oauthClientSecret",label:"OAuth client secret",placeholder:"Client secret",secret:true}]}
];
const flows = [
  ["Create a draft","orange",["Manual trigger / Webhook","Fetch leads from Tracking","Fetch existing responses","Fetch master leads","Deduplicate & qualify leads","OpenAI: generate AI Ops draft","Build diagram & email copy","Render diagram PNG","Upload diagram to Drive","Make diagram public","Save draft to Sheets","Send preview to Telegram"]],
  ["Approve or send","blue",["Telegram trigger","Only callback queries","Parse callback payload","Read automation response","Verify lead state","Route decision","Not found notification","Already sent notification","Mark Sending","Gmail: send to lead","Mark sent / failed in Sheets","Telegram send result"]],
  ["Revise the draft","violet",["Mark awaiting edit","Ask for edit instructions","OpenAI: revise existing draft","Build revised diagram & copy","Render revised diagram","Upload revised diagram","Make revised diagram public","Save revised draft","Send revised preview to Telegram"]]
];
function firebaseClient(){const config={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID};if(!config.apiKey||!config.authDomain||!config.projectId||!config.appId)return null;return getApps().length?getApps()[0]:initializeApp(config)}
function firebaseError(error:unknown){const code=typeof error==="object"&&error&&"code" in error?String(error.code):"";if(code==="auth/admin-restricted-operation"||code==="auth/operation-not-allowed")return"Enable Anonymous sign-in in Firebase Console: Authentication > Sign-in method > Anonymous.";return error instanceof Error?error.message:"Could not connect to Firebase."}
export default function Home(){
  const [tab, setTab] = useState<"integrations" | "workflow">("integrations"), [id, setId] = useState<ID>("openai"), [saved, setSaved] = useState<Record<string, any>>({}), [values, setValues] = useState<Record<string, string>>({}), [fbUser, setFbUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [deleting, setDeleting] = useState(false), [confirmDelete, setConfirmDelete] = useState(false), [triggering, setTriggering] = useState(false), [activeExecutionId, setActiveExecutionId] = useState<string | null>(null), [workflowTriggerCount, setWorkflowTriggerCount] = useState(0), [shown, setShown] = useState<Record<string, boolean>>({}), [notice, setNotice] = useState<any>(null), [liveCount, setLiveCount] = useState<number | null>(null); const current = services.find(x => x.id === id)!;
  const fetchIntegrations = async (user: User) => {
    setLoading(true);
    try {
      const t = await user.getIdToken();
      const r = await fetch("/api/integrations", { headers: { Authorization: `Bearer ${t}` } });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      const list = Object.fromEntries(d.integrations.map((x: any) => [x.id, x]));
      setSaved(list);
      setValues(list[id]?.values || list.openai?.values || {});
      fetch("/api/n8n/live-count", { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((cnt) => { if (cnt?.count != null) setLiveCount(cnt.count); })
        .catch(() => {});
    } catch (e) {
      setNotice({ type: "error", text: firebaseError(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const app = firebaseClient();
    if (!app) {
      setNotice({ type: "error", text: "Add Firebase public environment variables to enable secure saving." });
      setLoading(false);
      return;
    }
    signInAnonymously(getAuth(app))
      .then(async ({ user }) => {
        setFbUser(user);
        await fetchIntegrations(user);
      })
      .catch((e) => {
        setNotice({ type: "error", text: firebaseError(e) });
        setLoading(false);
      });
  }, []);

  const choose=(next:ID)=>{setId(next);setValues(saved[next]?.values||{});setNotice(null);setConfirmDelete(false)};
  const remove=async()=>{if(!confirmDelete){setConfirmDelete(true);return}if(!fbUser)return;setDeleting(true);setNotice(null);try{const t=await fbUser.getIdToken();const r=await fetch(`/api/integrations?id=${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${t}`}});const d=await r.json();if(!r.ok)throw Error(d.error);setSaved((x:any)=>{const n={...x};delete n[id];return n});setValues({});setConfirmDelete(false);const n8nMsg=d.n8nDeleted?.deleted?` and removed from n8n`:``;setNotice({type:"success",text:`${current.name} credentials deleted${n8nMsg}.`})}catch(e){setNotice({type:"error",text:e instanceof Error?e.message:"Could not delete"})}finally{setDeleting(false)}};
  const save=async(e:FormEvent)=>{e.preventDefault();if(!fbUser)return;setSaving(true);setNotice(null);try{const t=await fbUser.getIdToken();const r=await fetch("/api/integrations",{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({id,values})});const d=await r.json();if(!r.ok)throw Error(d.error);if(id==="n8n"&&values.baseUrl&&typeof window!=="undefined"){localStorage.setItem("n8n_base_url",values.baseUrl)}if(d.allIntegrations){const list=Object.fromEntries(d.allIntegrations.map((x:any)=>[x.id,x]));setSaved(list);if(list[id]?.values)setValues(list[id].values)}else{setSaved(x=>({...x,[id]:d.integration}));setValues(d.integration.values)}if(id==="n8n"){const t2=await fbUser.getIdToken();const sync=await fetch("/api/n8n/provision",{method:"POST",headers:{Authorization:`Bearer ${t2}`}});const report=await sync.json();if(!sync.ok)throw Error(report.error);const results:{service:string;status:string;detail:string}[]=report.results;const failures=results.filter(r=>r.status==="failed").length;const actRequired=results.filter(r=>r.status==="action_required").length;const created=results.filter(r=>r.status==="created").length;setNotice({type:failures?"error":"success",text:`n8n saved. Pushed ${created} credential${created!==1?"s":""} to n8n${actRequired?` · ${actRequired} need${actRequired===1?"s":""} Google OAuth sign-in inside n8n`:""}${failures?` · ${failures} failed`:""}. `,results})}else{const synced=d.n8nSync?.results?.some((s:any)=>s.status==="synced");setNotice({type:"success",text:`${current.name} credentials saved${synced?" and automatically synced to n8n":""}.`})}}catch(e){setNotice({type:"error",text:e instanceof Error?e.message:"Could not save"})}finally{setSaving(false)}};
  const triggerWorkflow=async()=>{
    if(!fbUser)return;
    setTriggering(true);
    setNotice(null);
    try{
      const t=await fbUser.getIdToken();
      const r=await fetch("/api/workflow/trigger",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({})});
      const d=await r.json();
      if(!r.ok)throw Error(d.error);
      const execId = d.executionId ? String(d.executionId) : null;
      setActiveExecutionId(execId);
      setWorkflowTriggerCount(c => c + 1);
      setNotice({type:"success",text:execId ? `Workflow started (Execution #${execId}). Tracking live execution steps...` : "Workflow started successfully via n8n webhook! Tracking execution..."});
    }catch(e){
      setNotice({type:"error",text:e instanceof Error?e.message:"Failed to trigger workflow"});
      setTriggering(false);
    }
  };

  return <main className="app-shell">{loading&&<div style={{position:"fixed",inset:0,background:"rgba(245,246,248,0.72)",backdropFilter:"blur(5px)",WebkitBackdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,pointerEvents:"auto"}}><div style={{background:"#fff",padding:"20px 28px",borderRadius:"12px",border:"1px solid var(--line)",boxShadow:"0 14px 38px rgba(16,25,43,0.12)",display:"flex",alignItems:"center",gap:"14px"}}><LoaderCircle className="spin" size={24} color="var(--orange)"/><div style={{display:"flex",flexDirection:"column"}}><span style={{fontSize:"14px",fontWeight:700,color:"var(--ink)",letterSpacing:"-.2px"}}>Loading credentials…</span><span style={{fontSize:"11px",color:"var(--muted)",marginTop:"2px"}}>Syncing with workspace vault</span></div></div></div>}<aside className="sidebar"><div className="brand"><div className="brand-mark"><Sparkles size={18}/></div><span>grapelabs</span></div><nav><button className={tab==="integrations"?"nav-link active":"nav-link"} onClick={()=>setTab("integrations")}><KeyRound size={18}/>Integrations</button><button className={tab==="workflow"?"nav-link active":"nav-link"} onClick={()=>setTab("workflow")}><Workflow size={18}/>Workflow control</button></nav></aside><section className="content"><header className="topbar"><div><p className="eyebrow">FOLLOWUP AGENT</p><h1>{tab==="integrations"?"Connection vault":"Workflow control"}</h1></div><div className="topbar-actions"><button className="save-button" style={{background:"#10a37f",gap:"7px"}} disabled={triggering||loading} onClick={triggerWorkflow}>{triggering?<LoaderCircle className="spin" size={15}/>:<Play size={15} fill="currentColor"/>} {triggering?"Starting...":"Start workflow"}</button><span className="secure-label"><LockKeyhole size={14}/>Encrypted at rest</span><button className="icon-button" title="Refresh saved integrations" onClick={()=>fbUser?fetchIntegrations(fbUser):location.reload()}><RefreshCw size={17}/></button></div></header>{notice&&tab==="workflow"&&<div className={`notice ${notice.type}`} style={{marginTop:"20px"}}><CircleAlert size={16}/>{notice.text}</div>}{tab==="integrations"?<><section className="summary-grid"><div className="summary-card"><div className="summary-icon green"><Check size={19}/></div><div><strong>{services.filter(s=>saved[s.id]?.configured).length} / {services.length}</strong><span>connections configured</span></div></div><div className="summary-card"><div className="summary-icon orange"><Play size={19}/></div><div><strong>{liveCount!=null?liveCount:"—"} live paths</strong><span>from your n8n workflow</span></div></div><div className="summary-card callout"><span>All credential values are encrypted before Firestore storage and return here masked.</span></div></section><div className="settings-grid"><section className="integration-list"><div className="section-heading"><div><p className="eyebrow">CONNECTIONS</p><h2>Services</h2></div></div>{services.map(s=>{const Icon=s.icon;return <button key={s.id} className={id===s.id?"integration-row selected":"integration-row"} onClick={()=>choose(s.id)}><span className="service-icon" style={{backgroundColor:s.color}}><Icon size={18}/></span><span className="service-copy"><b>{s.name}</b><small>{s.description}</small></span><span className={saved[s.id]?.configured?"status-dot ready":"status-dot"}/></button>})}</section><section className="credential-panel"><div className="credential-head"><div className="large-service-icon" style={{backgroundColor:current.color}}><current.icon size={25}/></div><div><p className="eyebrow">{current.name.toUpperCase()} CONNECTION</p><h2>{current.name}</h2><p>{current.description}</p></div></div>{notice&&<div className={`notice ${notice.type}`}><CircleAlert size={16}/><div style={{flex:1}}><span>{notice.text}</span>{notice.results&&<ul style={{margin:"6px 0 0",padding:"0 0 0 18px",fontSize:"0.82em",lineHeight:1.6}}>{(notice.results as {service:string;status:string;detail:string}[]).map(r=><li key={r.service} style={{color:r.status==="created"?"#22c55e":r.status==="failed"?"#ef4444":r.status==="action_required"?"#f59e0b":"inherit"}}><b>{r.service}:</b> {r.detail}</li>)}</ul>}</div></div>}<form onSubmit={save}>{current.fields.map(f=><label className="field" key={f.key}><span>{f.label}</span><div className="input-wrap">{f.textarea?<textarea value={values[f.key]||""} placeholder={f.placeholder} rows={5} style={{resize:"vertical",fontFamily:"inherit",fontSize:"inherit",lineHeight:1.5,padding:"9px 12px",border:"1px solid var(--border)",borderRadius:"8px",background:"var(--input-bg)",color:"inherit",width:"100%",boxSizing:"border-box"}} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))}/>:<><input required value={values[f.key]||""} type={f.secret&&!shown[f.key]?"password":"text"} placeholder={f.placeholder} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))}/>{f.secret&&<button type="button" className="peek-button" onClick={()=>setShown(v=>({...v,[f.key]:!v[f.key]}))}>{shown[f.key]?<EyeOff size={17}/>:<Eye size={17}/>}</button>}</>}</div></label>)}<div className="form-footer"><span><LockKeyhole size={14}/>Stored in your Firebase vault</span><div style={{display:"flex",gap:"8px"}}>{saved[id]?.configured&&<button type="button" className="save-button" style={{background:confirmDelete?"#ef4444":"transparent",color:confirmDelete?"#fff":"#ef4444",border:"1px solid #ef4444"}} disabled={deleting||loading} onClick={remove}>{deleting?<LoaderCircle className="spin" size={17}/>:<Trash2 size={17}/>} {deleting?"Deleting…":confirmDelete?"Confirm delete?":"Delete"}</button>}<button className="save-button" disabled={saving||loading}>{saving?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>} {saving?"Saving":"Save connection"}</button></div></div></form></section></div></> :<WorkflowView fbUser={fbUser} onTrigger={triggerWorkflow} triggering={triggering} setTriggering={setTriggering} activeExecutionId={activeExecutionId} workflowTriggerCount={workflowTriggerCount} setNotice={setNotice} webhookUrl={saved.n8n?.values?.webhookUrl}/>}</section></main>}

function getNodeIcon(service: string) {
  switch (service) {
    case "webhook":
      return <Webhook size={13} color="#ea580c" />;
    case "openai":
      return <Sparkles size={13} color="#10a37f" />;
    case "gmail":
      return <Mail size={13} color="#ea4335" />;
    case "sheets":
      return <Sheet size={13} color="#16a34a" />;
    case "telegram":
      return <Send size={13} color="#0284c7" />;
    case "drive":
      return <Cloud size={13} color="#2563eb" />;
    case "code":
      return <Code2 size={13} color="#7c3aed" />;
    case "http":
      return <Globe size={13} color="#0891b2" />;
    case "logic":
      return <GitBranch size={13} color="#d97706" />;
    default:
      return <Activity size={13} color="#64748b" />;
  }
}

function WorkflowView({
  fbUser,
  onTrigger,
  triggering,
  setTriggering,
  activeExecutionId,
  workflowTriggerCount,
  setNotice,
  webhookUrl,
}: {
  fbUser: User | null;
  onTrigger: () => void;
  triggering: boolean;
  setTriggering: (v: boolean) => void;
  activeExecutionId: string | null;
  workflowTriggerCount: number;
  setNotice: (n: any) => void;
  webhookUrl?: string;
}) {
  const [loadingWorkflow, setLoadingWorkflow] = useState(true);
  const [wfData, setWfData] = useState<any>(null);
  const [selectedWfId, setSelectedWfId] = useState<string | null>(null);
  const [execution, setExecution] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [stoppingExecution, setStoppingExecution] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchWorkflow = async (wfId?: string) => {
    if (!fbUser) return;
    setLoadingWorkflow(true);
    try {
      const t = await fbUser.getIdToken();
      const url = wfId ? `/api/n8n/workflow?workflowId=${encodeURIComponent(wfId)}` : "/api/n8n/workflow";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (res.ok && data.workflow) {
        setWfData(data);
        if (!selectedWfId && data.workflow.id) {
          setSelectedWfId(data.workflow.id);
        }
      }
    } catch (err) {
      console.error("Failed to load workflow", err);
    } finally {
      setLoadingWorkflow(false);
    }
  };

  const toggleWorkflowActive = async (shouldActivate: boolean) => {
    if (!fbUser) return;
    setTogglingActive(true);
    try {
      const t = await fbUser.getIdToken();
      const targetWfId = selectedWfId || wfData?.workflow?.id || "aCjx6rCJa5glRnBS";
      const res = await fetch("/api/n8n/workflow/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ workflowId: targetWfId, active: shouldActivate }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update workflow status");
      }
      setWfData((prev: any) => ({
        ...prev,
        workflow: {
          ...prev?.workflow,
          active: data.active,
        },
      }));
      setNotice({
        type: "success",
        text: shouldActivate
          ? "Workflow published & activated successfully! Incoming webhooks and triggers are live."
          : "Kill switch activated — workflow unpublished & deactivated. All triggers are offline.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "Failed to update workflow state.",
      });
    } finally {
      setTogglingActive(false);
    }
  };

  const stopExecution = async () => {
    if (!fbUser) return;
    setStoppingExecution(true);
    try {
      const t = await fbUser.getIdToken();
      const execId = execution?.id || activeExecutionId;
      if (execId) {
        await fetch("/api/n8n/executions/stop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({ executionId: execId }),
        });
      }
      setIsPolling(false);
      setTriggering(false);
      setExecution((prev: any) => ({
        ...prev,
        status: "halted",
        finished: true,
        error: "Execution stopped by user",
        stoppedAt: new Date().toISOString(),
      }));
      setNotice({
        type: "success",
        text: "Workflow execution stopped.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "Failed to stop execution.",
      });
    } finally {
      setStoppingExecution(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = webhookUrl || "https://n8n-production-0ef21.up.railway.app/webhook/followup-agent";
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const pollExecution = async (execId?: string | null) => {
    if (!fbUser) return null;
    try {
      const t = await fbUser.getIdToken();
      const currentWfId = selectedWfId || wfData?.workflow?.id;
      let url = "/api/n8n/executions";
      const params = new URLSearchParams();
      if (execId) params.set("executionId", execId);
      if (currentWfId && currentWfId !== "default-fallback") params.set("workflowId", currentWfId);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.execution) {
        setExecution(data.execution);
        return data.execution;
      }
      return null;
    } catch (e) {
      console.warn("Poll execution error:", e);
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    if (fbUser) {
      fetchWorkflow("aCjx6rCJa5glRnBS");
      pollExecution();
    }
  }, [fbUser]);

  // Polling loop when triggering or trigger count changes
  useEffect(() => {
    if (!triggering && !activeExecutionId && workflowTriggerCount === 0) return;

    setIsPolling(true);
    const startMs = Date.now();
    let pollCount = 0;

    const timer = setInterval(async () => {
      pollCount++;
      setExecutionDuration(Math.round((Date.now() - startMs) / 1000));
      const exec = await pollExecution(activeExecutionId);

      if (exec?.finished || pollCount >= 50) {
        clearInterval(timer);
        setIsPolling(false);
        setTriggering(false);
        if (exec?.finished && exec?.status === "success") {
          setNotice({
            type: "success",
            text: `Workflow completed in ${Math.round((Date.now() - startMs) / 1000)}s! All nodes executed successfully.`,
          });
        } else if (exec?.finished && exec?.status === "error") {
          setNotice({
            type: "error",
            text: `Workflow execution stopped with an error at ${exec.lastNodeExecuted || "node"}.`,
          });
        }
      }
    }, 1500);

    // Initial immediate poll
    pollExecution(activeExecutionId);

    return () => {
      clearInterval(timer);
    };
  }, [triggering, activeExecutionId, workflowTriggerCount]);

  const isWorkflowActive = wfData?.workflow?.active === true;
  const isExecuting = triggering || isPolling || execution?.status === "running";
  const isDone = execution?.finished === true;
  const isSuccess = isDone && (execution?.status === "success" || !execution?.error);
  const isHalted = isDone && !isSuccess;

  const nodeRunEntries = Object.entries(execution?.nodeRuns || {});
  const completedNodesCount = nodeRunEntries.filter(([_, r]: any) => r.status === "success").length;
  const failedNodesCount = nodeRunEntries.filter(([_, r]: any) => r.status === "error").length;

  const formatRunDuration = () => {
    if (execution?.startedAt && execution?.stoppedAt) {
      const diffMs = new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
      if (diffMs > 0) return `${(diffMs / 1000).toFixed(1)}s`;
    }
    if (executionDuration != null) return `${executionDuration}s`;
    return null;
  };

  return (
    <>
      <section className="workflow-intro">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              {wfData?.source === "n8n_live" ? "REAL-TIME FROM N8N" : "WORKSPACE PREVIEW"}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: "10px",
                background: isWorkflowActive ? "#e6f9f0" : "#fee2e2",
                color: isWorkflowActive ? "#0b7951" : "#b91c1c",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isWorkflowActive ? "#2ab779" : "#dc2626",
                }}
              />
              {isWorkflowActive ? "Live & Active" : "Unpublished / Disabled"}
            </span>
          </div>
          <h2>{wfData?.workflow?.name || "FollowUp Agent"}</h2>
          <p>
            {wfData?.workflow?.totalNodes || "38"} nodes configured • Pipeline managed via n8n engine
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="icon-button"
            title="Refresh workflow status from n8n"
            onClick={() => fetchWorkflow("aCjx6rCJa5glRnBS")}
            disabled={loadingWorkflow}
          >
            <RefreshCw size={15} className={loadingWorkflow ? "spin" : ""} />
          </button>

          {/* Kill Switch or Publish Workflow button */}
          {isWorkflowActive ? (
            <button
              type="button"
              className="btn-kill"
              onClick={() => toggleWorkflowActive(false)}
              disabled={togglingActive}
              title="Unpublish workflow immediately to stop all incoming traffic"
            >
              {togglingActive ? <LoaderCircle size={15} className="spin" /> : <PowerOff size={15} />}
              Kill switch (Unpublish)
            </button>
          ) : (
            <button
              type="button"
              className="btn-publish"
              onClick={() => toggleWorkflowActive(true)}
              disabled={togglingActive}
              title="Publish workflow to enable live execution and triggers"
            >
              {togglingActive ? <LoaderCircle size={15} className="spin" /> : <Radio size={15} />}
              Publish workflow
            </button>
          )}

          {/* Stop Execution Button (visible when running) */}
          {(isExecuting || isPolling) && (
            <button
              type="button"
              className="btn-stop"
              onClick={stopExecution}
              disabled={stoppingExecution}
              title="Abort currently running execution"
            >
              {stoppingExecution ? <LoaderCircle size={15} className="spin" /> : <Square size={15} fill="currentColor" />}
              Stop execution
            </button>
          )}

          <button
            className="save-button"
            style={{ background: "#10a37f", gap: "7px" }}
            disabled={triggering || isPolling || !isWorkflowActive}
            onClick={onTrigger}
            title={!isWorkflowActive ? "Publish workflow first before starting execution" : "Trigger FollowUp Agent"}
          >
            {triggering || isPolling ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            {triggering || isPolling ? "Executing..." : "Start workflow"}
          </button>
        </div>
      </section>

      {/* Execution status banner */}
      {execution && (
        <div
          className={`exec-banner ${
            isExecuting
              ? "running"
              : isHalted
              ? "error"
              : "success"
          }`}
          style={{ padding: "16px 20px" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 }}>
            <div style={{ marginTop: "2px" }}>
              {isExecuting ? (
                <span className="pulse-dot" style={{ width: "12px", height: "12px" }} />
              ) : isSuccess ? (
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#dcfce7", display: "grid", placeItems: "center" }}>
                  <Check size={16} color="#15803d" />
                </div>
              ) : (
                <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center" }}>
                  <CircleAlert size={16} color="#b91c1c" />
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                <strong style={{ fontSize: "14px", color: "var(--ink)", letterSpacing: "-.2px" }}>
                  {isExecuting
                    ? `Live execution in progress: executing "${execution.runningNode || "nodes..."}"`
                    : isSuccess
                    ? `Execution #${execution.id} completed successfully!`
                    : `Workflow halted: "${execution.error || execution.lastNodeExecuted || "Execution stopped"}"`}
                </strong>

                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: isExecuting ? "#ffedd5" : isSuccess ? "#dcfce7" : "#fee2e2",
                    color: isExecuting ? "#c2410c" : isSuccess ? "#15803d" : "#b91c1c",
                  }}
                >
                  {isExecuting ? "RUNNING" : isSuccess ? "DONE" : "HALTED"}
                </span>
              </div>

              <p style={{ margin: "2px 0 8px", fontSize: "12px", color: "var(--muted)" }}>
                {isExecuting
                  ? "Tracing node executions in real time from n8n engine..."
                  : isSuccess
                  ? `All ${completedNodesCount} step(s) completed without error. Total runtime: ${formatRunDuration() || "instant"}.`
                  : `Execution halted with error: ${execution.error || "Execution terminated prematurely"}.`}
              </p>

              {/* Status and timing chips */}
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px", color: "var(--muted)" }}>
                <span>
                  <b>Steps:</b> {completedNodesCount} completed {failedNodesCount > 0 && `• ${failedNodesCount} failed`}
                </span>
                {formatRunDuration() && (
                  <span>
                    <b>Duration:</b> {formatRunDuration()}
                  </span>
                )}
                {execution.startedAt && (
                  <span>
                    <b>Started:</b> {new Date(execution.startedAt).toLocaleTimeString()}
                  </span>
                )}
                {execution.stoppedAt && (
                  <span>
                    <b>Finished:</b> {new Date(execution.stoppedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "14px" }}>
            {(isExecuting || isPolling) && (
              <button
                type="button"
                className="btn-stop"
                style={{ minHeight: "32px", padding: "0 10px", fontSize: "11px" }}
                onClick={stopExecution}
                disabled={stoppingExecution}
                title="Stop execution immediately"
              >
                <Square size={12} fill="currentColor" />
                Stop
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              title="Refresh execution status"
              style={{ width: "32px", height: "32px" }}
              onClick={() => pollExecution(execution.id)}
            >
              <RefreshCw size={13} />
            </button>
            <button
              type="button"
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "6px 11px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
              }}
              onClick={() => setShowSummaryModal(true)}
            >
              <Activity size={13} color="#475569" />
              Inspect run
            </button>
            <button
              type="button"
              style={{ background: "transparent", border: 0, color: "var(--muted)", padding: "4px", cursor: "pointer" }}
              title="Dismiss banner"
              onClick={() => setExecution(null)}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Workflow Control Board (Clean replacements for the removed 38-node map) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* Card 1: Lifecycle & Kill Switch */}
        <div className="control-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>LIFECYCLE STATUS</span>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--ink)" }}>
                {wfData?.workflow?.name || "FollowUp Agent"}
              </h3>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "12px",
                background: isWorkflowActive ? "#dcfce7" : "#fee2e2",
                color: isWorkflowActive ? "#15803d" : "#b91c1c",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: isWorkflowActive ? "#16a34a" : "#dc2626",
                }}
              />
              {isWorkflowActive ? "PUBLISHED / ACTIVE" : "UNPUBLISHED / INACTIVE"}
            </span>
          </div>

          <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.55, margin: "0 0 20px" }}>
            {isWorkflowActive
              ? "The workflow is live in n8n and listening for incoming triggers and webhook calls. Triggering the Kill Switch immediately takes the workflow offline."
              : "The workflow is currently unpublished. Triggers are disabled in n8n and incoming webhooks will be rejected until published again."}
          </p>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {isWorkflowActive ? (
              <button
                type="button"
                className="btn-kill"
                onClick={() => toggleWorkflowActive(false)}
                disabled={togglingActive}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {togglingActive ? <LoaderCircle size={15} className="spin" /> : <PowerOff size={15} />}
                Kill switch (Unpublish workflow)
              </button>
            ) : (
              <button
                type="button"
                className="btn-publish"
                onClick={() => toggleWorkflowActive(true)}
                disabled={togglingActive}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {togglingActive ? <LoaderCircle size={15} className="spin" /> : <Radio size={15} />}
                Publish workflow
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Webhook Trigger Point */}
        <div className="control-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>TRIGGER POINT</span>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--ink)" }}>
                Webhook Endpoint
              </h3>
            </div>
            <Webhook size={18} color="var(--orange)" />
          </div>

          <p style={{ fontSize: "12.5px", color: "var(--muted)", lineHeight: 1.55, margin: "0 0 14px" }}>
            Trigger this workflow on demand. When execution starts, steps are processed through the FollowUp Agent pipeline.
          </p>

          {webhookUrl && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--canvas)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  gap: "8px",
                }}
              >
                <code
                  style={{
                    fontSize: "11px",
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                  title={webhookUrl}
                >
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  title="Copy webhook URL"
                  style={{
                    border: 0,
                    background: "transparent",
                    color: copiedWebhook ? "#16a34a" : "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  {copiedWebhook ? <Check size={13} /> : <Copy size={13} />}
                  {copiedWebhook ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="save-button"
              style={{ flex: 1, justifyContent: "center", background: "#10a37f" }}
              disabled={triggering || isPolling || !isWorkflowActive}
              onClick={onTrigger}
            >
              {triggering || isPolling ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              {triggering || isPolling ? "Executing..." : "Start workflow"}
            </button>

            {(isExecuting || isPolling) && (
              <button
                type="button"
                className="btn-stop"
                onClick={stopExecution}
                disabled={stoppingExecution}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {stoppingExecution ? <LoaderCircle size={15} className="spin" /> : <Square size={15} fill="currentColor" />}
                Stop execution
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Execution Status & Details */}
        <div className="control-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "4px" }}>RUN STATUS</span>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--ink)" }}>
                Latest Execution
              </h3>
            </div>
            <Activity size={18} color="#64748b" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <div style={{ background: "var(--canvas)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>Status</span>
              <strong style={{ display: "block", fontSize: "13px", marginTop: "2px", color: isExecuting ? "#c2410c" : isSuccess ? "#15803d" : execution ? "#b91c1c" : "var(--ink)" }}>
                {isExecuting ? "Running..." : isSuccess ? "Success" : isHalted ? "Halted / Stopped" : "Idle"}
              </strong>
            </div>
            <div style={{ background: "var(--canvas)", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>Duration</span>
              <strong style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>
                {formatRunDuration() || "—"}
              </strong>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "18px" }}>
            {execution ? (
              <span>
                Execution #{execution.id} • {completedNodesCount} step(s) completed {failedNodesCount > 0 && `• ${failedNodesCount} failed`}
              </span>
            ) : (
              <span>No execution has been recorded yet. Click &quot;Start workflow&quot; to begin.</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            disabled={!execution}
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "9px 14px",
              fontSize: "12px",
              fontWeight: 600,
              color: execution ? "var(--ink)" : "var(--muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: execution ? "pointer" : "not-allowed",
              opacity: execution ? 1 : 0.6,
            }}
          >
            <Activity size={14} color="#64748b" />
            Inspect execution steps
          </button>
        </div>
      </div>

      {/* Full Execution Timeline Modal */}
      {showSummaryModal && execution && (
        <div className="exec-summary-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="exec-summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exec-summary-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Activity size={18} color="var(--orange)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "var(--ink)" }}>
                    Execution #{execution.id} Details
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Status: {isSuccess ? "Completed Successfully" : isHalted ? "Halted with Error" : "Running"} • Duration: {formatRunDuration() || "—"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="exec-summary-body" style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--canvas)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>Started At</span>
                  <strong style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>
                    {execution.startedAt ? new Date(execution.startedAt).toLocaleTimeString() : "—"}
                  </strong>
                </div>
                <div style={{ background: "var(--canvas)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>Finished At</span>
                  <strong style={{ display: "block", fontSize: "13px", marginTop: "2px" }}>
                    {execution.stoppedAt ? new Date(execution.stoppedAt).toLocaleTimeString() : isExecuting ? "In progress..." : "—"}
                  </strong>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: "11px", textTransform: "uppercase", letterSpacing: ".6px", color: "var(--muted)" }}>
                  Executed Steps Timeline ({completedNodesCount} succeeded, {failedNodesCount} failed)
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {nodeRunEntries.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>No steps recorded yet.</p>
                  ) : (
                    nodeRunEntries.map(([nodeName, r]: any, idx: number) => (
                      <div
                        key={nodeName}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid",
                          borderColor: r.status === "success" ? "#bbf7d0" : r.status === "error" ? "#fecdd3" : "#fed7aa",
                          background: r.status === "success" ? "#f0fdf4" : r.status === "error" ? "#fff1f2" : "#fff7ed",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, opacity: 0.6 }}>#{idx + 1}</span>
                          {r.status === "success" ? (
                            <Check size={14} color="#16a34a" />
                          ) : r.status === "error" ? (
                            <CircleAlert size={14} color="#dc2626" />
                          ) : (
                            <LoaderCircle size={14} className="spin" color="#ea580c" />
                          )}
                          <b style={{ color: "var(--ink)" }}>{nodeName}</b>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", color: "var(--muted)" }}>
                          {r.itemCount != null && r.itemCount > 0 && <span>{r.itemCount} items</span>}
                          {r.executionTime != null && <b style={{ color: "var(--ink)" }}>{r.executionTime}ms</b>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="workflow-note" style={{ marginTop: "24px" }}>
        <Webhook size={20} />
        <div>
          <b>Live n8n Control Active</b>
          <p>
            Connected to FollowUp Agent on n8n. Manage lifecycle status with the Kill Switch, stop running executions, or initiate new pipeline runs with instant state updates.
          </p>
        </div>
      </section>
    </>
  );
}
