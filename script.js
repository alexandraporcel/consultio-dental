const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const DB_KEY = 'cdp_data_v1';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
let _u = 0;
const uid = () => Date.now().toString(36) + (_u++) + Math.random().toString(36).slice(2,5);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
const addDays = (iso, n) => { const [y,m,d] = iso.split('-').map(Number); const dt = new Date(y, m-1, d+n); return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0'); };
const fmtDate = iso => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('es', {weekday:'long', day:'numeric', month:'long', year:'numeric'}); };
const fullName = p => [p.name, p.lastName].filter(Boolean).join(' ');
const fmtMoney = n => 'Bs. ' + (Number(n) || 0).toFixed(2);

function printHTML(title, bodyHtml){
  const w = window.open('', '_blank', 'width=480,height=680');
  if(!w){ alert('El navegador bloqueó la ventana de impresión.'); return; }
  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title>' +
    '<style>body{font-family:Arial,Helvetica,sans-serif;color:#12343b;padding:26px;max-width:420px;margin:0 auto}' +
    'h2{margin-bottom:2px}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 0}' +
    '.tot{border-top:1px solid #ccc;font-size:17px;padding-top:10px}ol{padding-left:20px}li{margin:8px 0}</style>' +
    '</head><body>' + bodyHtml + '</body></html>'
  );
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}
const accountBalance = p => (p.account || []).reduce((sum, m) => sum + (m.type === 'pago' ? -m.amount : m.amount), 0);

function defaultState(){ return {
  settings: { clinicName:'CONSULTORIO DENTAL PORCEL', logo:null, countryCode:'591',
    template:'Hola {nombre} 😊 Le recordamos su cita en Consultorio Dental Porcel el {fecha} a las {hora}. Motivo: {tratamiento}. Por favor confirme su asistencia. ¡Gracias!' },
  patients: [], appointments: [] }; }

let state = defaultState();
let viewDate = new Date(); viewDate.setDate(1);
let selectedDate = todayISO();
let editingAppt = null, editingPatient = null, tmpLogo = null, tmpAvatar = null, quotaWarned = false, apptMode = 'existing', accountPatientId = null;
let odontoPatientId = null, odontoToothNum = null, statsDate = new Date(); statsDate.setDate(1);
const ODONTO_STATUS = {
  sano: 'Sano', caries: 'Caries', obturado: 'Obturado / resina',
  corona: 'Corona / prótesis', endodoncia: 'Endodoncia', ausente: 'Ausente / extraído'
};

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCe9oWPHvfAnHvqUKqJgit_dzom3mCBBOg",
  authDomain: "consultoriodentalporcel.firebaseapp.com",
  databaseURL: "https://consultoriodentalporcel-default-rtdb.firebaseio.com",
  projectId: "consultoriodentalporcel",
  storageBucket: "consultoriodentalporcel.firebasestorage.app",
  messagingSenderId: "495434397964",
  appId: "1:495434397964:web:e281c1e6fdd1445f947129"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();

/* ---------- AUTENTICACIÓN Y LOGIN ---------- */
let dbListenerAttached = false;

function doLogin(){
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const errBox = $('#loginError');
  if(errBox) errBox.classList.add('hidden');
  if(!email || !password){
    if(errBox){
      errBox.textContent = 'Ingresa tu correo y contraseña.';
      errBox.classList.remove('hidden');
    }
    return;
  }
  auth.signInWithEmailAndPassword(email, password).catch(err => {
    let msg = 'No se pudo iniciar sesión. Intenta de nuevo.';
    if(err.code === 'auth/invalid-email') msg = 'El correo no es válido.';
    if(err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Correo o contraseña incorrectos.';
    if(err.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Espera un momento.';
    if(errBox){
      errBox.textContent = msg;
      errBox.classList.remove('hidden');
    }
  });
}

function doLogout(){
  auth.signOut().then(() => {
    const loginScreen = $('#loginScreen');
    const appContent = $('#appContent');
    const loginEmail = $('#loginEmail');
    const loginPassword = $('#loginPassword');
    
    if(loginScreen) loginScreen.classList.remove('hidden');
    if(appContent) appContent.classList.add('hidden');
    if(loginEmail) loginEmail.value = '';
    if(loginPassword) loginPassword.value = '';
    dbListenerAttached = false;
  }).catch((error) => {
    console.error('Error al cerrar sesión:', error);
    alert('No se pudo cerrar sesión. Inténtalo de nuevo.');
  });
}

auth.onAuthStateChanged(user => {
  const loginScreen = $('#loginScreen');
  const appContent = $('#appContent');
  
  if(user){
    if(loginScreen) loginScreen.classList.add('hidden');
    if(appContent) appContent.classList.remove('hidden');
    if(!dbListenerAttached){
      dbListenerAttached = true;
      escucharDatos();
    }
  } else {
    if(loginScreen) loginScreen.classList.remove('hidden');
    if(appContent) appContent.classList.add('hidden');
    dbListenerAttached = false;
  }
});

$('#loginPassword') && $('#loginPassword').addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); });
$('#loginEmail') && $('#loginEmail').addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); });

/* ---------- SINCRONIZACIÓN FIREBASE ---------- */
function escucharDatos(){
  db.ref('cdp_data_v1').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      state.settings = Object.assign(defaultState().settings, data.settings || {});
      if (data.settings) {
        if (data.settings.clinicName) state.settings.clinicName = data.settings.clinicName;
        if (data.settings.countryCode) state.settings.countryCode = data.settings.countryCode;
        if (data.settings.template) state.settings.template = data.settings.template;
        if (data.settings.logo) state.settings.logo = data.settings.logo;
      }
      state.patients = (data.patients || []).map(p => Object.assign({ account: [], odontogram: {}, createdAt: null, photos: [] }, p));
      state.appointments = (data.appointments || []).map(a => Object.assign({ nextControl: null, controlDone: false }, a));
    } else {
      state = defaultState();
    }
    renderAll();
  });
}

function save(){
  try{
    db.ref('cdp_data_v1').set(state);
  } catch(e){
    alert('Hubo un error al sincronizar con la nube.');
  }
}

/* ---------- CALENDARIO Y AGENDA ---------- */
function renderCalendar(){
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  $('#calTitle').textContent = MESES[m] + ' ' + y;
  let html = '';
  ['L','M','X','J','V','S','D'].forEach(d => html += '<div class="dow">' + d + '</div>');
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m+1, 0).getDate();
  const dimPrev = new Date(y, m, 0).getDate();
  const apptDays = {};
  state.appointments.forEach(a => { if(a.date) apptDays[a.date] = 1; });
  const tISO = todayISO();
  for(let i = 0; i < 42; i++){
    let cls = 'cal-day', num, iso = null;
    if(i < first){ num = dimPrev - first + 1 + i; cls += ' other'; }
    else if(i < first + dim){ num = i - first + 1; iso = y + '-' + String(m+1).padStart(2,'0') + '-' + String(num).padStart(2,'0'); }
    else { num = i - first - dim + 1; cls += ' other'; }
    if(iso){ if(iso === tISO) cls += ' today'; if(iso === selectedDate) cls += ' selected'; }
    html += '<div class="' + cls + '"' + (iso ? ' onclick="pickDay(\'' + iso + '\')"' : '') + '>' + num + (iso && apptDays[iso] ? '<span class="dot"></span>' : '') + '</div>';
  }
  $('#calGrid').innerHTML = html;
}
function pickDay(iso){ selectedDate = iso; renderCalendar(); renderDay(); }
function moveMonth(n){ viewDate.setMonth(viewDate.getMonth() + n); renderCalendar(); }

/* ---------- CITAS ---------- */
const apptsOn = iso => state.appointments.filter(a => a.date === iso).sort((a,b) => a.time.localeCompare(b.time));

function apptCard(a){
  const p = state.patients.find(x => x.id === a.patientId);
  return '<div class="appt">' +
    '<div class="row1"><span class="time">' + esc(a.time) + '</span><span class="badge b-' + a.status + '">' + a.status + '</span></div>' +
    '<div class="pname">' + esc(a.patientName) + '</div>' +
    '<div class="treat">' + esc(a.treatment) + (a.notes ? ' · ' + esc(a.notes) : '') + (p && p.phone ? ' · 📱 ' + esc(p.phone) : '') +
      (a.nextControl && !a.controlDone ? ' · 🔔 Próx. control: ' + fmtDate(a.nextControl) : '') + '</div>' +
    '<div class="actions">' +
      '<button class="btn ghost sm" onclick="waReminder(\'' + a.id + '\')">💬 WhatsApp</button>' +
      (a.status === 'Pendiente' ? '<button class="btn sm" style="background:var(--bluebg);color:var(--blue)" onclick="setStatus(\'' + a.id + '\',\'Confirmada\')">✔ Confirmar</button>' : '') +
      (a.status !== 'Completada' && a.status !== 'Cancelada' ? '<button class="btn sm" style="background:var(--greenbg);color:var(--green)" onclick="setStatus(\'' + a.id + '\',\'Completada\')">🏁 Completada</button>' : '') +
      (a.status !== 'Cancelada' ? '<button class="btn sm" style="background:var(--redbg);color:var(--red)" onclick="setStatus(\'' + a.id + '\',\'Cancelada\')">✖ Cancelar</button>' : '') +
      '<button class="btn ghost sm" onclick="openApptModal(\'' + a.id + '\')">✏️ Editar</button>' +
      '<button class="btn red sm" onclick="delAppt(\'' + a.id + '\')">🗑</button>' +
    '</div></div>';
}

function renderDay(){
  $('#dayTitle').textContent = 'Citas del ' + fmtDate(selectedDate);
  const list = apptsOn(selectedDate);
  $('#dayList').innerHTML = list.length ? list.map(apptCard).join('') :
    '<div class="empty">No hay citas este día.<br>Haz clic en <b>+ Nueva cita</b> para agendar. 🦷</div>';
}

function renderUpcoming(){
  const today = todayISO(), max = addDays(today, 7);
  const list = state.appointments
    .filter(a => a.date >= today && a.date <= max && a.status !== 'Cancelada' && a.status !== 'Completada')
    .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 15);
  $('#upcomingList').innerHTML = list.length ? list.map(a =>
    '<div class="appt"><div class="row1"><span class="pname">' + esc(a.patientName) + '</span><span class="badge b-' + a.status + '">' + a.status + '</span></div>' +
    '<div class="treat">📅 ' + fmtDate(a.date) + ' · 🕐 ' + esc(a.time) + ' · ' + esc(a.treatment) + '</div></div>'
  ).join('') : '<div class="empty">No hay citas próximas.</div>';
}

function setStatus(id, st){ const a = state.appointments.find(x => x.id === id); if(a){ a.status = st; save(); renderCalendar(); renderDay(); renderUpcoming(); } }
function delAppt(id){ if(!confirm('¿Eliminar esta cita definitivamente?')) return; state.appointments = state.appointments.filter(x => x.id !== id); save(); renderCalendar(); renderDay(); renderUpcoming(); renderControls(); }

/* ---------- CONTROLES PENDIENTES ---------- */
function renderControls(){
  const el = $('#controlsList'); if(!el) return;
  const today = todayISO();
  const list = state.appointments
    .filter(a => a.nextControl && !a.controlDone && a.nextControl <= today)
    .sort((a,b) => (a.nextControl || '').localeCompare(b.nextControl || ''));
  el.innerHTML = list.length ? list.map(a => {
    const p = state.patients.find(x => x.id === a.patientId);
    return '<div class="appt"><div class="row1"><span class="pname">' + esc(a.patientName) + '</span><span class="badge b-Pendiente">Control</span></div>' +
      '<div class="treat">Correspondía el ' + fmtDate(a.nextControl) + ' · último tratamiento: ' + esc(a.treatment) + (p && p.phone ? ' · 📱 ' + esc(p.phone) : '') + '</div>' +
      '<div class="actions">' +
        '<button class="btn ghost sm" onclick="controlReminder(\'' + a.id + '\')">💬 WhatsApp</button>' +
        '<button class="btn sm" style="background:var(--greenbg);color:var(--green)" onclick="markControlDone(\'' + a.id + '\')">✔ Contactado</button>' +
      '</div></div>';
  }).join('') : '<div class="empty">No hay controles pendientes de contactar.</div>';
}
function markControlDone(id){ const a = state.appointments.find(x => x.id === id); if(a){ a.controlDone = true; save(); renderControls(); } }
function controlReminder(id){
  const a = state.appointments.find(x => x.id === id); if(!a) return;
  const p = state.patients.find(x => x.id === a.patientId);
  let phone = (p && p.phone ? p.phone : '').replace(/\D/g, '');
  if(!phone){ alert('Este paciente no tiene número de teléfono registrado.'); return; }
  const cc = (state.settings.countryCode || '').replace(/\D/g, '');
  if(cc && phone.length <= 10) phone = cc + phone;
  const msg = 'Hola ' + a.patientName + ' 😊 De ' + state.settings.clinicName + ' le recordamos que le corresponde un control dental de seguimiento. ¿Podemos agendarle una cita?';
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
}

function setApptMode(mode){
  apptMode = mode;
  $$('#apptModeSeg button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#apptExistingWrap').classList.toggle('hidden', mode !== 'existing');
  $('#apptNewWrap').classList.toggle('hidden', mode !== 'new');
}

function openApptModal(id){
  editingAppt = id || null;
  const a = id ? state.appointments.find(x => x.id === id) : null;

  if(!state.patients.length && !a){
    setApptMode('new');
    $('#apptModeSeg').classList.add('hidden');
  }else{
    $('#apptModeSeg').classList.remove('hidden');
    setApptMode('existing');
  }

  $('#apptPatient').innerHTML = state.patients.map(p => '<option value="' + p.id + '">' + esc(fullName(p)) + '</option>').join('');
  $('#apptModalTitle').textContent = id ? 'Editar cita' : 'Nueva cita';
  $('#apptNewName').value = ''; $('#apptNewLastName').value = ''; $('#apptNewPhone').value = ''; $('#apptNewAge').value = ''; $('#apptNewSex').value = '';
  if(a) $('#apptPatient').value = a.patientId;
  else if(state.patients.length) $('#apptPatient').value = state.patients[0].id;
  $('#apptDate').value = a ? a.date : selectedDate;
  $('#apptTime').value = a ? a.time : '09:00';
  $('#apptTreat').value = a ? a.treatment : 'Revisión general';
  $('#apptNotes').value = a ? a.notes : '';
  $('#apptNextControl').value = a && a.nextControl ? a.nextControl : '';
  $('#apptModal').classList.add('open');
}
function saveAppt(){
  const date = $('#apptDate').value, time = $('#apptTime').value;
  if(!date || !time){ alert('Completa fecha y hora.'); return; }

  let pid, p;
  if(apptMode === 'new'){
    const name = $('#apptNewName').value.trim();
    if(!name){ alert('Escribe al menos el nombre del paciente.'); return; }
    p = {
      id: uid(), name, lastName: $('#apptNewLastName').value.trim(),
      phone: $('#apptNewPhone').value.trim(), age: $('#apptNewAge').value,
      sex: $('#apptNewSex').value, notes: '', avatar: null, photos: [], account: [], odontogram: {}, createdAt: todayISO()
    };
    state.patients.push(p);
    pid = p.id;
  }else{
    pid = $('#apptPatient').value;
    if(!pid){ alert('Selecciona un paciente o crea uno nuevo.'); return; }
    p = state.patients.find(x => x.id === pid);
  }

  const nextControl = $('#apptNextControl').value || null;
  const data = { patientId: pid, patientName: fullName(p), date, time, treatment: $('#apptTreat').value, notes: $('#apptNotes').value.trim(), nextControl };
  if(editingAppt){
    const existing = state.appointments.find(x => x.id === editingAppt);
    if(nextControl && nextControl !== existing.nextControl) data.controlDone = false;
    Object.assign(existing, data);
  }
  else { state.appointments.push(Object.assign({ id: uid(), status: 'Pendiente', controlDone: false }, data)); }
  save(); closeModal('apptModal'); renderCalendar(); renderDay(); renderUpcoming(); renderPatients(); renderControls();
}

function waReminder(id){
  const a = state.appointments.find(x => x.id === id); if(!a) return;
  const p = state.patients.find(x => x.id === a.patientId);
  let phone = (p && p.phone ? p.phone : '').replace(/\D/g, '');
  if(!phone){ alert('Este paciente no tiene número de teléfono registrado.'); return; }
  const cc = (state.settings.countryCode || '').replace(/\D/g, '');
  if(cc && phone.length <= 10) phone = cc + phone;
  let msg = (state.settings.template || defaultState().settings.template)
    .replace('{nombre}', a.patientName).replace('{fecha}', fmtDate(a.date)).replace('{hora}', a.time).replace('{tratamiento}', a.treatment);
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
}

/* ---------- PACIENTES ---------- */
function renderPatients(){
  const q = ($('#searchP').value || '').toLowerCase();
  const list = state.patients.filter(p => !q || fullName(p).toLowerCase().includes(q) || (p.phone || '').includes(q));
  const el = $('#patientList');
  if(!list.length){
    el.innerHTML = '<div class="empty">No hay pacientes registrados todavía.<br>Haz clic en <b>+ Nuevo paciente</b> para empezar. 🦷</div>';
    return;
  }
  el.innerHTML = list.map(p => {
    const bal = accountBalance(p);
    const balClass = bal > 0 ? 'debe' : (bal < 0 ? 'favor' : 'aldia');
    const balText = bal > 0 ? 'Debe ' + fmtMoney(bal) : (bal < 0 ? 'A favor ' + fmtMoney(-bal) : 'Al día');
    return '<div class="patient-card">' +
      '<div class="top">' +
        '<span style="display:flex;align-items:center;gap:10px">' +
          (p.avatar ? '<img class="avatar" src="' + p.avatar + '">' : '<span class="avatar" style="display:flex;align-items:center;justify-content:center">🧑</span>') +
          '<b style="font-size:15px">' + esc(fullName(p)) + '</b>' +
          '<span class="balance-badge ' + balClass + '">' + balText + '</span>' +
        '</span>' +
        '<span style="display:flex;gap:6px">' +
          '<button class="btn ghost sm" onclick="openPatientModal(\'' + p.id + '\')">✏️ Editar</button>' +
          '<button class="btn red sm" onclick="delPatient(\'' + p.id + '\')">🗑</button>' +
        '</span></div>' +
      '<div class="meta">' + (p.phone ? '📱 ' + esc(p.phone) + ' · ' : '') + (p.age ? '🎂 ' + esc(p.age) + ' años · ' : '') + (p.sex ? '⚧ ' + esc(p.sex) + ' · ' : '') + '🖼 ' + (p.photos || []).length + ' foto(s) · 🦷 ' + Object.keys(p.odontogram || {}).length + ' diente(s) registrado(s)</div>' +
      (p.notes ? '<div class="meta">📝 ' + esc(p.notes) + '</div>' : '') +
      '<div style="display:flex;gap:6px;margin-top:9px;flex-wrap:wrap">' +
        '<button class="btn primary sm" onclick="quickAppt(\'' + p.id + '\')">📅 Agendar cita</button>' +
        '<button class="btn ghost sm" onclick="document.getElementById(\'ph-' + p.id + '\').click()">🖼️ Subir radiografías</button>' +
        '<input type="file" id="ph-' + p.id + '" accept="image/*" multiple class="hidden" onchange="uploadPhotos(event,\'' + p.id + '\')">' +
        '<button class="btn ghost sm" onclick="openAccountModal(\'' + p.id + '\')">💰 Cuenta</button>' +
        '<button class="btn ghost sm" onclick="openOdontoModal(\'' + p.id + '\')">🦷 Odontograma</button>' +
      '</div>' +
      '<div class="photogrid" id="grid-' + p.id + '"></div>' +
    '</div>';
  }).join('');
  list.forEach(renderPhotoGrid);
}
function renderPhotoGrid(p){
  const g = $('#grid-' + p.id); if(!g) return;
  g.innerHTML = (p.photos || []).map(ph =>
    '<div class="phwrap"><img src="' + ph.dataUrl + '" alt="radiografía" onclick="showPhoto(\'' + p.id + '\',\'' + ph.id + '\')">' +
    '<button class="del" onclick="delPhoto(\'' + p.id + '\',\'' + ph.id + '\')">✕</button></div>'
  ).join('');
}
function showPhoto(pid, phid){
  const p = state.patients.find(x => x.id === pid);
  const ph = (p.photos || []).find(x => x.id === phid);
  if(!ph) return;
  $('#lbImg').src = ph.dataUrl;
  $('#lightbox').classList.add('open');
}
function delPhoto(pid, phid){
  if(!confirm('¿Eliminar esta foto?')) return;
  const p = state.patients.find(x => x.id === pid);
  p.photos = p.photos.filter(x => x.id !== phid);
  save(); renderPhotoGrid(p); renderPatients();
}
function compressImage(file){
  return new Promise((res, rej) => {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    rd.onerror = rej;
    rd.readAsDataURL(file);
  });
}
async function uploadPhotos(ev, pid){
  const files = [...ev.target.files]; ev.target.value = '';
  const p = state.patients.find(x => x.id === pid); if(!p) return;
  p.photos = p.photos || [];
  for(const f of files){
    try{ p.photos.push({ id: uid(), name: f.name, date: todayISO(), dataUrl: await compressImage(f) }); }catch(e){}
  }
  save(); renderPatients();
}
$('#pAvatarFile') && $('#pAvatarFile').addEventListener('change', async ev => {
  const f = ev.target.files[0]; if(!f) return;
  tmpAvatar = await compressImage(f);
  const prev = $('#pAvatarPreview'); prev.src = tmpAvatar; prev.style.display = 'block';
});
function openPatientModal(id){
  editingPatient = id || null;
  tmpAvatar = null;
  $('#patientModalTitle').textContent = id ? 'Editar paciente' : 'Nuevo paciente';
  const p = id ? state.patients.find(x => x.id === id) : null;
  $('#pName').value = p ? p.name : '';
  $('#pLastName').value = p ? (p.lastName || '') : '';
  $('#pPhone').value = p ? p.phone : '';
  $('#pAge').value = p ? p.age : '';
  $('#pSex').value = p ? (p.sex || '') : '';
  $('#pNotes').value = p ? p.notes : '';
  const prev = $('#pAvatarPreview');
  if(p && p.avatar){ prev.src = p.avatar; prev.style.display = 'block'; }
  else{ prev.style.display = 'none'; prev.src = ''; }
  $('#patientModal').classList.add('open');
}
function savePatient(){
  const name = $('#pName').value.trim(), phone = $('#pPhone').value.trim();
  if(!name){ alert('El nombre es obligatorio.'); return; }
  const data = { name, lastName: $('#pLastName').value.trim(), phone, age: $('#pAge').value, sex: $('#pSex').value, notes: $('#pNotes').value.trim() };
  if(tmpAvatar) data.avatar = tmpAvatar;
  if(editingPatient){ Object.assign(state.patients.find(x => x.id === editingPatient), data); }
  else { state.patients.push(Object.assign({ id: uid(), photos: [], avatar: null, account: [], odontogram: {}, createdAt: todayISO() }, data)); }
  save(); closeModal('patientModal'); renderPatients(); renderUpcoming();
}
function delPatient(id){
  if(!confirm('¿Eliminar este paciente y sus fotos?')) return;
  state.patients = state.patients.filter(x => x.id !== id);
  save(); renderPatients();
}
function quickAppt(pid){ showTab('agenda'); openApptModal(); setApptMode('existing'); $('#apptPatient').value = pid; }

/* ---------- RENDER GENERAL ---------- */
function renderAll(){
  applySettings();
  renderCalendar();
  renderDay();
  renderUpcoming();
  renderControls();
  renderPatients();
}

/* ---------- ODONTOGRAMA ---------- */
function openOdontoModal(pid){
  odontoPatientId = pid;
  const p = state.patients.find(x => x.id === pid); if(!p) return;
  $('#odontoModalTitle').textContent = 'Odontograma de ' + fullName(p);
  closeToothEditor();
  renderOdontoChart();
  $('#odontoModal').classList.add('open');
}
function renderOdontoChart(){
  const p = state.patients.find(x => x.id === odontoPatientId); if(!p) return;
  p.odontogram = p.odontogram || {};
  const top = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const bottom = [32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17];
  const toothHtml = n => {
    const t = p.odontogram[n];
    const st = (t && t.status && ODONTO_STATUS[t.status]) ? t.status : 'sano';
    return '<div class="tooth-box t-' + st + '" onclick="pickTooth(' + n + ')" title="Diente ' + n + (t && t.note ? ': ' + t.note.replace(/"/g,'\'') : '') + '">' +
      '<span class="tnum">' + n + '</span>' + (t && t.note ? '<span class="tnote">●</span>' : '') + '</div>';
  };
  $('#odontoChart').innerHTML =
    '<div class="odonto-row">' + top.map(toothHtml).join('') + '</div>' +
    '<div class="odonto-row">' + bottom.map(toothHtml).join('') + '</div>';
  $('#odontoLegend').innerHTML = Object.keys(ODONTO_STATUS).map(k =>
    '<span class="legend-item"><span class="legend-dot t-' + k + '"></span>' + ODONTO_STATUS[k] + '</span>').join('');
}
function pickTooth(n){
  odontoToothNum = n;
  const p = state.patients.find(x => x.id === odontoPatientId); if(!p) return;
  const t = (p.odontogram || {})[n] || {};
  $('#odontoToothNum').textContent = n;
  $('#odontoStatus').value = t.status || 'sano';
  $('#odontoNote').value = t.note || '';
  $('#odontoToothEditor').classList.remove('hidden');
}
function closeToothEditor(){ odontoToothNum = null; $('#odontoToothEditor').classList.add('hidden'); }
function saveTooth(){
  const p = state.patients.find(x => x.id === odontoPatientId); if(!p || !odontoToothNum) return;
  p.odontogram = p.odontogram || {};
  const status = $('#odontoStatus').value, note = $('#odontoNote').value.trim();
  if(status === 'sano' && !note){ delete p.odontogram[odontoToothNum]; }
  else{ p.odontogram[odontoToothNum] = { status, note }; }
  save(); renderOdontoChart(); closeToothEditor(); renderPatients();
}

/* ---------- ESTADÍSTICAS ---------- */
function moveStatsMonth(n){ statsDate.setMonth(statsDate.getMonth() + n); renderStats(); }
function renderStats(){
  const y = statsDate.getFullYear(), m = statsDate.getMonth();
  const mKey = y + '-' + String(m+1).padStart(2,'0');
  $('#statsTitle').textContent = MESES[m] + ' ' + y;

  const apptsMonth = state.appointments.filter(a => (a.date || '').startsWith(mKey));

  let cobrado = 0, facturado = 0;
  state.patients.forEach(p => (p.account || []).forEach(mv => {
    if(!(mv.date || '').startsWith(mKey)) return;
    if(mv.type === 'pago') cobrado += Number(mv.amount) || 0;
    else facturado += Number(mv.amount) || 0;
  }));
  const nuevos = state.patients.filter(p => (p.createdAt || '').startsWith(mKey)).length;

  $('#statCobrado').textContent = fmtMoney(cobrado);
  $('#statFacturado').textContent = fmtMoney(facturado);
  $('#statCitas').textContent = apptsMonth.length;
  $('#statNuevos').textContent = nuevos;

  const porEstado = {};
  apptsMonth.forEach(a => porEstado[a.status] = (porEstado[a.status] || 0) + 1);
  $('#statsEstado').innerHTML = ['Pendiente','Confirmada','Completada','Cancelada'].map(st =>
    '<div class="stat-row"><span class="badge b-' + st + '">' + st + '</span><b>' + (porEstado[st] || 0) + '</b></div>').join('');

  const porTrat = {};
  apptsMonth.forEach(a => { if(a.status !== 'Cancelada') porTrat[a.treatment] = (porTrat[a.treatment] || 0) + 1; });
  const tratList = Object.entries(porTrat).sort((a,b) => b[1] - a[1]);
  $('#statsTrat').innerHTML = tratList.length ? tratList.map(([t,c]) =>
    '<div class="stat-row"><span>' + esc(t) + '</span><b>' + c + '</b></div>').join('') : '<div class="empty">Sin citas este mes.</div>';
}

/* ---------- CONFIGURACIÓN ---------- */
function showTab(t){
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  ['agenda','pacientes','stats','config'].forEach(x => $('#tab-' + x).classList.toggle('hidden', x !== t));
  if(t === 'config') fillConfig();
  if(t === 'stats') renderStats();
}
function fillConfig(){
  $('#cfgName').value = state.settings.clinicName || '';
  $('#cfgCC').value = state.settings.countryCode || '';
  $('#cfgTemplate').value = state.settings.template || '';
  const prev = $('#cfgLogoPreview');
  if(state.settings.logo){ prev.src = state.settings.logo; prev.style.display = 'block'; } else prev.style.display = 'none';
}
$('#cfgLogo') && $('#cfgLogo').addEventListener('change', async ev => {
  const f = ev.target.files[0]; if(!f) return;
  tmpLogo = await compressImage(f);
  const prev = $('#cfgLogoPreview'); prev.src = tmpLogo; prev.style.display = 'block';
});
function saveConfig(){
  state.settings.clinicName = $('#cfgName').value.trim() || 'CONSULTORIO DENTAL PORCEL';
  state.settings.countryCode = $('#cfgCC').value.trim();
  state.settings.template = $('#cfgTemplate').value.trim() || defaultState().settings.template;
  if(tmpLogo){ state.settings.logo = tmpLogo; tmpLogo = null; }
  save(); applySettings(); alert('✅ Configuración guardada.');
}
function applySettings(){
  if(!state.settings) return;
  $('#clinicName').textContent = state.settings.clinicName || 'CONSULTORIO DENTAL PORCEL';
  document.title = (state.settings.clinicName || 'Consultorio Dental') + ' — Agenda';
  const slot = $('#logoSlot');
  if(slot && state.settings.logo){ slot.outerHTML = '<img class="logo" id="logoSlot" src="' + state.settings.logo + '" alt="logo">'; }
  else if(slot) { slot.outerHTML = '<span class="tooth" id="logoSlot">🦷</span>'; }
}
function exportBackup(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'respaldo_' + todayISO() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
}
function exportExcel(){
  if(typeof XLSX === 'undefined'){ alert('No se pudo cargar el módulo de Excel.'); return; }
  const wb = XLSX.utils.book_new();
  const pacientesRows = state.patients.map(p => ({
    'Nombre': p.name || '', 'Apellido': p.lastName || '', 'Teléfono': p.phone || '',
    'Edad': p.age || '', 'Sexo': p.sex || '', 'Notas médicas': p.notes || '', 'Saldo (Bs.)': accountBalance(p)
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pacientesRows), 'Pacientes');
  XLSX.writeFile(wb, 'Consultorio_Porcel_' + todayISO() + '.xlsx');
}
function importBackup(ev){
  const f = ev.target.files[0]; if(!f) return; ev.target.value = '';
  const rd = new FileReader();
  rd.onload = e => {
    try{
      const s = JSON.parse(e.target.result);
      if(!s.patients || !s.appointments) throw 0;
      if(!confirm('Esto REEMPLAZARÁ todos los datos actuales. ¿Continuar?')) return;
      s.settings = Object.assign(defaultState().settings, s.settings || {});
      state = s;
      save(); applySettings(); renderAll(); showTab('agenda');
      alert('✅ Respaldo importado correctamente.');
    }catch(err){ alert('❌ Archivo no válido.'); }
  };
  rd.readAsText(f);
}
function loadSamples(){
  if(state.patients.length && !confirm('Ya hay datos reales. ¿Agregar los ejemplos?')) return;
  const p1 = { id: uid(), name:'María', lastName:'González', phone:'584121234567', age:'34', sex:'Femenino', notes:'', photos:[], avatar:null, account:[] };
  state.patients.push(p1);
  state.appointments.push({ id: uid(), patientId:p1.id, patientName:fullName(p1), date:todayISO(), time:'09:00', treatment:'Limpieza dental', status:'Confirmada' });
  save(); renderAll(); showTab('agenda');
}
function wipeAll(){
  if(!confirm('⚠️ Se borrarán TODOS los pacientes, citas y fotos. ¿Estás seguro?')) return;
  db.ref('cdp_data_v1').remove();
  state = defaultState();
  save(); applySettings(); renderAll(); showTab('agenda');
}
function printDay(){
  const list = apptsOn(selectedDate);
  const html = '<h2>' + esc(state.settings.clinicName) + '</h2>' +
    '<h3 style="font-weight:normal;color:#555">Agenda del día: ' + fmtDate(selectedDate) + '</h3>' +
    (list.length ? '<ol>' + list.map(a => '<li><b>' + esc(a.time) + '</b> — ' + esc(a.patientName) + ' · ' + esc(a.treatment) + '</li>').join('') + '</ol>' : '<p>Sin citas.</p>');
  printHTML('Agenda', html);
}
function closeModal(id){ $('#' + id).classList.remove('open'); }
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ $$('.modal.open').forEach(m => m.classList.remove('open')); $('#lightbox').classList.remove('open'); } });

/* ---------- CUENTA / PAGOS ---------- */
function openAccountModal(pid){
  accountPatientId = pid;
  const p = state.patients.find(x => x.id === pid); if(!p) return;
  $('#accountModalTitle').textContent = 'Cuenta de ' + fullName(p);
  $('#accDate').value = todayISO();
  $('#accConcept').value = '';
  $('#accAmount').value = '';
  $('#accType').value = 'cargo';
  renderAccountModal();
  $('#accountModal').classList.add('open');
}
function renderAccountModal(){
  const p = state.patients.find(x => x.id === accountPatientId); if(!p) return;
  const bal = accountBalance(p);
  const cls = bal > 0 ? 'debe' : (bal < 0 ? 'favor' : 'aldia');
  const txt = bal > 0 ? 'Debe ' + fmtMoney(bal) : (bal < 0 ? 'A favor ' + fmtMoney(-bal) : 'Cuenta al día');
  $('#accountBalanceBox').innerHTML = '<span class="balance-badge ' + cls + '" style="font-size:15px;padding:8px 14px">' + txt + '</span>';

  const movs = [...(p.account || [])].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  $('#accountList').innerHTML = movs.length ? movs.map(m =>
    '<div class="acc-row acc-' + m.type + '">' +
      '<div class="acc-main"><b>' + esc(m.concept || (m.type === 'pago' ? 'Pago' : 'Cargo')) + '</b><span class="acc-date">' + fmtDate(m.date) + '</span></div>' +
      '<span class="acc-amount">' + (m.type === 'pago' ? '− ' : '+ ') + fmtMoney(m.amount) + '</span>' +
      '<button class="btn red sm" onclick="delAccountEntry(\'' + m.id + '\')">🗑</button>' +
    '</div>'
  ).join('') : '<div class="empty">Sin movimientos registrados todavía.</div>';
}
function addAccountEntry(){
  const p = state.patients.find(x => x.id === accountPatientId); if(!p) require;
  const type = $('#accType').value;
  const concept = $('#accConcept').value.trim();
  const amount = parseFloat($('#accAmount').value);
  const date = $('#accDate').value || todayISO();
  if(!amount || amount <= 0){ alert('Ingresa un monto válido.'); return; }
  p.account = p.account || [];
  p.account.push({ id: uid(), date, type, concept, amount });
  save();
  $('#accConcept').value = ''; $('#accAmount').value = '';
  renderAccountModal(); renderPatients();
}
function delAccountEntry(id){
  const p = state.patients.find(x => x.id === accountPatientId); if(!p) return;
  if(!confirm('¿Eliminar este movimiento?')) return;
  p.account = (p.account || []).filter(m => m.id !== id);
  save(); renderAccountModal(); renderPatients();
}

renderAll();
