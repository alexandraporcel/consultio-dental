// Definir auth y db para que no dé el error de "not defined"
const auth = firebase.auth();
const db = firebase.database();

// Selector rápido para elementos del DOM
const $ = (selector) => document.querySelector(selector);

let dbListenerAttached = false;

// 1. Función de Login que se activa al hacer clic en el botón
async function doLogin() {
  const email = $('#loginEmail').value.trim();
  const password = $('#loginPassword').value;

  if (!email || !password) {
    alert("Por favor, completa el correo y la contraseña.");
    return;
  }

  try {
    // Intenta iniciar sesión con Firebase Authentication
    await auth.signInWithEmailAndPassword(email, password);
    console.log("Sesión iniciada con éxito");
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    alert("No se pudo iniciar sesión. Verifica tus datos: " + error.message);
  }
}

// 2. Función para cerrar sesión de forma segura
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

// 3. Vigilar el estado de autenticación de Firebase en tiempo real
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
