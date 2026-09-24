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
// 2. SELECTOR Y LÓGICA DE LA APP
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

// Función para cerrar sesión
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
  // Función para evitar que la app se congele al entrar
function escucharDatos() {
  console.log("Escuchando datos de la base de datos...");
  // Aquí puedes poner la lógica que lee tus citas o pacientes de Firebase, 
  // o dejarla vacía temporalmente para que desbloquee la interfaz:
}
});
