# NEO · Descubrimiento de marca

Cuestionario interactivo (una pregunta por pantalla) para entender la marca de un cliente, con panel privado para ver las respuestas.
Sitio estático: HTML + JS, sin build. Backend: Supabase (base de datos + imágenes).

- **Cliente:** `index.html?p=mia`
- **Panel:** `admin.html` (detalle por respuesta, comparar socios lado a lado, CSV, PDF)
- **Local:** `node serve.mjs` → http://localhost:4340/?p=mia (o el `brand-discovery` de launch.json)

## Proyecto nuevo (reutilizar la base)
1. Copia `proyectos/mia.js` como `proyectos/<slug>.js` (slug en minúsculas, sin espacios: `la-toxica`).
2. Cambia `slug`, `marca`, `intro`, `cierre` y `tema.acento`. `{marca}` en los textos se reemplaza solo.
3. Ajusta, quita o agrega preguntas (los tipos están explicados al inicio del archivo). **No cambies el `id` de una pregunta
   que ya tiene respuestas**, porque se pierde la relación en el panel.
4. Envía `index.html?p=<slug>`. En el panel aparece como otro proyecto en el selector.

## Conectar Supabase (una sola vez, sirve para todos los proyectos)
1. Crea un proyecto en supabase.com (gratis).
2. **SQL Editor** → pega `supabase/schema.sql` → Run.
3. **Authentication → Users → Add user → Send invitation**: invita tu correo (el panel entra con link mágico, sin contraseña).
   En **Authentication → URL Configuration** pon la dirección del sitio como Site URL y agrega `.../admin.html` a Redirect URLs.
4. En SQL Editor: `insert into discovery_admins (email) values ('tu-correo');`
5. **Authentication → Sign In / Providers**: desactiva "Allow new users to sign up" (solo entran los que tú crees).
6. **Settings → API**: copia la URL y la `anon public` key a `config.js`.

Sin esas llaves el sitio funciona en **modo demo**: guarda en el navegador de quien responde (sirve para probar, no para clientes).

## Cómo se guarda
- Cada cambio se guarda en el navegador y, con Supabase, en la tabla `discovery_responses` (función `save_discovery`).
  Si el cliente cierra, retoma donde quedó en el mismo dispositivo. `?p=mia&nuevo=1` empieza de cero.
- El formulario **solo puede escribir**; leer las respuestas requiere iniciar sesión con un correo que esté en `discovery_admins`.
- Las imágenes se comprimen en el navegador (máx. 1800 px) y van al bucket privado `discovery`; el panel las muestra con links temporales.

## Publicar
Cualquier hosting estático (GitHub Pages como Barranco, Netlify, Vercel). Se sube la carpeta tal cual.
