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
  // Forzar ocultar el contenido y mostrar el login de inmediato en la interfaz
  $('#appContent').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('#loginEmail').value = '';
  $('#loginPassword').value = '';
  dbListenerAttached = false;

  // Cerrar la sesión en Firebase de forma segura
  auth.signOut().catch((error) => {
    console.error('Error al cerrar sesión en Firebase:', error);
  });
}

// 3. Vigilar el estado de autenticación de Firebase en tiempo real
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
    // Si NO hay usuario (o se cerró sesión), fuerza obligatoriamente el login en pantalla
    $('#appContent').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#loginEmail').value = '';
    $('#loginPassword').value = '';
    dbListenerAttached = false;
  }
});
