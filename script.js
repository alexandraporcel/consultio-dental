// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCe9oWPHvfAnHvqUKqJgit_dzom3mCBBOg",
  authDomain: "consultoriodentalporcel.firebaseapp.com",
  databaseURL: "https://consultoriodentalporcel-default-rtdb.firebaseio.com",
  projectId: "consultoriodentalporcel",
  storageBucket: "consultoriodentalporcel.firebasestorage.app",
  messagingSenderId: "495434397964",
  appId: "1:495434397964:web:e281c1e6fdd1445f947129",
  measurementId: "G-47RSRBV01W"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();


// ==========================================
// 2. UTILIDADES Y SELECTORES
// ==========================================
const $ = (selector) => document.querySelector(selector);
let dbListenerAttached = false;


// ==========================================
// 3. AUTENTICACIÓN
// ==========================================
async function doLogin() {
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;
  const errorBox = $('#loginError');

  if (!email || !password) {
    if (errorBox) {
      errorBox.textContent = "Por favor, completa el correo y la contraseña.";
      errorBox.classList.remove('hidden');
    }
    return;
  }

  try {
    if (errorBox) errorBox.classList.add('hidden');
    await auth.signInWithEmailAndPassword(email, password);
    console.log("Sesión iniciada con éxito");
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    if (errorBox) {
      errorBox.textContent = "Error: " + error.message;
      errorBox.classList.remove('hidden');
    }
  }
}

function doLogout() {
  $('#appContent').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('#loginEmail').value = '';
  $('#loginPassword').value = '';
  dbListenerAttached = false;
  auth.signOut().catch(err => console.error(err));
}

auth.onAuthStateChanged(user => {
  if (user) {
    $('#loginScreen').classList.add('hidden');
    $('#appContent').classList.remove('hidden');
    if (!dbListenerAttached) {
      dbListenerAttached = true;
      if (typeof escucharDatos === 'function') {
        escucharDatos();
      }
    }
  } else {
    $('#appContent').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#loginEmail').value = '';
    $('#loginPassword').value = '';
    dbListenerAttached = false;
  }
});


// ==========================================
// 4. NAVEGACIÓN DE PESTAÑAS
// ==========================================
function showTab(tabName) {
  document.querySelectorAll('main > section').forEach(sec => {
    sec.classList.add('hidden');
  });

  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeSection = document.getElementById(`tab-${tabName}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  const activeBtn = document.querySelector(`nav button[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}


// ==========================================
// 5. INTERFAZ Y ACCIONES
// ==========================================
function moveMonth(direction) {
  console.log("Moviendo mes en la agenda:", direction);
}

function openPatientModal() {
  console.log("Abriendo modal de paciente...");
  const modal = $('#patientModal');
  if (modal) modal.classList.remove('hidden');
}


// ==========================================
// 6. SINCRONIZACIÓN CON FIREBASE (NODO REAL)
// ==========================================
function escucharDatos() {
  console.log("Conectando con la estructura cdp_data_v1 de Firebase...");

  // Conectamos directamente al contenedor principal que arroja tu base de datos
  db.ref('cdp_data_v1').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("Datos de la nube sincronizados:", data);

      // Cargar configuración si existe dentro del nodo
      if (data.config) {
        if ($('#cfgName')) $('#cfgName').value = data.config.name || data.config.nombre || '';
        if ($('#clinicName')) $('#clinicName').textContent = data.config.name || data.config.nombre || 'CONSULTORIO DENTAL PORCEL';
        if ($('#cfgCC')) $('#cfgCC').value = data.config.cc || data.config.codigoPais || '';
        if ($('#cfgTemplate')) $('#cfgTemplate').value = data.config.template || data.config.mensaje || '';
      }
    }
  });
}
