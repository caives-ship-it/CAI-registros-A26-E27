/* ==========================================================================
   CAI · UVP — app.js
   Toda la lógica de la plataforma. Sin frameworks: JS plano para que se
   pueda hospedar tal cual en GitHub Pages (o cualquier hosting estático),
   igual que el ejemplo de referencia.
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 1. ESTADO Y PERSISTENCIA
 * ---------------------------------------------------------------------- */

const LS_KEY = "cai_uvp_state_v1";
const LS_FB_CONFIG = "cai_uvp_fb_config";
const LS_STAFF_OK = "cai_uvp_staff_ok"; // sessionStorage

let STATE = null;
let fbApp = null, fbDb = null, fbUnsub = null, fbConnected = false;
let saveTimer = null;

function uid(prefix){
  return (prefix||"id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function defaultState(){
  return {
    staffPasswordHash: hashStr(DEFAULT_STAFF_PASSWORD),
    nomenclatura: SEED_NOMENCLATURA.map(n => ({ id: uid("nom"), ...n })),
    actividades: SEED_ACTIVIDADES.map(a => ({ id: uid("act"), ...a })),
    sesiones: [],
    registros: [],
    sanciones: [], // { matricula, actividadId, hasta (ISO date) }
    updatedAt: Date.now(),
  };
}

function hashStr(s){
  // hash simple, suficiente para una contraseña de acceso local, no para seguridad crítica
  let h = 0;
  for (let i=0;i<s.length;i++){ h = (h<<5)-h + s.charCodeAt(i); h |= 0; }
  return "h" + h;
}

function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  }catch(e){ console.warn("No se pudo leer localStorage", e); }
  return null;
}

function saveLocal(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(STATE)); }
  catch(e){ console.warn("No se pudo guardar en localStorage", e); }
}

function persist(){
  STATE.updatedAt = Date.now();
  saveLocal();
  if (fbConnected && fbDb){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      fbDb.collection("cai").doc("estado").set(STATE).catch(err => {
        toast("No se pudo sincronizar con Firebase: " + err.message, "error");
      });
    }, 350);
  }
  renderAll();
}

function initState(){
  STATE = loadLocal() || defaultState();
  const fbCfg = loadFbConfig();
  if (fbCfg && fbCfg.apiKey) connectFirebase(fbCfg, true);
}

/* ---------------------------------------------------------------------- *
 * 2. FIREBASE (sincronización opcional en tiempo real)
 * ---------------------------------------------------------------------- */

function loadFbConfig(){
  try{ return JSON.parse(localStorage.getItem(LS_FB_CONFIG) || "null"); }
  catch(e){ return null; }
}
function saveFbConfig(cfg){ localStorage.setItem(LS_FB_CONFIG, JSON.stringify(cfg)); }
function clearFbConfig(){ localStorage.removeItem(LS_FB_CONFIG); }

function connectFirebase(cfg, silent){
  try{
    if (fbApp){ try{ fbApp.delete(); }catch(e){} }
    fbApp = firebase.initializeApp(cfg, "cai-" + Date.now());
    fbDb = fbApp.firestore();
    if (fbUnsub) fbUnsub();
    fbUnsub = fbDb.collection("cai").doc("estado").onSnapshot(
      (doc) => {
        fbConnected = true;
        setSyncBadge(true);
        if (doc.exists){
          const remote = doc.data();
          if (!STATE || (remote.updatedAt || 0) >= (STATE.updatedAt || 0)){
            STATE = remote;
            saveLocal();
            renderAll();
          }
        } else {
          fbDb.collection("cai").doc("estado").set(STATE);
        }
      },
      (err) => {
        fbConnected = false;
        setSyncBadge(false);
        if (!silent) toast("Error de conexión a Firebase: " + err.message, "error");
      }
    );
    saveFbConfig(cfg);
    fillFbForm(cfg);
    document.getElementById("fbStatus").textContent = "Conectando…";
    if (!silent) toast("Configuración de Firebase guardada", "ok");
  }catch(e){
    toast("No se pudo conectar a Firebase: " + e.message, "error");
  }
}

function disconnectFirebase(){
  if (fbUnsub) fbUnsub();
  fbUnsub = null; fbDb = null; fbConnected = false;
  clearFbConfig();
  setSyncBadge(false);
  document.getElementById("fbStatus").textContent = "Desconectado. Trabajando solo en este navegador.";
  toast("Firebase desconectado", "ok");
}

function setSyncBadge(on){
  const b = document.getElementById("syncBadge");
  if (on){ b.textContent = "● Sincronizado"; b.className = "badge badge-on"; }
  else{ b.textContent = "● Local"; b.className = "badge badge-off"; }
  const st = document.getElementById("fbStatus");
  if (st) st.textContent = on
    ? "Conectado — los cambios se sincronizan en tiempo real con todos los dispositivos."
    : "No conectado. Cada dispositivo guarda su propia información.";
  const activeTab = document.querySelector(".tab-panel.active");
  if (activeTab){
    const tabId = activeTab.id.replace("tab-","");
    document.getElementById("syncWarning").classList.toggle("hidden", on || tabId === "registro");
  }
}

/* ---------------------------------------------------------------------- *
 * 3. UTILIDADES DE DOMINIO
 * ---------------------------------------------------------------------- */

function todayISO(){ return new Date().toISOString().slice(0,10); }

function detectCarrera(matricula){
  const prefix = (matricula || "").trim().toUpperCase().slice(0,2);
  if (prefix.length < 2) return null;
  return STATE.nomenclatura.find(n => n.prefix.toUpperCase() === prefix) || null;
}

function getActividad(id){ return STATE.actividades.find(a => a.id === id); }
function getSesion(id){ return STATE.sesiones.find(s => s.id === id); }

function sesionRegistrados(sesionId){
  return STATE.registros.filter(r => r.sesionId === sesionId);
}
function sesionCupoDisponible(sesion){
  return sesion.cupo - sesionRegistrados(sesion.id).length;
}

function activeSanction(matricula, actividadId){
  const today = todayISO();
  return STATE.sanciones.find(s =>
    s.matricula.toUpperCase() === matricula.toUpperCase() &&
    s.actividadId === actividadId &&
    s.hasta >= today
  );
}

function daysBetween(isoA, isoB){
  const a = new Date(isoA + "T00:00:00");
  const b = new Date(isoB + "T00:00:00");
  return Math.ceil((b-a) / 86400000);
}

function addDaysISO(iso, days){
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function fmtFecha(iso){
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });
}

/* ---------------------------------------------------------------------- *
 * 4. NAVEGACIÓN / GATE DE STAFF
 * ---------------------------------------------------------------------- */

const GUARDED_TABS = ["asistencia","actividades","estadisticas","exportar","config"];

function isStaff(){ return sessionStorage.getItem(LS_STAFF_OK) === "1"; }

function goTab(tabId){
  if (GUARDED_TABS.includes(tabId) && !isStaff()) tabId = "registro";
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + tabId));
  window.location.hash = tabId;
  document.getElementById("syncWarning").classList.toggle("hidden", fbConnected || tabId === "registro");
  if (GUARDED_TABS.includes(tabId)) renderTab(tabId);
}

function setupNav(){
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      if (btn.dataset.guarded !== undefined && !isStaff()){
        openStaffGate(tabId);
        return;
      }
      goTab(tabId);
    });
  });
  document.getElementById("adminToggle").addEventListener("click", () => {
    if (isStaff()){
      sessionStorage.removeItem(LS_STAFF_OK);
      toast("Sesión de staff cerrada", "ok");
      goTab("registro");
      updateStaffVisibility();
    } else {
      openStaffGate("actividades");
    }
  });
  updateStaffVisibility();
}

function updateStaffVisibility(){
  const staff = isStaff();
  document.getElementById("adminToggle").textContent = staff ? "Salir de modo staff" : "Acceso staff";
  document.querySelectorAll(".tab-btn[data-guarded]").forEach(b => b.classList.toggle("hidden", !staff));
}

function openStaffGate(targetTab){
  openModal(`
    <h2>Acceso de staff</h2>
    <p class="muted-sm">Introduce la contraseña para administrar actividades, sesiones, asistencia y estadísticas.</p>
    <label>Contraseña
      <input type="password" id="gatePass" autocomplete="off">
    </label>
    <div id="gateErr" class="form-msg error hidden"></div>
    <div class="btn-row">
      <button class="btn-secondary" id="gateCancel">Cancelar</button>
      <button class="btn-primary" id="gateEnter">Entrar</button>
    </div>
  `);
  document.getElementById("gateCancel").addEventListener("click", closeModal);
  const tryEnter = () => {
    const pass = document.getElementById("gatePass").value;
    if (hashStr(pass) === STATE.staffPasswordHash){
      sessionStorage.setItem(LS_STAFF_OK, "1");
      closeModal();
      updateStaffVisibility();
      goTab(targetTab);
    } else {
      const err = document.getElementById("gateErr");
      err.textContent = "Contraseña incorrecta.";
      err.classList.remove("hidden");
    }
  };
  document.getElementById("gateEnter").addEventListener("click", tryEnter);
  document.getElementById("gatePass").addEventListener("keydown", e => { if (e.key === "Enter") tryEnter(); });
  document.getElementById("gatePass").focus();
}

/* ---------------------------------------------------------------------- *
 * 5. MODAL / TOAST
 * ---------------------------------------------------------------------- */

function openModal(html){
  document.getElementById("modalBox").innerHTML = html;
  document.getElementById("modalOverlay").classList.remove("hidden");
}
function closeModal(){ document.getElementById("modalOverlay").classList.add("hidden"); }

function toast(msg, kind){
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.textContent = msg;
  document.getElementById("toastStack").appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ---------------------------------------------------------------------- *
 * 6. TAB: REGISTRO (público)
 * ---------------------------------------------------------------------- */

function upcomingOpenSesiones(){
  const today = todayISO();
  return STATE.sesiones
    .filter(s => s.estado === "abierta" && s.fecha >= today && sesionCupoDisponible(s) > 0)
    .sort((a,b) => (a.fecha+a.hora).localeCompare(b.fecha+b.hora));
}

function renderRegistroForm(){
  const sel = document.getElementById("f_sesion");
  const opts = upcomingOpenSesiones().map(s => {
    const act = getActividad(s.actividadId);
    if (!act) return "";
    const disp = sesionCupoDisponible(s);
    return `<option value="${s.id}">${esc(act.nombre)} — ${fmtFecha(s.fecha)} ${s.hora || ""} (${disp} lugar${disp===1?"":"es"})</option>`;
  }).join("");
  sel.innerHTML = `<option value="">— selecciona una sesión con cupo disponible —</option>` + opts;

  // carrera manual fallback select
  const manualSel = document.getElementById("f_carrera_manual");
  manualSel.innerHTML = STATE.nomenclatura
    .slice()
    .sort((a,b) => a.carrera.localeCompare(b.carrera))
    .map(n => `<option value="${n.id}">${esc(n.carrera)}</option>`).join("");
}

function renderCatalogList(){
  const wrap = document.getElementById("catalogList");
  const activas = STATE.actividades.filter(a => a.activa !== false);
  if (!activas.length){
    wrap.innerHTML = `<p class="muted-sm">Aún no hay actividades publicadas.</p>`;
    return;
  }
  wrap.innerHTML = activas.map(a => {
    const sesiones = STATE.sesiones.filter(s => s.actividadId === a.id && s.estado === "abierta" && s.fecha >= todayISO());
    const proxima = sesiones.sort((x,y)=>(x.fecha+x.hora).localeCompare(y.fecha+y.hora))[0];
    return `
    <div class="catalog-item">
      <div class="tag-row">
        <span class="tag tag-tipo">${esc(a.tipo)}</span>
        <span class="tag tag-nivel">${esc(a.nivel)}</span>
        <span class="tag tag-carrera">${esc(a.licenciatura)}</span>
      </div>
      <h3>${esc(a.nombre)}</h3>
      <p>${esc(a.objetivo)}</p>
      <p style="margin-top:6px;">📍 ${esc(a.espacio)} · ⏱ ${esc(a.duracion)}${proxima ? ` · Próxima: ${fmtFecha(proxima.fecha)} ${proxima.hora||""}` : " · Sin sesión programada"}</p>
    </div>`;
  }).join("");
}

function setupRegistroForm(){
  const matriculaInput = document.getElementById("f_matricula");
  const detectBox = document.getElementById("carreraDetect");
  const detectVal = document.getElementById("carreraDetectValue");
  const manualWrap = document.getElementById("carreraManualWrap");
  const sesionSel = document.getElementById("f_sesion");
  const preview = document.getElementById("sesionPreview");

  matriculaInput.addEventListener("input", () => {
    matriculaInput.value = matriculaInput.value.toUpperCase();
    const found = detectCarrera(matriculaInput.value);
    if (matriculaInput.value.trim().length < 2){
      detectBox.className = "carrera-detect";
      detectVal.textContent = "— escribe tu matrícula —";
      manualWrap.classList.add("hidden");
    } else if (found){
      detectBox.className = "carrera-detect found";
      detectVal.textContent = found.carrera;
      manualWrap.classList.add("hidden");
    } else {
      detectBox.className = "carrera-detect missing";
      detectVal.textContent = "No se detectó automáticamente";
      manualWrap.classList.remove("hidden");
    }
  });

  sesionSel.addEventListener("change", () => {
    const s = getSesion(sesionSel.value);
    if (!s){ preview.classList.add("hidden"); return; }
    const act = getActividad(s.actividadId);
    const disp = sesionCupoDisponible(s);
    preview.innerHTML = `<strong>${esc(act.nombre)}</strong> · ${fmtFecha(s.fecha)} ${s.hora||""} · ${esc(act.espacio)} · Nivel ${esc(act.nivel)} · ${disp} lugares disponibles`;
    preview.classList.remove("hidden");
  });

  document.getElementById("registroForm").addEventListener("submit", (e) => {
    e.preventDefault();
    submitRegistro();
  });
}

function submitRegistro(){
  const msg = document.getElementById("formMsg");
  msg.classList.add("hidden");

  const matricula = document.getElementById("f_matricula").value.trim().toUpperCase();
  const nombre = document.getElementById("f_nombre").value.trim();
  const docente = document.getElementById("f_docente").value.trim();
  const grupo = document.getElementById("f_grupo").value.trim();
  const sesionId = document.getElementById("f_sesion").value;

  if (!matricula || !nombre || !docente || !grupo || !sesionId){
    return showFormMsg("Completa todos los campos antes de continuar.", "error");
  }

  let carreraNombre;
  const detected = detectCarrera(matricula);
  if (detected){
    carreraNombre = detected.carrera;
  } else {
    const manualSel = document.getElementById("f_carrera_manual");
    const chosen = STATE.nomenclatura.find(n => n.id === manualSel.value);
    if (!chosen) return showFormMsg("Selecciona tu carrera manualmente; no se detectó con tu matrícula.", "error");
    carreraNombre = chosen.carrera;
  }

  const sesion = getSesion(sesionId);
  if (!sesion || sesion.estado !== "abierta") return showFormMsg("Esa sesión ya no está disponible, elige otra.", "error");
  if (sesionCupoDisponible(sesion) <= 0) return showFormMsg("Esa sesión ya no tiene cupo disponible.", "error");

  const yaRegistrado = STATE.registros.find(r => r.sesionId === sesionId && r.matricula === matricula);
  if (yaRegistrado) return showFormMsg("Ya estás registrado en esta sesión.", "warn");

  const sancion = activeSanction(matricula, sesion.actividadId);
  if (sancion){
    const dias = daysBetween(todayISO(), sancion.hasta);
    return showFormMsg(`No puedes registrarte a esta actividad todavía: faltaste a una sesión anterior. Podrás volver a registrarte en ${dias} día${dias===1?"":"s"} (a partir del ${fmtFecha(sancion.hasta)}).`, "error");
  }

  STATE.registros.push({
    id: uid("reg"),
    sesionId,
    matricula,
    nombre,
    docente,
    grupo,
    carrera: carreraNombre,
    timestamp: Date.now(),
    asistencia: "pendiente",
    horaAsistencia: null,
  });
  persist();

  showFormMsg("¡Listo! Tu registro quedó confirmado. Presenta tu credencial (QR) el día de la actividad para registrar tu asistencia.", "ok");
  document.getElementById("registroForm").reset();
  document.getElementById("carreraDetect").className = "carrera-detect";
  document.getElementById("carreraDetectValue").textContent = "— escribe tu matrícula —";
  document.getElementById("carreraManualWrap").classList.add("hidden");
  document.getElementById("sesionPreview").classList.add("hidden");
}

function showFormMsg(text, kind){
  const msg = document.getElementById("formMsg");
  msg.textContent = text;
  msg.className = "form-msg " + kind;
  msg.classList.remove("hidden");
}

/* ---------------------------------------------------------------------- *
 * 7. TAB: ASISTENCIA (escaneo QR)
 * ---------------------------------------------------------------------- */

let currentScanSesion = null;

function renderAsistenciaTab(){
  const sel = document.getElementById("scan_sesion");
  const today = todayISO();
  const sesiones = STATE.sesiones.slice().sort((a,b) => (b.fecha+b.hora).localeCompare(a.fecha+a.hora));
  sel.innerHTML = sesiones.map(s => {
    const act = getActividad(s.actividadId);
    const label = `${act ? act.nombre : "(actividad eliminada)"} — ${fmtFecha(s.fecha)} ${s.hora||""} ${s.fecha===today ? "· HOY" : ""} [${s.estado}]`;
    return `<option value="${s.id}">${esc(label)}</option>`;
  }).join("") || `<option value="">No hay sesiones programadas todavía</option>`;

  if (!currentScanSesion || !getSesion(currentScanSesion)){
    const hoy = sesiones.find(s => s.fecha === today && s.estado === "abierta");
    currentScanSesion = hoy ? hoy.id : (sesiones[0] ? sesiones[0].id : null);
  }
  sel.value = currentScanSesion || "";
  sel.onchange = () => { currentScanSesion = sel.value; renderScanTable(); };

  renderScanTable();

  const input = document.getElementById("scan_input");
  input.value = "";
  input.focus();
  input.onkeydown = (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      processScan(input.value.trim());
      input.value = "";
    }
  };

  document.getElementById("closeSessionBtn").onclick = () => closeSesionConfirm(currentScanSesion);
}

function processScan(rawValue){
  const feedback = document.getElementById("scanFeedback");
  if (!currentScanSesion){
    feedback.innerHTML = scanResultHtml("error", "Selecciona primero una sesión.");
    return;
  }
  if (!rawValue){ return; }
  const matricula = rawValue.trim().toUpperCase();
  const sesion = getSesion(currentScanSesion);
  const act = getActividad(sesion.actividadId);
  const reg = STATE.registros.find(r => r.sesionId === currentScanSesion && r.matricula === matricula);

  if (!reg){
    feedback.innerHTML = scanResultHtml("error", `${matricula} no está registrado en "${act ? act.nombre : "esta sesión"}".`);
    beep(false);
    return;
  }
  if (reg.asistencia === "asistio"){
    feedback.innerHTML = scanResultHtml("error", `${matricula} · ${reg.nombre} — la asistencia ya había sido registrada.`);
    beep(false);
    return;
  }
  reg.asistencia = "asistio";
  reg.horaAsistencia = Date.now();
  persist();
  feedback.innerHTML = scanResultHtml("ok", `${matricula} · ${reg.nombre} — asistencia registrada ✔`);
  beep(true);
}

function scanResultHtml(kind, text){
  return `<div class="scan-result ${kind}"><span class="stamp">${kind==="ok"?"✓":"✕"}</span><span>${esc(text)}</span></div>`;
}

function beep(ok){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = ok ? 880 : 220;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    o.start(); o.stop(ctx.currentTime + 0.12);
  }catch(e){ /* audio no disponible, ignorar */ }
}

function renderScanTable(){
  const tbody = document.querySelector("#scanTable tbody");
  const titleEl = document.getElementById("scanListTitle");
  if (!currentScanSesion){ tbody.innerHTML = ""; titleEl.textContent = "Registrados en esta sesión"; return; }
  const sesion = getSesion(currentScanSesion);
  const act = getActividad(sesion.actividadId);
  const regs = sesionRegistrados(currentScanSesion).sort((a,b) => a.nombre.localeCompare(b.nombre));
  titleEl.textContent = `Registrados — ${act ? act.nombre : ""} (${regs.length})`;
  tbody.innerHTML = regs.map(r => `
    <tr>
      <td><code>${esc(r.matricula)}</code></td>
      <td>${esc(r.nombre)}</td>
      <td>${esc(r.carrera)}</td>
      <td><span class="status-pill status-${r.asistencia}">${estadoLabel(r.asistencia)}</span></td>
      <td>${r.horaAsistencia ? new Date(r.horaAsistencia).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : "—"}</td>
    </tr>
  `).join("") || `<tr><td colspan="5" class="muted-sm">Nadie se ha registrado todavía.</td></tr>`;
}

function estadoLabel(s){
  return { pendiente:"Pendiente", asistio:"Asistió", no_asistio:"No asistió" }[s] || s;
}

function closeSesionConfirm(sesionId){
  if (!sesionId) return toast("Selecciona una sesión primero.", "error");
  const sesion = getSesion(sesionId);
  const act = getActividad(sesion.actividadId);
  const pendientes = sesionRegistrados(sesionId).filter(r => r.asistencia === "pendiente");
  openModal(`
    <h2>Cerrar sesión</h2>
    <p class="muted-sm">Se marcará como <strong>"No asistió"</strong> a ${pendientes.length} estudiante${pendientes.length===1?"":"s"} pendiente${pendientes.length===1?"":"s"} de "${esc(act ? act.nombre : "")}" y no podrán volver a registrarse a esta actividad durante ${SANCTION_DAYS} días.</p>
    <div class="btn-row">
      <button class="btn-secondary" id="closeCancel">Cancelar</button>
      <button class="btn-danger" id="closeConfirm">Cerrar sesión</button>
    </div>
  `);
  document.getElementById("closeCancel").addEventListener("click", closeModal);
  document.getElementById("closeConfirm").addEventListener("click", () => {
    closeSesion(sesionId);
    closeModal();
  });
}

function closeSesion(sesionId){
  const sesion = getSesion(sesionId);
  if (!sesion) return;
  const pendientes = sesionRegistrados(sesionId).filter(r => r.asistencia === "pendiente");
  pendientes.forEach(r => {
    r.asistencia = "no_asistio";
    STATE.sanciones.push({
      id: uid("san"),
      matricula: r.matricula,
      actividadId: sesion.actividadId,
      hasta: addDaysISO(sesion.fecha, SANCTION_DAYS),
    });
  });
  sesion.estado = "cerrada";
  persist();
  toast(`Sesión cerrada. ${pendientes.length} inasistencia(s) aplicada(s).`, "ok");
}

/* ---------------------------------------------------------------------- *
 * 8. TAB: ACTIVIDADES (catálogo editable)
 * ---------------------------------------------------------------------- */

function renderActividadesTab(){
  const grid = document.getElementById("actividadesGrid");
  if (!STATE.actividades.length){
    grid.innerHTML = `<p class="muted-sm">No hay actividades. Crea la primera con "+ Nueva actividad".</p>`;
    return;
  }
  grid.innerHTML = STATE.actividades.map(a => {
    const sesiones = STATE.sesiones.filter(s => s.actividadId === a.id)
      .sort((x,y) => (y.fecha+y.hora).localeCompare(x.fecha+x.hora));
    const sesionesHtml = sesiones.length ? `
      <div class="table-wrap">
        <table class="mini-table">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Cupo</th><th>Reg.</th><th>Asist.</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${sesiones.map(s => {
              const regs = sesionRegistrados(s.id);
              const asistieron = regs.filter(r => r.asistencia === "asistio").length;
              return `<tr>
                <td>${fmtFecha(s.fecha)}</td>
                <td>${esc(s.hora || "—")}</td>
                <td>${regs.length}/${s.cupo}</td>
                <td>${regs.length}</td>
                <td>${asistieron}</td>
                <td><span class="status-pill status-${s.estado}">${s.estado === "abierta" ? "Abierta" : "Cerrada"}</span></td>
                <td>
                  ${s.estado === "abierta" ? `<button class="icon-btn" onclick="closeSesionConfirm('${s.id}')">Cerrar</button>` : ""}
                  <button class="icon-btn" onclick="deleteSesion('${s.id}')">Eliminar</button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<p class="muted-sm" style="margin:8px 0 0;">Sin sesiones programadas todavía.</p>`;

    return `
    <div class="actividad-card ${a.activa===false?"inactiva":""}">
      <div class="tag-row">
        <span class="tag tag-tipo">${esc(a.tipo)}</span>
        <span class="tag tag-nivel">${esc(a.nivel)}</span>
        ${a.activa===false ? '<span class="tag" style="background:#EDEDF2;color:#565A73;">Inactiva</span>' : ""}
      </div>
      <h3>${esc(a.nombre)}</h3>
      <p class="meta">🎓 Dirigido a: ${esc(a.licenciatura)}</p>
      <p class="meta">📍 ${esc(a.espacio)} · ⏱ ${esc(a.duracion)} · Cupo por sesión ${esc(String(a.cupo))}</p>
      <p class="obj">${esc(a.objetivo)}</p>
      <div class="card-actions">
        <button class="btn-secondary" onclick="editActividad('${a.id}')">Editar</button>
        <button class="btn-secondary" onclick="toggleActividad('${a.id}')">${a.activa===false?"Activar":"Desactivar"}</button>
        <button class="btn-danger" onclick="deleteActividad('${a.id}')">Eliminar</button>
      </div>
      <div class="sesiones-block">
        <div class="table-toolbar" style="margin-bottom:8px;">
          <span class="meta" style="font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:.04em;">Sesiones programadas</span>
          <button class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="newSesionForActividad('${a.id}')">+ Programar sesión</button>
        </div>
        ${sesionesHtml}
      </div>
    </div>
  `;
  }).join("");
}

function actividadFormHtml(a){
  a = a || { tipo:"Taller", nombre:"", licenciatura:"", nivel:"", duracion:"", espacio:"", objetivo:"", cupo:10, activa:true };
  return `
    <h2>${a.id ? "Editar actividad" : "Nueva actividad"}</h2>
    <label>Título<input type="text" id="af_nombre" value="${escAttr(a.nombre)}" required></label>
    <div class="grid-2">
      <label>Tipo
        <select id="af_tipo">
          ${TIPOS_ACTIVIDAD.map(t => `<option value="${escAttr(t)}" ${a.tipo===t?"selected":""}>${esc(t)}</option>`).join("")}
        </select>
      </label>
      <label>Nivel de inglés<input type="text" id="af_nivel" value="${escAttr(a.nivel)}" placeholder="A2, B1..."></label>
    </div>
    <label>Dirigido a (licenciatura)<input type="text" id="af_licenciatura" value="${escAttr(a.licenciatura)}" placeholder="Ej. Indistinta, Derecho..."></label>
    <div class="grid-2">
      <label>Duración<input type="text" id="af_duracion" value="${escAttr(a.duracion)}" placeholder="Ej. 1 hora"></label>
      <label>Cupo por sesión<input type="number" id="af_cupo" value="${a.cupo}" min="1"></label>
    </div>
    <label>Ubicación / espacio<input type="text" id="af_espacio" value="${escAttr(a.espacio)}"></label>
    <label>Objetivo<textarea id="af_objetivo">${esc(a.objetivo)}</textarea></label>
    <div class="btn-row">
      <button class="btn-secondary" id="afCancel">Cancelar</button>
      <button class="btn-primary" id="afSave">Guardar</button>
    </div>
  `;
}

function newActividad(){
  openModal(actividadFormHtml());
  bindActividadForm(null);
}
function editActividad(id){
  const a = getActividad(id);
  openModal(actividadFormHtml(a));
  bindActividadForm(a);
}
function bindActividadForm(existing){
  document.getElementById("afCancel").addEventListener("click", closeModal);
  document.getElementById("afSave").addEventListener("click", () => {
    const nombre = document.getElementById("af_nombre").value.trim();
    if (!nombre) return toast("El título es obligatorio.", "error");
    const data = {
      tipo: document.getElementById("af_tipo").value,
      nombre,
      licenciatura: document.getElementById("af_licenciatura").value.trim() || "Indistinta",
      nivel: document.getElementById("af_nivel").value.trim(),
      duracion: document.getElementById("af_duracion").value.trim(),
      cupo: Math.max(1, parseInt(document.getElementById("af_cupo").value || "10", 10)),
      espacio: document.getElementById("af_espacio").value.trim(),
      objetivo: document.getElementById("af_objetivo").value.trim(),
    };
    if (existing){
      Object.assign(existing, data);
    } else {
      STATE.actividades.push({ id: uid("act"), activa:true, ...data });
    }
    persist();
    closeModal();
    toast("Actividad guardada", "ok");
  });
}

function toggleActividad(id){
  const a = getActividad(id);
  a.activa = a.activa === false ? true : false;
  persist();
}

function deleteActividad(id){
  const enUso = STATE.sesiones.some(s => s.actividadId === id);
  openModal(`
    <h2>Eliminar actividad</h2>
    <p class="muted-sm">${enUso ? "Esta actividad tiene sesiones programadas. Al eliminarla también se eliminarán esas sesiones y sus registros." : "Esta acción no se puede deshacer."}</p>
    <div class="btn-row">
      <button class="btn-secondary" id="delCancel">Cancelar</button>
      <button class="btn-danger" id="delConfirm">Eliminar</button>
    </div>
  `);
  document.getElementById("delCancel").addEventListener("click", closeModal);
  document.getElementById("delConfirm").addEventListener("click", () => {
    const sesionIds = STATE.sesiones.filter(s => s.actividadId === id).map(s => s.id);
    STATE.registros = STATE.registros.filter(r => !sesionIds.includes(r.sesionId));
    STATE.sesiones = STATE.sesiones.filter(s => s.actividadId !== id);
    STATE.sanciones = STATE.sanciones.filter(s => s.actividadId !== id);
    STATE.actividades = STATE.actividades.filter(a => a.id !== id);
    persist();
    closeModal();
    toast("Actividad eliminada", "ok");
  });
}

/* ---------------------------------------------------------------------- *
 * 9. SESIONES (ahora se gestionan dentro de cada tarjeta de Actividades)
 * ---------------------------------------------------------------------- */

function newSesionFormHtml(actividadId){
  const activas = STATE.actividades.filter(a => a.activa !== false);
  const opts = activas.map(a => `<option value="${a.id}" ${a.id===actividadId?"selected":""}>${esc(a.nombre)}</option>`).join("");
  return `
    <h2>Programar sesión</h2>
    <label>Actividad
      <select id="sf_actividad">${opts || '<option value="">No hay actividades activas</option>'}</select>
    </label>
    <div class="grid-2">
      <label>Fecha<input type="date" id="sf_fecha" value="${todayISO()}" required></label>
      <label>Hora<input type="time" id="sf_hora" value="12:00"></label>
    </div>
    <label>Cupo<input type="number" id="sf_cupo" value="10" min="1"></label>
    <div class="btn-row">
      <button class="btn-secondary" id="sfCancel">Cancelar</button>
      <button class="btn-primary" id="sfSave">Programar</button>
    </div>
  `;
}

function newSesionForActividad(actividadId){
  if (!STATE.actividades.some(a => a.activa !== false)){
    return toast("Crea primero una actividad activa.", "error");
  }
  openModal(newSesionFormHtml(actividadId));
  const actSel = document.getElementById("sf_actividad");
  const cupoInput = document.getElementById("sf_cupo");
  const syncCupo = () => {
    const act = getActividad(actSel.value);
    if (act) cupoInput.value = act.cupo;
  };
  actSel.addEventListener("change", syncCupo);
  syncCupo();

  document.getElementById("sfCancel").addEventListener("click", closeModal);
  document.getElementById("sfSave").addEventListener("click", () => {
    const actId = actSel.value;
    const fecha = document.getElementById("sf_fecha").value;
    const hora = document.getElementById("sf_hora").value;
    const cupo = Math.max(1, parseInt(cupoInput.value || "10", 10));
    if (!actId || !fecha) return toast("Selecciona actividad y fecha.", "error");
    STATE.sesiones.push({ id: uid("ses"), actividadId: actId, fecha, hora, cupo, estado: "abierta" });
    persist();
    closeModal();
    toast("Sesión programada", "ok");
  });
}

function deleteSesion(id){
  openModal(`
    <h2>Eliminar sesión</h2>
    <p class="muted-sm">Se eliminarán también los registros asociados a esta sesión. Esta acción no se puede deshacer.</p>
    <div class="btn-row">
      <button class="btn-secondary" id="dsCancel">Cancelar</button>
      <button class="btn-danger" id="dsConfirm">Eliminar</button>
    </div>
  `);
  document.getElementById("dsCancel").addEventListener("click", closeModal);
  document.getElementById("dsConfirm").addEventListener("click", () => {
    STATE.registros = STATE.registros.filter(r => r.sesionId !== id);
    STATE.sesiones = STATE.sesiones.filter(s => s.id !== id);
    persist();
    closeModal();
    toast("Sesión eliminada", "ok");
  });
}

/* ---------------------------------------------------------------------- *
 * 10. TAB: ESTADÍSTICAS
 * ---------------------------------------------------------------------- */

function renderEstadisticasTab(){
  const totalRegistros = STATE.registros.length;
  const totalAsistencias = STATE.registros.filter(r => r.asistencia === "asistio").length;
  const totalNoAsistio = STATE.registros.filter(r => r.asistencia === "no_asistio").length;
  const tasa = totalRegistros ? Math.round((totalAsistencias/totalRegistros)*100) : 0;
  const sancionesActivas = STATE.sanciones.filter(s => s.hasta >= todayISO());

  document.getElementById("statsKpis").innerHTML = `
    <div class="kpi"><div class="num">${totalRegistros}</div><div class="lbl">Registros totales</div></div>
    <div class="kpi"><div class="num">${totalAsistencias}</div><div class="lbl">Asistencias totales</div></div>
    <div class="kpi"><div class="num">${totalNoAsistio}</div><div class="lbl">Inasistencias</div></div>
    <div class="kpi"><div class="num">${tasa}%</div><div class="lbl">Tasa de asistencia</div></div>
    <div class="kpi"><div class="num">${sancionesActivas.length}</div><div class="lbl">Sanciones activas</div></div>
  `;

  // Por actividad
  const porActividad = STATE.actividades.map(a => {
    const sesionIds = STATE.sesiones.filter(s => s.actividadId === a.id).map(s => s.id);
    const regs = STATE.registros.filter(r => sesionIds.includes(r.sesionId));
    const asis = regs.filter(r => r.asistencia === "asistio").length;
    const noAsis = regs.filter(r => r.asistencia === "no_asistio").length;
    return { nombre: a.nombre, registrados: regs.length, asis, noAsis };
  }).filter(x => x.registrados > 0);

  const maxReg = Math.max(1, ...porActividad.map(x => x.registrados));
  document.getElementById("statsPorActividad").innerHTML = porActividad.length ? porActividad.map(x => `
    <div class="bar-row">
      <div class="lbl">${esc(x.nombre)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(x.asis/maxReg)*100}%"></div></div>
      <div class="val">${x.asis}/${x.registrados}</div>
    </div>
  `).join("") : `<p class="muted-sm">Aún no hay registros.</p>`;

  // Por carrera (global, asistencias)
  const porCarrera = {};
  STATE.registros.filter(r => r.asistencia === "asistio").forEach(r => {
    porCarrera[r.carrera] = (porCarrera[r.carrera]||0) + 1;
  });
  const carreraEntries = Object.entries(porCarrera).sort((a,b) => b[1]-a[1]);
  const maxCar = Math.max(1, ...carreraEntries.map(e => e[1]));
  document.getElementById("statsPorCarrera").innerHTML = carreraEntries.length ? carreraEntries.map(([carrera, count]) => `
    <div class="bar-row">
      <div class="lbl">${esc(carrera)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count/maxCar)*100}%; background:var(--amber);"></div></div>
      <div class="val">${count}</div>
    </div>
  `).join("") : `<p class="muted-sm">Aún no hay asistencias registradas.</p>`;

  // Sanciones activas
  document.getElementById("statsSanciones").innerHTML = sancionesActivas.length ? `
    <div class="table-wrap"><table><thead><tr><th>Matrícula</th><th>Actividad</th><th>Hasta</th></tr></thead><tbody>
      ${sancionesActivas.map(s => {
        const act = getActividad(s.actividadId);
        return `<tr><td><code>${esc(s.matricula)}</code></td><td>${esc(act?act.nombre:"—")}</td><td>${fmtFecha(s.hasta)}</td></tr>`;
      }).join("")}
    </tbody></table></div>
  ` : `<p class="muted-sm">No hay sanciones activas.</p>`;

  // Matriz carrera x actividad
  renderMatrixTable();
}

function renderMatrixTable(){
  const actividades = STATE.actividades;
  const carreras = [...new Set(STATE.registros.filter(r=>r.asistencia==="asistio").map(r => r.carrera))].sort();
  const thead = document.querySelector("#matrixTable thead");
  const tbody = document.querySelector("#matrixTable tbody");

  if (!carreras.length){
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td class="muted-sm">Aún no hay asistencias registradas.</td></tr>`;
    return;
  }

  thead.innerHTML = `<tr><th>Carrera</th>${actividades.map(a => `<th>${esc(a.nombre)}</th>`).join("")}<th>Total</th></tr>`;
  tbody.innerHTML = carreras.map(carrera => {
    let total = 0;
    const cells = actividades.map(a => {
      const sesionIds = STATE.sesiones.filter(s => s.actividadId === a.id).map(s => s.id);
      const count = STATE.registros.filter(r => sesionIds.includes(r.sesionId) && r.asistencia === "asistio" && r.carrera === carrera).length;
      total += count;
      return `<td>${count || "—"}</td>`;
    }).join("");
    return `<tr><td><strong>${esc(carrera)}</strong></td>${cells}<td><strong>${total}</strong></td></tr>`;
  }).join("");
}

/* ---------------------------------------------------------------------- *
 * 11. TAB: EXPORTAR
 * ---------------------------------------------------------------------- */

function buildExportRows(){
  return STATE.registros.map(r => {
    const sesion = getSesion(r.sesionId);
    const act = sesion ? getActividad(sesion.actividadId) : null;
    return {
      Matrícula: r.matricula,
      Nombre: r.nombre,
      Carrera: r.carrera,
      Docente: r.docente,
      Grupo: r.grupo,
      Actividad: act ? act.nombre : "(eliminada)",
      "Fecha sesión": sesion ? sesion.fecha : "",
      "Hora sesión": sesion ? sesion.hora : "",
      "Estado asistencia": estadoLabel(r.asistencia),
      "Hora asistencia": r.horaAsistencia ? new Date(r.horaAsistencia).toLocaleString("es-MX") : "",
    };
  });
}

function buildResumenActividad(){
  return STATE.actividades.map(a => {
    const sesionIds = STATE.sesiones.filter(s => s.actividadId === a.id).map(s => s.id);
    const regs = STATE.registros.filter(r => sesionIds.includes(r.sesionId));
    const asis = regs.filter(r => r.asistencia === "asistio").length;
    const noAsis = regs.filter(r => r.asistencia === "no_asistio").length;
    return {
      Actividad: a.nombre,
      Registrados: regs.length,
      Asistieron: asis,
      "No asistieron": noAsis,
      "% Asistencia": regs.length ? Math.round((asis/regs.length)*100) + "%" : "0%",
    };
  });
}

function buildResumenCarrera(){
  const porCarrera = {};
  STATE.registros.filter(r => r.asistencia === "asistio").forEach(r => {
    porCarrera[r.carrera] = (porCarrera[r.carrera]||0)+1;
  });
  return Object.entries(porCarrera).sort((a,b)=>b[1]-a[1]).map(([Carrera, Asistencias]) => ({ Carrera, Asistencias }));
}

function buildSanciones(){
  return STATE.sanciones.map(s => {
    const act = getActividad(s.actividadId);
    return { Matrícula: s.matricula, Actividad: act ? act.nombre : "—", "Sanción hasta": s.hasta, Activa: s.hasta >= todayISO() ? "Sí" : "No" };
  });
}

function exportExcel(){
  if (typeof XLSX === "undefined"){
    toast("No se pudo cargar la librería de Excel (sin conexión). Usa exportar CSV.", "error");
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildExportRows()), "Registros");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildResumenActividad()), "Resumen por actividad");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildResumenCarrera()), "Resumen por carrera");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildSanciones()), "Sanciones");
  XLSX.writeFile(wb, `CAI_registros_${todayISO()}.xlsx`);
}

function toCsv(rows){
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc2 = v => `"${String(v??"").replace(/"/g,'""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => esc2(r[h])).join(","))].join("\n");
}

function exportCsv(){
  const csv = toCsv(buildExportRows());
  downloadBlob(csv, `CAI_registros_${todayISO()}.csv`, "text/csv;charset=utf-8;");
}

function exportJson(){
  downloadBlob(JSON.stringify(STATE, null, 2), `CAI_respaldo_${todayISO()}.json`, "application/json");
}

function downloadBlob(content, filename, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importJson(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if (!data.actividades || !data.registros) throw new Error("Formato no reconocido");
      STATE = data;
      persist();
      toast("Respaldo importado correctamente", "ok");
    }catch(e){
      toast("No se pudo importar el archivo: " + e.message, "error");
    }
  };
  reader.readAsText(file);
}

/* ---------------------------------------------------------------------- *
 * 12. TAB: CONFIGURACIÓN
 * ---------------------------------------------------------------------- */

function renderConfigTab(){
  renderNomenclaturaTable();
  const cfg = loadFbConfig();
  fillFbForm(cfg || {});
  setSyncBadge(fbConnected);
}

function fillFbForm(cfg){
  ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"].forEach(k => {
    const el = document.getElementById("fb_" + k);
    if (el) el.value = cfg[k] || "";
  });
}

function renderNomenclaturaTable(){
  const tbody = document.querySelector("#nomenclaturaTable tbody");
  tbody.innerHTML = STATE.nomenclatura.slice().sort((a,b)=>a.prefix.localeCompare(b.prefix)).map(n => `
    <tr>
      <td><code>${esc(n.prefix)}</code></td>
      <td>${esc(n.carrera)}</td>
      <td class="muted-sm">${esc(n.division||"")}</td>
      <td>
        <button class="icon-btn" onclick="editPrefijo('${n.id}')">Editar</button>
        <button class="icon-btn" onclick="deletePrefijo('${n.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

function prefijoFormHtml(n){
  n = n || { prefix:"", carrera:"", division:"" };
  return `
    <h2>${n.id?"Editar":"Nuevo"} prefijo</h2>
    <div class="grid-2">
      <label>Prefijo (2 letras)<input type="text" id="pf_prefix" value="${escAttr(n.prefix)}" maxlength="4"></label>
      <label>División<input type="text" id="pf_division" value="${escAttr(n.division)}"></label>
    </div>
    <label>Carrera<input type="text" id="pf_carrera" value="${escAttr(n.carrera)}"></label>
    <div class="btn-row">
      <button class="btn-secondary" id="pfCancel">Cancelar</button>
      <button class="btn-primary" id="pfSave">Guardar</button>
    </div>
  `;
}

function newPrefijo(){
  openModal(prefijoFormHtml());
  bindPrefijoForm(null);
}
function editPrefijo(id){
  const n = STATE.nomenclatura.find(x => x.id === id);
  openModal(prefijoFormHtml(n));
  bindPrefijoForm(n);
}
function bindPrefijoForm(existing){
  document.getElementById("pfCancel").addEventListener("click", closeModal);
  document.getElementById("pfSave").addEventListener("click", () => {
    const prefix = document.getElementById("pf_prefix").value.trim().toUpperCase();
    const carrera = document.getElementById("pf_carrera").value.trim();
    const division = document.getElementById("pf_division").value.trim();
    if (!prefix || !carrera) return toast("Prefijo y carrera son obligatorios.", "error");
    if (existing){ Object.assign(existing, { prefix, carrera, division }); }
    else { STATE.nomenclatura.push({ id: uid("nom"), prefix, carrera, division }); }
    persist();
    closeModal();
    toast("Nomenclatura guardada", "ok");
  });
}
function deletePrefijo(id){
  STATE.nomenclatura = STATE.nomenclatura.filter(n => n.id !== id);
  persist();
  toast("Prefijo eliminado", "ok");
}

function setupConfigTab(){
  document.getElementById("newPrefijoBtn").addEventListener("click", newPrefijo);
  document.getElementById("savePassBtn").addEventListener("click", () => {
    const p1 = document.getElementById("cfg_newpass").value;
    const p2 = document.getElementById("cfg_newpass2").value;
    if (!p1) return toast("Escribe la nueva contraseña.", "error");
    if (p1 !== p2) return toast("Las contraseñas no coinciden.", "error");
    STATE.staffPasswordHash = hashStr(p1);
    persist();
    document.getElementById("cfg_newpass").value = "";
    document.getElementById("cfg_newpass2").value = "";
    toast("Contraseña actualizada", "ok");
  });
  document.getElementById("fbConnectBtn").addEventListener("click", () => {
    const cfg = {};
    ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"].forEach(k => {
      cfg[k] = document.getElementById("fb_" + k).value.trim();
    });
    if (!cfg.apiKey || !cfg.projectId) return toast("Al menos API Key y Project ID son necesarios.", "error");
    connectFirebase(cfg, false);
  });
  document.getElementById("fbDisconnectBtn").addEventListener("click", disconnectFirebase);
  document.getElementById("wipeBtn").addEventListener("click", () => {
    openModal(`
      <h2>Borrar todos los datos</h2>
      <p class="muted-sm">Esta acción eliminará actividades, sesiones, registros, asistencias y sanciones de forma permanente. Exporta un respaldo antes si lo necesitas.</p>
      <div class="btn-row">
        <button class="btn-secondary" id="wipeCancel">Cancelar</button>
        <button class="btn-danger" id="wipeConfirm">Borrar todo</button>
      </div>
    `);
    document.getElementById("wipeCancel").addEventListener("click", closeModal);
    document.getElementById("wipeConfirm").addEventListener("click", () => {
      STATE = defaultState();
      persist();
      closeModal();
      toast("Datos eliminados. Se restauró el catálogo inicial.", "ok");
    });
  });
}

/* ---------------------------------------------------------------------- *
 * 13. RENDER GENERAL
 * ---------------------------------------------------------------------- */

function renderTab(tabId){
  const warn = document.getElementById("syncWarning");
  warn.classList.toggle("hidden", fbConnected || tabId === "registro");
  if (tabId === "asistencia") renderAsistenciaTab();
  if (tabId === "actividades") renderActividadesTab();
  if (tabId === "estadisticas") renderEstadisticasTab();
  if (tabId === "config") renderConfigTab();
}

function renderAll(){
  renderCatalogList();
  renderRegistroForm();
  const activeTab = document.querySelector(".tab-panel.active");
  if (activeTab) renderTab(activeTab.id.replace("tab-",""));
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escAttr(s){ return esc(s); }

/* ---------------------------------------------------------------------- *
 * 14. ARRANQUE
 * ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initState();
  setupNav();
  setupRegistroForm();
  setupConfigTab();

  document.getElementById("newActividadBtn").addEventListener("click", newActividad);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("importJsonInput").addEventListener("change", (e) => {
    if (e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  document.getElementById("syncWarningLink").addEventListener("click", () => {
    if (isStaff()) goTab("config"); else openStaffGate("config");
  });

  const initialTab = (window.location.hash || "#registro").slice(1);
  goTab(initialTab || "registro");

  renderAll();
});
