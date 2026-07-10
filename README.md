# Plataforma CAI · Centro de Aplicación de Idiomas — UVP

Plataforma de registro y control de asistencia para las actividades del CAI
(talleres, clubes de conversación, asesorías y sesiones de práctica de
certificación), inspirada en el formato de
https://zujaely.github.io/tedtalk-rubricas/ y adaptada a las necesidades
del CAI, con la identidad visual de la UVP.

## ⚠️ Sobre el problema de "no me aparece la sesión"

Esto **no era un error de la plataforma**: sin conectar Firebase (ver más
abajo), **cada navegador guarda su propia información** (localStorage).
Cuando tú programas una sesión desde tu computadora, esa sesión solo existe
en tu navegador — los estudiantes que abren el link desde su celular ven
una copia "en blanco" de la plataforma, sin esa sesión.

**La plataforma ahora te avisa de esto**: cuando entras en modo staff sin
estar conectado a Firebase, verás una franja amarilla arriba de cada
pestaña administrativa recordándote que conectes la sincronización antes
de compartir el link con tus estudiantes. Sigue la sección **"Sincronizar
varios dispositivos"** más abajo — es el paso que hace que todo funcione
en tiempo real entre tu computadora y los celulares de los estudiantes.

## Qué cambió en esta versión

- **Colores institucionales de la UVP** (rojo/vino + dorado) en lugar de
  la paleta azul marino original. Los tomé del logotipo público de la
  universidad; si tienes el manual de marca con los códigos HEX/Pantone
  exactos, compártemelos y ajusto la paleta con precisión milimétrica.
- **Logo del CAI** en el encabezado (usé la imagen que enviaste, ya con
  fondo transparente).
- **Pestañas de staff completamente ocultas** para cualquier persona que
  no haya iniciado sesión — un estudiante que entra al link solo ve la
  pestaña "Registro". El botón "Acceso staff" (arriba a la derecha) pide
  la contraseña y, solo entonces, aparecen el resto de las pestañas.
  Ten en cuenta que esto sigue siendo una protección básica pensada para
  que nadie entre "por curiosidad", no un sistema de autenticación de
  nivel empresarial.
- **"Actividades" y "Sesiones" ahora son una sola pestaña.** Cada tarjeta
  de actividad incluye, al final, sus sesiones programadas (fecha, hora,
  cupo, registrados, asistieron, estado) con un botón "+ Programar sesión"
  propio.
- **Nuevos tipos de actividad**: Taller, Club de conversación, Asesoría
  general, Sesión de práctica APTIS y Sesión de práctica TOEFL — ya
  precargué "Asesoría general de inglés", "Práctica de certificación
  APTIS" y "Práctica de certificación TOEFL" como actividades reales del
  catálogo (antes eran solo un aviso de texto); ahora también se
  programan por sesión y llevan asistencia igual que los talleres.

## ¿Qué hace la plataforma?

- **Registro de estudiantes**: matrícula, nombre, docente de inglés, grupo
  y **carrera detectada automáticamente** a partir de las 2 primeras letras
  de la matrícula (editable si no se detecta o si cambia la nomenclatura).
- **Catálogo de actividades editable**: título, tipo, a quién va dirigido,
  nivel, duración, ubicación y objetivo, con sus sesiones programadas —
  todo editable desde la plataforma, sin tocar código.
- **Asistencia por escaneo de QR**: en la pestaña "Asistencia" seleccionas
  la sesión del día y dejas el cursor en el campo de escaneo — tu lector
  de códigos funciona como teclado, así que al escanear la matrícula del
  estudiante se marca su asistencia automáticamente, sin comparar bases
  manualmente.
- **Sanción automática**: al cerrar una sesión, todo el que se registró
  pero no fue escaneado queda como "No asistió" y no puede volver a
  registrarse a esa misma actividad durante 7 días (configurable en
  `data.js`, constante `SANCTION_DAYS`).
- **Estadísticas**: totales generales, asistencia por actividad, asistencias
  por carrera, matriz carrera × actividad y sanciones activas.
- **Exportación**: Excel (varias hojas), CSV y respaldo/restauración en JSON.
- **Modo staff**: la pestaña "Registro" es la única visible públicamente;
  el resto solo aparece tras introducir la contraseña de staff.

## Cómo publicarla (GitHub Pages, gratis)

1. Crea un repositorio nuevo en GitHub (puede ser público o privado).
2. Sube estos archivos a la raíz: `index.html`, `styles.css`, `app.js`,
   `data.js` y la carpeta `assets/` completa (contiene el logo).
3. Ve a **Settings → Pages**, selecciona la rama `main` y carpeta `/root`.
4. En un par de minutos tu plataforma estará en
   `https://tuusuario.github.io/tu-repositorio/` — ese es el link que
   compartes con tus estudiantes para el registro.

También puedes subir los archivos a cualquier otro hosting estático
(Netlify, Vercel, un servidor de la universidad, etc.).

## Sincronizar varios dispositivos (necesario para uso real)

1. Ve a https://console.firebase.google.com/ y crea un proyecto nuevo.
2. Dentro del proyecto, activa **Firestore Database** (modo producción).
3. En **Configuración del proyecto → Tus apps**, crea una app web y copia
   los valores (`apiKey`, `authDomain`, `projectId`, etc.).
4. En reglas de Firestore, durante pruebas puedes usar temporalmente:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /cai/{doc} {
         allow read, write: if true;
       }
     }
   }
   ```
   (Para producción, restringe la escritura con autenticación si lo
   necesitas — pregúntame si quieres que lo configuremos así.)
5. En la plataforma, entra en **Acceso staff → Configuración →
   Sincronización en tiempo real** y pega esos valores → **Guardar y
   conectar**.
6. Repite el paso 5 (con los mismos valores) en cada dispositivo desde el
   que tú u otro staff vayan a administrar la plataforma. **No hace falta
   que los estudiantes hagan nada distinto** — en cuanto tú estés
   conectado, lo que programes se sincroniza solo y ellos ya lo verán al
   entrar al link normal.

A partir de ahí, cualquier registro o asistencia escaneada en un
dispositivo aparece al instante en los demás, y el indicador de la esquina
superior derecha cambiará de "● Local" a "● Sincronizado".

## Contraseña de staff

La contraseña inicial es **`CAI2026`**. Cámbiala en cuanto publiques la
plataforma desde **Acceso staff → Configuración → Contraseña de staff**.

## Editar la nomenclatura de carreras

Si la universidad actualiza los prefijos de matrícula por ciclo, ve a
**Configuración → Nomenclatura de matrícula → carrera** y agrega, edita o
elimina prefijos ahí mismo, sin tocar código.

## Estructura de archivos

```
index.html   → estructura de la página y las pestañas
styles.css   → todo el diseño (colores institucionales UVP, tipografía, layout)
app.js       → toda la lógica: registro, escaneo, sanciones, estadísticas,
               exportación, Firebase, control de acceso de staff
data.js      → datos iniciales: nomenclatura de carreras, tipos de
               actividad y catálogo de actividades tomado de la propuesta
               A26-E27
assets/      → logo del CAI
```

## Notas

- El lector de códigos de barras/QR que usan en el CAI funciona como
  teclado (escribe el texto y presiona Enter automáticamente), así que
  no requiere ninguna integración especial: solo mantén el cursor en el
  campo "Escanear matrícula" de la pestaña Asistencia.
- Si algún día quieres usar la cámara del celular como lector (en vez del
  lector físico), es una mejora que se puede agregar después.

