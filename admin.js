// Modo local: El panel requiere Firebase Auth y Custom Claims para funcionar.
document.getElementById("admin-main").innerHTML = `
  <div class="card admin-login center">
    <div style="font-size:48px">🔐</div>
    <h2>Panel Administrativo</h2>
    <p class="muted">Actualmente estás en modo local (sin Firebase). El panel de administración se habilitará automáticamente cuando conectes tu proyecto de Firebase y ejecutes el script de administrador.</p>
    <a href="index.html" class="btn" style="margin-top:16px">Volver a la tienda</a>
  </div>`;