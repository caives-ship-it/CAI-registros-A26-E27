/* ======================================================================
   DATOS SEMILLA — CAI UVP
   Puedes editar todo esto también desde la pestaña Configuración /
   Actividades una vez que la plataforma esté corriendo; estos arreglos
   solo se usan la PRIMERA vez que se abre la plataforma en un navegador
   (o cuando no hay datos en Firebase todavía).
   ====================================================================== */

const SEED_NOMENCLATURA = [
  // División de Artes & Humanidades
  { prefix: "AR", carrera: "Arquitectura", division: "Artes & Humanidades" },
  { prefix: "CC", carrera: "Ciencias de la Comunicación", division: "Artes & Humanidades" },
  { prefix: "DM", carrera: "Diseño de Modas", division: "Artes & Humanidades" },
  { prefix: "DC", carrera: "Diseño y Comunicación Gráfica", division: "Artes & Humanidades" },
  { prefix: "LE", carrera: "Lenguas Extranjeras", division: "Artes & Humanidades" },
  { prefix: "PD", carrera: "Pedagogía", division: "Artes & Humanidades" },
  { prefix: "PA", carrera: "Producción y Animación", division: "Artes & Humanidades" },
  { prefix: "IP", carrera: "Producción Musical", division: "Artes & Humanidades" },
  // División de Ingenierías
  { prefix: "II", carrera: "Industrial", division: "Ingenierías" },
  { prefix: "IA", carrera: "Mecánica y Diseño Automotriz", division: "Ingenierías" },
  { prefix: "IC", carrera: "Civil", division: "Ingenierías" },
  { prefix: "IM", carrera: "Mecatrónica", division: "Ingenierías" },
  { prefix: "TI", carrera: "Sistemas y Tecnologías de la Información", division: "Ingenierías" },
  { prefix: "IB", carrera: "Ingeniería Biomédica", division: "Ingenierías" },
  // División de Negocios, Hospitalidad y Ciencias Sociales
  { prefix: "AE", carrera: "Administración de Empresas", division: "Negocios, Hospitalidad y CS" },
  { prefix: "AP", carrera: "Administración Pública y Ciencias Políticas", division: "Negocios, Hospitalidad y CS" },
  { prefix: "AT", carrera: "Administración y Gestión Turística", division: "Negocios, Hospitalidad y CS" },
  { prefix: "CP", carrera: "Contaduría Pública", division: "Negocios, Hospitalidad y CS" },
  { prefix: "CR", carrera: "Criminología y Criminalística", division: "Negocios, Hospitalidad y CS" },
  { prefix: "DE", carrera: "Derecho", division: "Negocios, Hospitalidad y CS" },
  { prefix: "EC", carrera: "Economía y Finanzas", division: "Negocios, Hospitalidad y CS" },
  { prefix: "GA", carrera: "Gastronomía", division: "Negocios, Hospitalidad y CS" },
  { prefix: "MP", carrera: "Mercadotecnia y Publicidad", division: "Negocios, Hospitalidad y CS" },
  { prefix: "NI", carrera: "Negocios Internacionales", division: "Negocios, Hospitalidad y CS" },
  { prefix: "AC", carrera: "Actuaría", division: "Negocios, Hospitalidad y CS" },
  // División de Ciencias de la Salud
  { prefix: "CD", carrera: "Cirujano Dentista", division: "Ciencias de la Salud" },
  { prefix: "FT", carrera: "Fisioterapia", division: "Ciencias de la Salud" },
  { prefix: "EN", carrera: "Enfermería", division: "Ciencias de la Salud" },
  { prefix: "NT", carrera: "Nutrición", division: "Ciencias de la Salud" },
  { prefix: "PS", carrera: "Psicología", division: "Ciencias de la Salud" },
  { prefix: "MN", carrera: "Medicina", division: "Ciencias de la Salud" },
  // División de Ciencias de la Vida
  { prefix: "QF", carrera: "Químico Farmacobiólogo", division: "Ciencias de la Vida" },
  { prefix: "IG", carrera: "Ingeniería en Agronomía", division: "Ciencias de la Vida" },
  { prefix: "ZV", carrera: "Veterinaria", division: "Ciencias de la Vida" },
];

// Tomado de "Propuesta de planeación para CAI A26-E27" — talleres y círculos
// conversacionales temáticos. Se conserva solo la información operativa
// (título, tipo, a quién va dirigido, nivel, duración, ubicación y objetivo);
// todo es editable después desde la pestaña Actividades.
const SEED_ACTIVIDADES = [
  {
    tipo: "Taller",
    nombre: "English for Physical Therapy",
    licenciatura: "Fisioterapia",
    nivel: "A2",
    duracion: "1 hora",
    espacio: "Laboratorio de fisioterapia",
    objetivo: "Utilizar comandos e instrucciones sencillas en inglés para guiar movimientos, ejercicios y procedimientos básicos durante una sesión de fisioterapia.",
    cupo: 10,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "English at the Dental Clinic",
    licenciatura: "Cirujano Dentista",
    nivel: "A2",
    duracion: "1 hora",
    espacio: "Laboratorio de odontología o CAI",
    objetivo: "Utilizar vocabulario y expresiones básicas para recibir a un paciente, identificar síntomas y ofrecer recomendaciones sencillas en una consulta odontológica.",
    cupo: 10,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "Veterinary Consultation",
    licenciatura: "Veterinaria",
    nivel: "A2",
    duracion: "1 hora/30 min",
    espacio: "CAI",
    objetivo: "Describir información básica sobre una mascota, identificar síntomas comunes y realizar una consulta veterinaria sencilla en inglés.",
    cupo: 10,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "Mock Trial in English",
    licenciatura: "Derecho",
    nivel: "A2",
    duracion: "1 hora/30 min",
    espacio: "Sala de juicios orales o CAI",
    objetivo: "Utilizar expresiones básicas del ámbito jurídico para narrar hechos, formular preguntas y emitir un veredicto en un juicio simulado.",
    cupo: 10,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "English Baking Workshop",
    licenciatura: "Gastronomía",
    nivel: "A2/B1",
    duracion: "1 hora",
    espacio: "Laboratorio de repostería",
    objetivo: "Seguir y proporcionar instrucciones en inglés durante la elaboración de una receta sencilla utilizando vocabulario gastronómico.",
    cupo: 8,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "Fashion Design Studio",
    licenciatura: "Diseño de Modas",
    nivel: "A2/B1",
    duracion: "1 hora",
    espacio: "Laboratorio de Modas",
    objetivo: "Describir materiales, procesos de elaboración y características de una prenda utilizando vocabulario propio del diseño de modas.",
    cupo: 8,
    activa: true,
  },
  {
    tipo: "Club de conversación",
    nombre: "Coffee & Conversation",
    licenciatura: "Indistinta",
    nivel: "A2",
    duracion: "1 hora/30 min",
    espacio: "Cafetería Winky",
    objetivo: "Fortalecer la fluidez oral mediante conversaciones espontáneas sobre temas cotidianos en un ambiente relajado.",
    cupo: 8,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "Community Dental Care",
    licenciatura: "Cirujano Dentista",
    nivel: "A2",
    duracion: "1 hora",
    espacio: "Instalaciones de UVP",
    objetivo: "Explicar en inglés el procedimiento correcto para el cepillado dental y proporcionar recomendaciones básicas de higiene bucal.",
    cupo: 10,
    activa: true,
  },
  {
    tipo: "Taller",
    nombre: "On Air! English Radio Show",
    licenciatura: "Indistinta",
    nivel: "A2",
    duracion: "1 hora",
    espacio: "Cabina de radio",
    objetivo: "Desarrollar la expresión oral y la pronunciación mediante entrevistas sencillas en inglés dentro de un entorno de radio.",
    cupo: 6,
    activa: true,
  },
];

// Tipos de actividad disponibles en el catálogo (usados en el formulario
// de Actividades y como filtro/etiqueta en toda la plataforma).
const TIPOS_ACTIVIDAD = [
  "Taller",
  "Club de conversación",
  "Asesoría general",
  "Sesión de práctica APTIS",
  "Sesión de práctica TOEFL",
];

// Servicios recurrentes del CAI (asesorías y práctica de certificación).
// Se agregan al mismo catálogo de actividades para que también se puedan
// programar por sesión y llevar asistencia, igual que los talleres.
SEED_ACTIVIDADES.push(
  {
    tipo: "Asesoría general",
    nombre: "Asesoría general de inglés",
    licenciatura: "Indistinta",
    nivel: "Todos los niveles",
    duracion: "30 min",
    espacio: "CAI",
    objetivo: "Resolver dudas puntuales y reforzar el aprendizaje del idioma de manera personalizada.",
    cupo: 6,
    activa: true,
  },
  {
    tipo: "Sesión de práctica APTIS",
    nombre: "Práctica de certificación APTIS",
    licenciatura: "Indistinta",
    nivel: "Todos los niveles",
    duracion: "30 min",
    espacio: "CAI",
    objetivo: "Practicar el formato y tipo de reactivos del examen de certificación APTIS.",
    cupo: 6,
    activa: true,
  },
  {
    tipo: "Sesión de práctica TOEFL",
    nombre: "Práctica de certificación TOEFL",
    licenciatura: "Indistinta",
    nivel: "Todos los niveles",
    duracion: "30 min",
    espacio: "CAI",
    objetivo: "Practicar el formato y tipo de reactivos del examen de certificación TOEFL.",
    cupo: 6,
    activa: true,
  }
);

const DEFAULT_STAFF_PASSWORD = "CAI2026";
const SANCTION_DAYS = 7;
