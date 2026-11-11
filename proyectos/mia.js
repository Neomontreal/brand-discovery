// Proyecto: MIA
// Para un cliente nuevo: copia este archivo como proyectos/<slug>.js, cambia
// slug, marca y tema, y ajusta las preguntas. {marca} se reemplaza solo.
// Link para el cliente: index.html?p=<slug>
//
// Tipos de pregunta:
//   text      párrafo libre                 short   una línea
//   single    una opción (tarjetas/pastillas) multi  varias opciones (max, estilo:"cards")
//   slider    valor entre dos extremos       range   rango mín–máx
//   campos    varios campos con etiqueta     lista   filas que se agregan (+ campos opcionales)
//   colores   paletas + colores propios      imagenes subir imágenes + links
// Extras: opcional:true · otro:true (agrega "Otro: ¿cuál?") · extra:{t} (campo de texto adicional)
//         si:{id, en:[...]} muestra la pregunta solo si la respuesta de <id> está en la lista.
window.DISCOVERY = {
  slug: "mia",
  marca: "MIA",
  titulo: "Descubrimiento de marca",
  minutos: 12,
  intro:
    "Queremos conocer {marca} desde adentro: su historia, su gente, su música y hacia dónde va. No hay respuestas correctas, contesten como si se lo contaran a un amigo.",
  cierre:
    "Recibimos sus respuestas. Con esto empezamos a construir la identidad de {marca}. Pronto nos ponemos en contacto para la siguiente etapa.",
  tema: {
    acento: "#ff4d6d",
    acentoTinta: "#16060a",
    fondo: "#0b0a0d",
  },

  bloques: [
    {
      titulo: "Antes de empezar",
      preguntas: [
        {
          id: "nombre",
          tipo: "short",
          texto: "¿Cómo te llamas?",
          ayuda: "Así sabemos quién respondió qué, si lo contestan varios socios.",
          placeholder: "Nombre y apellido",
        },
      ],
    },
    {
      titulo: "Esencia",
      preguntas: [
        {
          id: "porque",
          tipo: "text",
          texto: "¿Por qué {marca}?",
          ayuda: "Cuéntennos el origen del nombre y qué significa para ustedes.",
        },
        {
          id: "palabra",
          tipo: "short",
          texto: "Si tuvieran que definir {marca} con una sola palabra, ¿cuál sería?",
          placeholder: "Una palabra",
          extra: { t: "¿Por qué esa palabra?" },
        },
        {
          id: "persona",
          tipo: "campos",
          opcional: true,
          texto: "Si {marca} fuera una persona, ¿cómo sería?",
          campos: [
            { k: "edad", t: "¿Qué edad tiene?" },
            { k: "viste", t: "¿Cómo se viste?" },
            { k: "habla", t: "¿Cómo habla? ¿Qué tono usa?" },
            { k: "viernes", t: "¿Qué hace un viernes en la noche?" },
          ],
        },
        {
          id: "adjetivos",
          tipo: "multi",
          opcional: true,
          max: 3,
          otro: true,
          texto: "Elijan los 3 adjetivos que mejor describen a {marca}.",
          opciones: [
            "Sensual", "Exclusiva", "Divertida", "Cálida", "Elegante", "Rebelde",
            "Tropical", "Misteriosa", "Auténtica", "Atrevida", "Sofisticada",
            "Relajada", "Vibrante", "Íntima", "Glamorosa", "Moderna", "Nostálgica",
          ],
        },
        {
          id: "nunca",
          tipo: "text",
          opcional: true,
          texto: "¿Qué NO quieren ser nunca?",
          ayuda: "Lo que les daría vergüenza escuchar sobre {marca}. Esto marca los límites de la marca.",
        },
      ],
    },

    {
      titulo: "Concepto",
      preguntas: [
        {
          id: "meta",
          tipo: "single",
          texto: "¿Cuál es la meta principal de {marca}?",
          opciones: [
            { v: "nightlife", t: "Nightlife", d: "Música, barra, mesas y fiesta." },
            { v: "food", t: "Food", d: "La comida es la protagonista." },
            { v: "ambos", t: "Ambos", d: "Una cena que se transforma en noche." },
          ],
        },
        {
          id: "peso",
          tipo: "slider",
          si: { id: "meta", en: ["ambos"] },
          texto: "Entre nightlife y food, ¿hacia dónde se inclina la balanza?",
          min: 0, max: 100, paso: 10, inicial: 50,
          etiquetas: ["Más nightlife", "Más food"],
          formato: (v) => `${100 - v}% nightlife · ${v}% food`,
        },
        {
          id: "cocina",
          tipo: "multi",
          opcional: true,
          otro: true,
          si: { id: "meta", en: ["food", "ambos"] },
          texto: "¿Qué tipo de cocina tendrán?",
          opciones: [
            "Latina", "Mexicana", "Peruana", "Colombiana", "Caribeña", "Fusión",
            "Mediterránea", "Asiática", "Tapas / para compartir", "Comida de calle",
          ],
          extra: { t: "Formato: ¿para compartir, platos fuertes, bocados de barra?" },
        },
        {
          id: "horarios",
          tipo: "text",
          opcional: true,
          texto: "¿Qué días y en qué horarios abrirán?",
          ayuda: "Y si aplica: ¿cómo cambia el lugar de la cena a la noche? (luces, música, servicio)",
        },
        {
          id: "lugar",
          tipo: "campos",
          opcional: true,
          texto: "¿Dónde estará {marca} y cuánta gente cabe?",
          campos: [
            { k: "barrio", t: "Barrio o dirección" },
            { k: "capacidad", t: "Capacidad aproximada (personas)" },
            { k: "espacios", t: "Espacios (terraza, VIP, pista, barra…)" },
          ],
        },
      ],
    },

    {
      titulo: "Cliente",
      preguntas: [
        {
          id: "cliente",
          tipo: "multi",
          estilo: "cards",
          otro: true,
          texto: "¿Quién es su cliente ideal?",
          ayuda: "Pueden elegir varios.",
          opciones: [
            { v: "latino30", t: "Latino profesional, 30–40 años", d: "Clase media-alta, sale con amigos o en pareja, busca calidad." },
            { v: "joven20", t: "Joven quebequense, 20–28 años", d: "Sigue tendencias, sale en grupo, descubre lugares en redes." },
            { v: "internacional", t: "Público internacional / turista", d: "Busca una experiencia distinta en Montreal." },
            { v: "celebraciones", t: "Grupos de celebración", d: "Cumpleaños, despedidas, aniversarios." },
            { v: "botellas", t: "Mesas y botellas", d: "Gasto alto, quiere ver y ser visto." },
            { v: "foodie", t: "Foodie y after work", d: "Viene por la comida y los cócteles, se queda por el ambiente." },
          ],
        },
        {
          id: "edad",
          tipo: "range",
          opcional: true,
          texto: "¿Qué rango de edad imaginan en el lugar?",
          min: 18, max: 65, inicial: [25, 40], unidad: "años",
        },
        {
          id: "dress",
          tipo: "single",
          opcional: true,
          texto: "¿Habrá dress code?",
          opciones: [
            { v: "casual", t: "Casual", d: "Como llegues." },
            { v: "smart", t: "Smart casual", d: "Arreglado sin exagerar." },
            { v: "elegante", t: "Elegante", d: "Noche especial, se viste para la ocasión." },
            { v: "sin", t: "Sin código", d: "Que cada quien se exprese." },
          ],
        },
      ],
    },

    {
      titulo: "Sensaciones",
      preguntas: [
        {
          id: "musica",
          tipo: "multi",
          otro: true,
          texto: "¿Qué música representa a {marca}?",
          opciones: [
            "Reggaetón", "Latin house", "House", "Afro house", "Tech house", "Techno",
            "Salsa", "Bachata", "Merengue", "Dembow", "Amapiano", "R&B", "Hip-hop",
            "Pop latino", "Open format",
          ],
          extra: { t: "Artistas, DJs o canciones de referencia" },
        },
        {
          id: "colores",
          tipo: "colores",
          texto: "¿Qué colores identifican la marca?",
          ayuda: "Elijan paletas que les hablen, agreguen sus propios colores, o ambos.",
          paletas: [
            { id: "tropical", t: "Noche tropical", c: ["#0d3b2e", "#1f7a5a", "#f2c14e", "#f6e7cf"] },
            { id: "neon", t: "Neón Miami", c: ["#0b0a14", "#7b2ff7", "#ff3d7f", "#00e0ff"] },
            { id: "oro", t: "Negro y oro", c: ["#0a0a0a", "#1c1a17", "#c9a45c", "#f3e9d2"] },
            { id: "terracota", t: "Terracota cálida", c: ["#8c3b22", "#d26a3c", "#f0b38a", "#f7efe6"] },
            { id: "rojo", t: "Rojo pasión", c: ["#5c0a12", "#b3141f", "#f2545b", "#f7e1d7"] },
            { id: "atardecer", t: "Atardecer", c: ["#2b1640", "#a83f6f", "#f07a4a", "#ffcf7a"] },
            { id: "crema", t: "Minimal crema", c: ["#1d1b18", "#8a7a66", "#d9cbb6", "#f5efe6"] },
            { id: "medianoche", t: "Azul medianoche", c: ["#0b1636", "#1e3a8a", "#7aa2ff", "#e8edf7"] },
          ],
        },
        {
          id: "entrada",
          tipo: "text",
          opcional: true,
          texto: "¿Qué sienten al entrar a {marca}?",
          ayuda: "Describan los primeros 30 segundos: la luz, el olor, la música, quién los recibe.",
        },
      ],
    },

    {
      titulo: "Inspiración",
      preguntas: [
        {
          id: "inspiracion",
          tipo: "text",
          texto: "¿Qué los inspiró a abrir este lugar?",
        },
        {
          id: "referencias",
          tipo: "imagenes",
          texto: "Compartan sus referencias visuales.",
          ayuda: "Fotos de lugares, moodboards, capturas, texturas… lo que les inspire. También pueden pegar links (Pinterest, Drive, etc.).",
          max: 12,
        },
        {
          id: "instagram",
          tipo: "lista",
          texto: "¿Qué cuentas de Instagram admiran?",
          ayuda: "De restaurantes, clubs, marcas o artistas.",
          placeholder: "@cuenta",
          filas: 3,
        },
        {
          id: "lugares",
          tipo: "lista",
          texto: "¿Qué lugares conocen y les gustan?",
          ayuda: "De Montreal o del mundo. Cuéntennos qué les gusta de cada uno.",
          campos: [
            { k: "lugar", t: "Lugar y ciudad" },
            { k: "gusta", t: "¿Qué les gusta?" },
          ],
          filas: 2,
        },
        {
          id: "competencia",
          tipo: "text",
          opcional: true,
          texto: "¿Quién es la competencia directa en Montreal?",
          ayuda: "¿Y en qué será diferente {marca}?",
        },
      ],
    },

    {
      titulo: "Visión",
      preguntas: [
        {
          id: "anio",
          tipo: "text",
          texto: "¿Cómo se ven en un año?",
        },
        {
          id: "mesa",
          tipo: "text",
          texto: "Cuando {marca} sale de tema en una mesa, ¿qué quieren que la gente piense o diga?",
        },
        {
          id: "apertura",
          tipo: "campos",
          texto: "¿Qué visionan para el proyecto y su apertura?",
          campos: [
            { k: "vision", t: "Visión general del proyecto", largo: true },
            { k: "fecha", t: "Fecha estimada de apertura" },
            { k: "evento", t: "Tipo de evento de apertura" },
            { k: "invitados", t: "Invitados, influencers, artistas o DJs" },
            { k: "prensa", t: "Prensa o activaciones" },
          ],
        },
        {
          id: "eventos",
          tipo: "text",
          opcional: true,
          texto: "¿Tendrán eventos recurrentes?",
          ayuda: "Noches temáticas, DJs residentes, brunch, after office…",
        },
      ],
    },

    {
      titulo: "Números",
      preguntas: [
        {
          id: "botellas",
          tipo: "single",
          texto: "¿En qué rango de precio estarán las botellas?",
          opciones: [
            { v: "150", t: "Menos de $150" },
            { v: "150-300", t: "$150 – $300" },
            { v: "300-500", t: "$300 – $500" },
            { v: "500", t: "Más de $500" },
          ],
          extra: { t: "Marcas o botellas que quieren tener (opcional)" },
        },
        {
          id: "coctel",
          tipo: "single",
          texto: "¿Cuál será el precio promedio de un cóctel o drink?",
          opciones: [
            { v: "10-14", t: "$10 – $14" },
            { v: "14-18", t: "$14 – $18" },
            { v: "18-22", t: "$18 – $22" },
            { v: "22", t: "Más de $22" },
          ],
          extra: { t: "Cócteles insignia o ideas (opcional)" },
        },
        {
          id: "ticket",
          tipo: "single",
          opcional: true,
          texto: "¿Cuánto esperan que gaste cada persona en promedio?",
          opciones: [
            { v: "40", t: "Menos de $40" },
            { v: "40-80", t: "$40 – $80" },
            { v: "80-150", t: "$80 – $150" },
            { v: "150", t: "Más de $150" },
          ],
        },
        {
          id: "marketing",
          tipo: "single",
          opcional: true,
          texto: "¿Presupuesto mensual aproximado para marketing?",
          opciones: [
            { v: "1000", t: "Menos de $1,000" },
            { v: "1000-3000", t: "$1,000 – $3,000" },
            { v: "3000-6000", t: "$3,000 – $6,000" },
            { v: "6000", t: "Más de $6,000" },
            { v: "nd", t: "Prefiero no decir" },
          ],
        },
      ],
    },

    {
      titulo: "Lo que ya existe",
      preguntas: [
        {
          id: "activos",
          tipo: "campos",
          opcional: true,
          texto: "¿Qué tienen ya hecho?",
          ayuda: "Pueden pegar links. Si algo no existe todavía, déjenlo vacío.",
          campos: [
            { k: "logo", t: "Logo (link a los archivos)" },
            { k: "instagram", t: "Instagram" },
            { k: "web", t: "Sitio web" },
            { k: "otro", t: "Otro material (menú, fotos, renders…)" },
          ],
        },
      ],
    },
  ],
};
