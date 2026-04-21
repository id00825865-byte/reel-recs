# ReelRecs - Tu Guía Cinematográfica Personal

Recomendaciones de películas con IA que aprenden de lo que ya has visto.

## Cómo subir este proyecto a GitHub

Para entregar este proyecto a tu tutor con un enlace profesional, sigue estos pasos:

1. **Crea un repositorio en GitHub**:
   - Ve a [github.com](https://github.com) y crea un nuevo repositorio llamado `reel-recs`. Manténlo como público o privado según prefieras.

2. **Sube el código**:
   - Abre la terminal en este entorno y ejecuta estos comandos:
     ```bash
     git init
     git add .
     git commit -m "Proyecto ReelRecs - Versión Estable V4"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/reel-recs.git
     git push -u origin main
     ```
     *(Sustituye TU_USUARIO por tu nombre de usuario de GitHub)*.

## Despliegue en Firebase App Hosting (URL Pública)

Para obtener la URL que le enviarás a tu tutor:

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. Selecciona tu proyecto.
3. Ve a **Build > App Hosting** en el menú izquierdo.
4. Haz clic en **Comenzar** y conecta tu repositorio de GitHub.
5. Firebase detectará automáticamente que es un proyecto **Next.js** y lo desplegará.
6. Al finalizar, te dará una URL del tipo `https://tu-proyecto.web.app`.

---
**Nota Importante**: Recuerda añadir tu `GEMINI_API_KEY` en la sección de "Environment Variables" dentro de la configuración de App Hosting en la consola de Firebase para que la IA funcione en el enlace público.
