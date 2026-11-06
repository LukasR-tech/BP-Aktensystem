// Bundespolizei-RP-Aktensystem. Nur für fiktive RP-Daten.
// Vor Nutzung URL und anon key in config.js eintragen.
const PASSWORD_KEY="bp_akten_demo_password", DEFAULT_PASSWORD="BP-RP-2026";
const SUPABASE_URL = window.BP_SUPABASE_URL || "HIER_SUPABASE_PROJECT_URL_EINTRAGEN";
const SUPABASE_ANON_KEY = window.BP_SUPABASE_ANON_KEY || "HIER_SUPABASE_ANON_KEY_EINTRAGEN";
const DB_TABLE = "bp_akten_state";
let dbReady = false;
function configured(){return SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("HIER_") && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("HIER_")}
async function dbRequest(method="GET", payload=null){
  if(!configured()) throw new Error("Supabase ist noch nicht konfiguriert. Bitte config.js ausfüllen.");
  const endpoint=method==="POST"?`${SUPABASE_URL}/rest/v1/${DB_TABLE}?on_conflict=id`:`${SUPABASE_URL}/rest/v1/${DB_TABLE}?id=eq.1`;
  const response=await fetch(endpoint,{method,headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`,"Content-Type":"application/json","Prefer":method==="POST"?"resolution=merge-duplicates,return=minimal":"return=representation"},...(payload?{body:JSON.stringify(payload)}:{})});
  if(!response.ok) throw new Error(`Datenbankfehler (${response.status}). Prüfe Supabase-Konfiguration und SQL-Richtlinien.`);
  if(response.status===204) return [];
  const text=await response.text(); return text?JSON.parse(text):[];
}
const $=id=>document.getElementById(id), state={cases:[],persons:[],evidence:[]}; let toastTimer;
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function displayDate(v){if(!v)return "—";const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleDateString("de-DE")}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function id(prefix){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}
async function load(){
  try {
    const rows=await dbRequest("GET");
    const d=rows?.[0]?.payload || {cases:[],persons:[],evidence:[]};
    state.cases=Array.isArray(d.cases)?d.cases:[];state.persons=Array.isArray(d.persons)?d.persons:[];state.evidence=Array.isArray(d.evidence)?d.evidence:[];
    dbReady=true; renderAll(); toast("Gemeinsame Akten geladen.");
  } catch(err) { dbReady=false; toast(err.message || "Datenbank konnte nicht geladen werden."); console.error(err); }
}
async function save(){
  try {
    if(!dbReady) throw new Error("Keine Verbindung zur gemeinsamen Datenbank. Bitte Seite neu laden.");
    await dbRequest("POST",{id:1,payload:state,updated_at:new Date().toISOString()});
    renderAll(); return true;
  } catch(err) { toast(err.message || "Speichern fehlgeschlagen."); console.error(err); return false; }
}
function currentCreator(){return (sessionStorage.getItem("bp_creator_name")||"").trim()}
function ownsCase(c){return !!c && !!currentCreator() && String(c.creatorName||"").trim().toLocaleLowerCase("de")===currentCreator().toLocaleLowerCase("de")}
function requireOwner(c){if(!ownsCase(c)){toast("Nur der eingetragene Ersteller darf diese Akte bearbeiten.");return false}return true}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2500)}
function caseNo(){const y=new Date().getFullYear(), nums=state.cases.map(c=>Number((c.number||"").split("-").at(-1))).filter(Number.isFinite);return `BP-${y}-${String(Math.max(0,...nums)+1).padStart(5,"0")}`}
function sclass(s){return s==="Offen"?"open":s==="In Bearbeitung"?"progress":s==="Abgeschlossen"?"closed":"archived"}
function empty(t,d){return `<div class="empty"><strong>${esc(t)}</strong><span>${esc(d)}</span></div>`}
function caseRows(items){if(!items.length)return empty("Keine Akten gefunden","Erstelle eine neue Akte oder passe die Suche an.");return `<table><thead><tr><th>Aktenzeichen</th><th>Vorgang</th><th>Sachbearbeiter</th><th>Status</th><th>Datum</th><th>Aktionen</th></tr></thead><tbody>${items.map(c=>`<tr><td><button class="case-link" data-action="view-case" data-id="${esc(c.id)}">${esc(c.number)}</button></td><td><span class="cell-main">${esc(c.title)}</span><span class="cell-sub">${esc(c.type)}</span></td><td>${esc(c.officer||"Nicht zugewiesen")}</td><td><span class="pill ${sclass(c.status)}">${esc(c.status)}</span></td><td>${displayDate(c.date)}</td><td><div class="row-actions">${ownsCase(c)?`<button class="small-btn" data-action="edit-case" data-id="${esc(c.id)}">Bearbeiten</button><button class="small-btn" data-action="delete-case" data-id="${esc(c.id)}">Löschen</button>`:`<span class="cell-sub">Nur lesbar</span>`}</div></td></tr>`).join("")}</tbody></table>`}
function renderDashboard(){$("statTotal").textContent=state.cases.length;$("statOpen").textContent=state.cases.filter(c=>["Offen","In Bearbeitung"].includes(c.status)).length;$("statClosed").textContent=state.cases.filter(c=>["Abgeschlossen","Archiviert"].includes(c.status)).length;$("statPersons").textContent=state.persons.length;const recent=[...state.cases].sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).slice(0,5);$("recentCases").innerHTML=recent.length?caseRows(recent):empty("Noch keine Vorgänge","Erstelle deine erste Ermittlungsakte.")}
function renderCases(){const q=$("caseSearch").value.trim().toLocaleLowerCase("de"),s=$("statusFilter").value;const items=[...state.cases].filter(c=>(!q||[c.number,c.title,c.officer,c.type,c.facts].join(" ").toLocaleLowerCase("de").includes(q))&&(!s||c.status===s)).sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||""));$("casesTable").innerHTML=caseRows(items)}
function renderPersons(){const q=$("personSearch").value.trim().toLocaleLowerCase("de"),items=state.persons.filter(p=>[p.name,p.number,p.role,p.contact].join(" ").toLocaleLowerCase("de").includes(q));$("personsTable").innerHTML=items.length?`<table><thead><tr><th>Personen-ID</th><th>Name</th><th>Rolle</th><th>Kontakt / RP-Kennung</th><th>Aktionen</th></tr></thead><tbody>${items.map(p=>`<tr><td>${esc(p.number)}</td><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(p.contact||"—")}</td><td><div class="row-actions"><button class="small-btn" data-action="edit-person" data-id="${esc(p.id)}">Bearbeiten</button><button class="small-btn" data-action="delete-person" data-id="${esc(p.id)}">Löschen</button></div></td></tr>`).join("")}</tbody></table>`:empty("Keine Personen gefunden","Lege eine Person an oder ändere die Suche.")}
function renderEvidence(){const q=$("evidenceSearch").value.trim().toLocaleLowerCase("de"),items=state.evidence.filter(e=>{const c=state.cases.find(c=>c.id===e.caseId);return [e.title,e.type,e.description,e.fileName,c?.number,c?.title].join(" ").toLocaleLowerCase("de").includes(q)});$("evidenceTable").innerHTML=items.length?`<table><thead><tr><th>Bezeichnung</th><th>Typ</th><th>Zugehörige Akte</th><th>Dateiname / Verweis</th><th>Erfasst am</th><th>Aktionen</th></tr></thead><tbody>${items.map(e=>{const c=state.cases.find(c=>c.id===e.caseId);return `<tr><td><span class="cell-main">${esc(e.title)}</span><span class="cell-sub">${esc(e.description||"")}</span></td><td>${esc(e.type)}</td><td>${c?esc(c.number):"—"}</td><td>${esc(e.fileName||"—")}</td><td>${displayDate(e.date)}</td><td><button class="small-btn" data-action="delete-evidence" data-id="${esc(e.id)}">Löschen</button></td></tr>`}).join("")}</tbody></table>`:empty("Keine Einträge gefunden","Füge ein Beweismittel oder Dokument hinzu.")}
function updateCaseOptions(selected=""){$("evidenceCase").innerHTML='<option value="">Keine Zuordnung</option>'+state.cases.map(c=>`<option value="${esc(c.id)}">${esc(c.number)} — ${esc(c.title)}</option>`).join("");$("evidenceCase").value=selected}
function renderAll(){renderDashboard();renderCases();renderPersons();renderEvidence();updateCaseOptions()}
function showView(n){["dashboard","cases","persons","evidence"].forEach(v=>$(`${v}View`).classList.toggle("hidden",v!==n));document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===n));$("pageTitle").textContent=({dashboard:"Dashboard",cases:"Ermittlungsakten",persons:"Personenverwaltung",evidence:"Beweismittel & Dokumente"})[n]}
function openCase(idValue=""){ $("caseForm").reset();$("caseId").value="";$("caseDate").value=todayISO();$("caseDialogTitle").textContent="Neue Ermittlungsakte";if(idValue){const c=state.cases.find(x=>x.id===idValue);if(!c)return;if(!requireOwner(c))return;$("caseId").value=c.id;$("caseTitle").value=c.title;$("caseType").value=c.type;$("caseStatus").value=c.status;$("caseOfficer").value=c.officer||"";$("caseDate").value=c.date||todayISO();$("caseFacts").value=c.facts||"";$("caseNotes").value=c.notes||"";$("caseDialogTitle").textContent=`Akte bearbeiten · ${c.number}`} $("caseDialog").showModal()}
function openPerson(idValue=""){$("personForm").reset();$("personId").value="";$("personDialogTitle").textContent="Person anlegen";if(idValue){const p=state.persons.find(x=>x.id===idValue);if(!p)return;$("personId").value=p.id;$("personName").value=p.name;$("personRole").value=p.role;$("personDob").value=p.dob||"";$("personContact").value=p.contact||"";$("personNotes").value=p.notes||"";$("personDialogTitle").textContent=`Person bearbeiten · ${p.number}`} $("personDialog").showModal()}
function viewCase(idValue){const c=state.cases.find(x=>x.id===idValue);if(!c)return;const es=state.evidence.filter(e=>e.caseId===c.id);$("detailContent").innerHTML=`<div class="modal-header"><div><p class="eyebrow">${esc(c.number)} · ${esc(c.type)}</p><h2 class="detail-title">${esc(c.title)}</h2></div><button class="icon-button" data-close="detailDialog">×</button></div><span class="pill ${sclass(c.status)}">${esc(c.status)}</span><div class="detail-grid"><div class="detail-block"><label>Sachbearbeiter</label><p>${esc(c.officer||"Nicht zugewiesen")}</p></div><div class="detail-block"><label>Ersteller</label><p>${esc(c.creatorName||"Unbekannt")}</p></div><div class="detail-block"><label>Erstellungsdatum</label><p>${displayDate(c.date)}</p></div><div class="detail-block detail-full"><label>Sachverhalt</label><p>${esc(c.facts||"Kein Sachverhalt hinterlegt.")}</p></div><div class="detail-block detail-full"><label>Interne Notizen</label><p>${esc(c.notes||"Keine Notizen.")}</p></div><div class="detail-block detail-full"><label>Beweismittel und Dokumente</label><p>${es.length?es.map(e=>`${esc(e.title)} · ${esc(e.type)}${e.fileName?" · "+esc(e.fileName):""}`).join("\\n"):"Keine Anlagen erfasst."}</p></div></div>${ownsCase(c)?`<button class="primary" data-action="edit-case" data-id="${esc(c.id)}">Akte bearbeiten</button>`:`<p class="muted">Du bist nicht als Ersteller eingetragen; diese Akte ist für dich schreibgeschützt.</p>`}`;$("detailDialog").showModal()}
async function delCase(idValue){const c=state.cases.find(x=>x.id===idValue);if(!c||!requireOwner(c)||!confirm(`Akte ${c.number} wirklich löschen?`))return;state.cases=state.cases.filter(x=>x.id!==idValue);state.evidence.forEach(e=>{if(e.caseId===idValue)e.caseId=""});await save();toast("Akte gelöscht.")}
async function delPerson(idValue){const p=state.persons.find(x=>x.id===idValue);if(!p||!confirm(`Person „${p.name}“ wirklich löschen?`))return;state.persons=state.persons.filter(x=>x.id!==idValue);await save();toast("Person gelöscht.")}
async function delEvidence(idValue){const e=state.evidence.find(x=>x.id===idValue);if(!e||!confirm(`Eintrag „${e.title}“ wirklich löschen?`))return;state.evidence=state.evidence.filter(x=>x.id!==idValue);await save();toast("Eintrag gelöscht.")}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if($("passwordInput").value===(localStorage.getItem(PASSWORD_KEY)||DEFAULT_PASSWORD)){
  const name=$("creatorInput").value.trim(); if(!name){$("loginError").textContent="Bitte gib deinen RP-Namen ein.";return;}
  sessionStorage.setItem("bp_logged","yes");sessionStorage.setItem("bp_creator_name",name);$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");$("loginError").textContent="";await load();
}else{$("loginError").textContent="Das Passwort ist nicht korrekt.";$("passwordInput").select()}});
$("logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem("bp_logged");sessionStorage.removeItem("bp_creator_name");$("app").classList.add("hidden");$("loginScreen").classList.remove("hidden");$("passwordInput").value=""});
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.goto)));
$("newCaseBtn").addEventListener("click",()=>openCase());$("newCaseTop").addEventListener("click",()=>openCase());$("newPersonBtn").addEventListener("click",()=>openPerson());$("newEvidenceBtn").addEventListener("click",()=>{$("evidenceForm").reset();updateCaseOptions();$("evidenceDialog").showModal()});
$("caseSearch").addEventListener("input",renderCases);$("statusFilter").addEventListener("change",renderCases);$("personSearch").addEventListener("input",renderPersons);$("evidenceSearch").addEventListener("input",renderEvidence);
$("caseForm").addEventListener("submit",async e=>{e.preventDefault();const oldId=$("caseId").value,old=state.cases.find(c=>c.id===oldId);if(old&&!requireOwner(old))return;const r={id:oldId||id("case"),creatorName:old?.creatorName||currentCreator(),number:old?.number||caseNo(),title:$("caseTitle").value.trim(),type:$("caseType").value,status:$("caseStatus").value,officer:$("caseOfficer").value.trim(),date:$("caseDate").value||todayISO(),facts:$("caseFacts").value.trim(),notes:$("caseNotes").value.trim(),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};if(old)state.cases=state.cases.map(c=>c.id===oldId?r:c);else state.cases.unshift(r);if(await save()){$("caseDialog").close();toast(old?"Akte aktualisiert.":`Akte ${r.number} erstellt.`)}});
$("personForm").addEventListener("submit",async e=>{e.preventDefault();const oldId=$("personId").value,old=state.persons.find(p=>p.id===oldId),n=Math.max(0,...state.persons.map(p=>Number((p.number||"").split("-").at(-1))||0))+1,r={id:oldId||id("person"),number:old?.number||`BP-P-${String(n).padStart(5,"0")}`,name:$("personName").value.trim(),role:$("personRole").value,dob:$("personDob").value,contact:$("personContact").value.trim(),notes:$("personNotes").value.trim()};if(old)state.persons=state.persons.map(p=>p.id===oldId?r:p);else state.persons.unshift(r);if(await save()){$("personDialog").close();toast(old?"Person aktualisiert.":"Person angelegt.")}});
$("evidenceForm").addEventListener("submit",async e=>{e.preventDefault();state.evidence.unshift({id:id("evidence"),title:$("evidenceTitle").value.trim(),type:$("evidenceType").value,caseId:$("evidenceCase").value,description:$("evidenceDescription").value.trim(),fileName:$("evidenceFileName").value.trim(),date:todayISO()});if(await save()){$("evidenceDialog").close();toast("Eintrag gespeichert.")}});
document.addEventListener("click",e=>{const close=e.target.closest("[data-close]");if(close){$(close.dataset.close).close();return}const b=e.target.closest("[data-action]");if(!b)return;const {action:a,id:i}=b.dataset;if(a==="view-case")viewCase(i);if(a==="edit-case"){if($("detailDialog").open)$("detailDialog").close();openCase(i)}if(a==="delete-case")delCase(i);if(a==="edit-person")openPerson(i);if(a==="delete-person")delPerson(i);if(a==="delete-evidence")delEvidence(i)});
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));
$("todayLabel").textContent=new Date().toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
if(sessionStorage.getItem("bp_logged")==="yes" && currentCreator()){$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");load()}


// Darkmode: Auswahl bleibt in diesem Browser gespeichert.
const THEME_KEY = "bp_akten_theme";
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = $("themeToggle");
  if (btn) {
    btn.textContent = theme === "dark" ? "☀ Hellmodus" : "☾ Darkmode";
    btn.setAttribute("aria-label", theme === "dark" ? "Hellmodus aktivieren" : "Darkmode aktivieren");
  }
}
applyTheme(localStorage.getItem(THEME_KEY) || "light");
if ($("themeToggle")) {
  $("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}
