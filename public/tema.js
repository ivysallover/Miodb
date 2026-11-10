/* El tema elegido se aplica antes de pintar: sin destello claro al recargar en modo oscuro.
   Va en un archivo (no dentro de index.html) para que la política de seguridad no tenga que permitir scripts sueltos. */
try { if (localStorage.getItem('mio_theme') === 'dark') document.documentElement.classList.replace('light', 'dark'); } catch (e) {}
