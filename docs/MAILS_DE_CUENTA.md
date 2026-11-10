# Mails de la cuenta (verificar el mail y contraseña nueva)

Los manda Firebase Authentication. El texto se escribe una vez en la consola y los enlaces llegan a una página propia de MIO (`/cuenta`, `src/pages/CuentaPage.tsx`) en vez de a la página genérica de Firebase.

## Qué hace la app
- **Crear cuenta con mail y contraseña** (web y escritorio): manda el mail de verificación y deja la cuenta en "Confirmá que el mail es tuyo" (`src/components/ui/VerifyEmail.tsx`) hasta que se toque el enlace. Al volver a la ventana se pregunta solo. Con Google no hace falta: ya viene verificado.
- **Me olvidé la contraseña** (escritorio): manda el mail para crear una contraseña nueva. La página `/cuenta` la pide y revisa que cumpla la política (mayúscula, minúscula y número, 6 o más).
- Sin verificar, la cuenta no puede escribir en Firestore (`dashboard-ia/firestore.rules`) ni usar el motor web (`core/auth.py`).

## Estado (9/11/2026)
Firebase no deja editar las plantillas de este proyecto ("Por el momento, no se pueden actualizar las plantillas…"; es una traba antiabuso de Firebase, se destraba pidiéndolo a Asistencia de Firebase). Mientras tanto salen las plantillas de Firebase **en español** (`auth.languageCode = 'es'` en `src/lib/firebaseAuth.ts`) y los enlaces abren la página de Firebase en vez de `/cuenta`. Cuando lo destraben, seguir los pasos de abajo.

## Pasos en la consola de Firebase (una sola vez)
Authentication → Plantillas.

1. **URL de acción** (en cualquier plantilla, "Personalizar URL de acción"): `https://miodb.pages.dev/cuenta`. Vale para todas las plantillas. Recién funciona cuando la página está publicada en `main`; mientras tanto dejá la de Firebase.
2. **Nombre del remitente**: `MIO`. **Responder a**: el mail de soporte.
3. **Idioma de la plantilla**: español.
4. Opcional: **dominio propio** del remitente (por ejemplo `hola@mio...`). Firebase pide agregar registros DNS; sin eso sale de `noreply@analitica-dashboar-y-ml.firebaseapp.com`.
5. Pegá estos textos. Firebase reemplaza `%LINK%`, `%EMAIL%` y `%APP_NAME%`.

### Verificación de dirección de correo electrónico
**Asunto:** Confirmá tu mail para entrar a MIO

**Mensaje:**
```html
<p>Hola,</p>
<p>Creaste una cuenta de MIO con %EMAIL%. Para entrar, confirmá que el mail es tuyo:</p>
<p><a href="%LINK%">Confirmar mi mail</a></p>
<p>El enlace sirve una sola vez y vence en unas horas. Si no creaste esta cuenta, ignorá este mail: sin confirmar, nadie puede usarla.</p>
<p>MIO</p>
```

### Restablecimiento de contraseña
**Asunto:** Tu contraseña nueva de MIO

**Mensaje:**
```html
<p>Hola,</p>
<p>Pediste una contraseña nueva para la cuenta de MIO de %EMAIL%.</p>
<p><a href="%LINK%">Crear una contraseña nueva</a></p>
<p>El enlace sirve una sola vez y vence en una hora. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.</p>
<p>MIO</p>
```

### Cambio de dirección de correo electrónico
Firebase no deja editar este texto (es el aviso de seguridad). Su enlace también llega a `/cuenta`, que deshace el cambio y manda el mail de contraseña nueva.

## Para que valga
- **Firestore**: publicar las reglas (`firebase deploy --only firestore:rules` desde `dashboard-ia/`).
- **Web**: la página `/cuenta` sale con la próxima publicación de `main`.
- **Cuentas viejas** creadas con contraseña y sin verificar: al entrar ven la pantalla de verificación y pueden pedir el mail de nuevo.
