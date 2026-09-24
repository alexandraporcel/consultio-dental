// 1. Selector rápido para elementos del DOM (JavaScript nativo)
const $ = (selector) => document.querySelector(selector);

let dbListenerAttached = false;

// 2. Función para cerrar sesión de forma segura
function doLogout() {
  // Forzar ocultar el contenido y mostrar el login de inmediato
  $('#appContent').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  $('#loginEmail').value = '';
  $('#loginPassword').value = '';
  dbListenerAttached = false;

  // Cerrar la sesión en Firebase
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
      escucharDatos(); // Asegúrate de que esta función exista en tu código
    }
  } else {
    // Si NO hay usuario (o se cerró sesión), muestra el login
    $('#appContent').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
    $('#loginEmail').value = '';
    $('#loginPassword').value = '';
    dbListenerAttached = false;
  }
});

// 4. Manejar el evento de envío del formulario de inicio de sesión
// (Asegúrate de que tu formulario en el HTML tenga un ID o clase, o cámbialo aquí abajo si usas un selector diferente)
const loginForm = $('#loginForm') || document.querySelector('form'); 

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;

    try {
      // Intenta iniciar sesión con Firebase Authentication
      await auth.signInWithEmailAndPassword(email, password);
      console.log("Sesión iniciada con éxito");
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      alert("No se pudo iniciar sesión. Revisa tu correo y contraseña.");
    }
  });
}