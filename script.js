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

// Declarar auth y db después de inicializar
const auth = firebase.auth();
const db = firebase.database();


// ==========================================
// 2. SELECTOR Y LÓGICA DE LA APLICACIÓN
// ==========================================
const $ = (selector) => document.querySelector(selector);

let dbListenerAttached = false;

// Función de Login que se activa al hacer clic en el botón
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

// Función para cerrar sesión de forma segura
function doLogout() {
  $('#appContent').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('#loginEmail').value = '';
  $('#loginPassword').value = '';
  dbListenerAttached = false;

  auth.signOut().catch((error) => {
    console.error('Error al cerrar sesión en Firebase:', error);
  });
}

// Vigilar el estado de autenticación en tiempo real
auth.onAuthStateChanged(user => {
  if (user) {
    // Si hay usuario autenticado, muestra la app
    $('#loginScreen').classList.add('hidden');
    $('#appContent').classList.remove('hidden');
    if (!dbListenerAttached) {
      dbListenerAttached = true;
      if (typeof escucharDatos === 'function') {
        escucharDatos();
      }
    }
  } else {
    // Si NO hay usuario (o se cerró sesión), fuerza el login en pantalla
    $('#appContent').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#loginEmail').value = '';
    $('#loginPassword').value = '';
    dbListenerAttached = false;
  }
});

// ==========================================
// 3. FUNCIONES DE INTERFAZ Y NAVEGACIÓN
// ==========================================

// Función para cambiar entre las pestañas del menú (Agenda, Pacientes, etc.)
function showTab(tabName) {
  // Ocultar todas las secciones principales
  document.querySelectorAll('main > section').forEach(sec => {
    sec.classList.add('hidden');
  });

  // Quitar la clase active de todos los botones del menú
  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar la sección seleccionada
  const activeSection = document.getElementById(`tab-${tabName}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Marcar el botón como activo
  const activeBtn = document.querySelector(`nav button[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// Función para escuchar datos de la base de datos de Firebase
function escucharDatos() {
  console.log("Escuchando datos de la base de datos...");
  // Aquí se conectarán tus funciones de lectura en tiempo real de Firebase cuando cargues datos.
}
