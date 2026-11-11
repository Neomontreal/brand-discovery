// Configuración general del cuestionario de marca (NEO · Brand Discovery).
//
// Supabase: pega aquí la URL del proyecto y la "anon key" (Settings → API).
// Ambas están hechas para ir en el navegador; la seguridad la dan las reglas
// (RLS) de supabase/schema.sql. Mientras estén vacías, el sitio funciona en
// MODO DEMO: las respuestas solo se guardan en el navegador de quien responde.
window.BD_CONFIG = {
  supabaseUrl: "https://xlqlfxwhtrkxbyydafcp.supabase.co",
  supabaseAnonKey: "sb_publishable_Mm123aw68PyccfRdceEZtg_r3TROPyJ",  // llave publicable (segura en el navegador)
  bucket: "discovery",          // bucket de Storage para las imágenes de referencia
  proyectoPorDefecto: "mia",    // se usa cuando el link no trae ?p=...
  version: 3,                   // súbelo (y el ?v= de los HTML) al publicar cambios, para saltar la caché
};
