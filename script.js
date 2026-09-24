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

// Inicializar la aplicación de Firebase de forma segura
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
// 5. SINCRONIZACIÓN CON FIREBASE
// ==========================================
function escucharDatos() {
  console.log("Conectando con la base de datos de Firebase...");
  
  // Escuchar configuración del consultorio
  db.ref('config').on('value', (snapshot) => {
    const config = snapshot.val();
    if (config) {
      if ($('#cfgName')) $('#cfgName').value = config.name || '';
      if ($('#clinicName')) $('#clinicName').textContent = config.name || 'CONSULTORIO DENTAL PORCEL';
      if ($('#cfgCC')) $('#cfgCC').value = config.cc || '';
      if ($('#cfgTemplate')) $('#cfgTemplate').value = config.template || '';
    }
  });

  // Aquí puedes agregar la lectura de pacientes y citas si ya tienes las funciones estructuradas.
}
