/**
 * Spanish (Río de la Plata) — the primary voice. Free translation, never literal:
 * calm, simple, reassuring (CLAUDE.md -> Internationalization). `{name}`-style
 * placeholders are filled by `t(key, vars)`.
 */
export const es = {
  'home.greeting.morning': 'Buenos días',
  'home.greeting.afternoon': 'Buenas tardes',
  'home.greeting.evening': 'Buenas noches',
  'home.launching': 'Abriendo {app}…',
  'home.inApp.back': 'Volver al inicio',
  'home.inApp.pageBack': 'Atrás',
  'home.adminHint': 'Administración: F4',

  'admin.brand.subtitle': 'Administración',
  'admin.nav.general': 'General',
  'admin.nav.tiles': 'Accesos',
  'admin.nav.remoteAccess': 'Acceso remoto',
  'admin.backHome': 'Volver a Home',
  'admin.backHomeHint': 'o presioná F4',
  'admin.closeApp': 'Cerrar NoniOS',
  'admin.closeAppHint':
    'Sale del modo kiosco al escritorio de Windows. Si el inicio automático está activo, NoniOS se reabre solo en un minuto.',
  'admin.leaving': 'Volviendo a la pantalla de inicio…',
  'admin.firstBoot.notice':
    'Primera vez acá: completá estos datos, revisá los accesos y después tocá “Volver a Home”.',

  'admin.general.title': 'Configuración general',
  'admin.general.subtitle': 'Datos básicos que se muestran en la pantalla de inicio.',
  'admin.general.nameLabel': 'Nombre del usuario',
  'admin.general.nameHint': 'Aparece en el saludo: “Buenas tardes, {name}”.',
  'admin.general.namePlaceholder': 'Noni',
  'admin.general.languageLabel': 'Idioma',
  'admin.general.weatherLabel': 'Ubicación para el clima',
  'admin.general.weatherHint': 'Buscá la ciudad; se usa para la temperatura en Home.',
  'admin.general.weatherPlaceholder': 'Buenos Aires, Argentina',
  'admin.general.weatherSearching': 'Buscando…',
  'admin.general.weatherNoResults': 'No encontramos esa ciudad.',
  'admin.general.weatherCurrent': 'Ubicación actual: {city}',
  'admin.general.weatherNone': 'Todavía no hay una ubicación elegida.',
  'admin.general.autostartLabel': 'Iniciar NoniOS automáticamente al encender Windows',
  'admin.general.autostartHint':
    'Para la computadora de {name} tiene que estar activado. Apagalo solo mientras hacés mantenimiento.',
  'admin.general.autostartError':
    'No se pudieron cambiar las tareas programadas de Windows (hace falta permiso de administrador). La opción quedó guardada y NoniOS no se va a relanzar solo, pero puede abrirse al iniciar sesión hasta que corras el instalador de nuevo.',

  'admin.tiles.title': 'Accesos',
  'admin.tiles.subtitle': 'Las tarjetas que ve {name} en la pantalla de inicio.',
  'admin.tiles.add': 'Agregar acceso',
  'admin.tiles.emptyTitle': 'Todavía no hay accesos',
  'admin.tiles.emptyBody':
    'Agregá la primera app o página web para que aparezca en la pantalla de inicio.',
  'admin.tiles.addFirst': 'Agregar tu primer acceso',
  'admin.tiles.metaApp': 'App',
  'admin.tiles.metaWeb': 'Web',
  'admin.tiles.notDetected': 'no detectada',
  'admin.tiles.redetect': 'Volver a detectar',
  'admin.tiles.redetecting': 'Detectando…',
  'admin.tiles.moveUp': 'Subir',
  'admin.tiles.moveDown': 'Bajar',
  'admin.tiles.edit': 'Editar',
  'admin.tiles.delete': 'Eliminar',
  'admin.tiles.addModal.title': 'Agregar acceso',
  'admin.tiles.addModal.question': '¿Qué querés agregar?',
  'admin.tiles.addModal.appTitle': 'App instalada en esta computadora',
  'admin.tiles.addModal.appBody': 'Elegí de las apps detectadas en Windows',
  'admin.tiles.addModal.webTitle': 'Página web',
  'admin.tiles.addModal.webBody': 'Abrí un sitio directamente (ej: YouTube)',
  'admin.tiles.addModal.pickAppTitle': 'Elegí una app',
  'admin.tiles.addModal.searchApps': 'Buscar app instalada…',
  'admin.tiles.addModal.appsLoading': 'Buscando apps instaladas…',
  'admin.tiles.addModal.appsEmpty': 'No encontramos apps con ese nombre.',
  'admin.tiles.addModal.appsUnavailable': 'La lista de apps solo está disponible en Windows.',
  'admin.tiles.addModal.webStepTitle': 'Agregar página web',
  'admin.tiles.addModal.urlLabel': 'Dirección web (URL)',
  'admin.tiles.addModal.urlPlaceholder': 'https://www.youtube.com',
  'admin.tiles.addModal.labelLabel': 'Etiqueta',
  'admin.tiles.addModal.labelHint': 'La palabra que ve {name} debajo del ícono.',
  'admin.tiles.addModal.labelPlaceholder': 'YouTube',
  'admin.tiles.addModal.iconLabel': 'Ícono',
  'admin.tiles.addModal.cancel': 'Cancelar',
  'admin.tiles.addModal.confirm': 'Agregar acceso',
  'admin.tiles.addModal.back': 'Atrás',
  'admin.tiles.addModal.close': 'Cerrar',
  'admin.tiles.editModal.title': 'Editar acceso',
  'admin.tiles.editModal.save': 'Guardar',

  'admin.remoteAccess.title': 'Acceso remoto',
  'admin.remoteAccess.subtitle': 'Conectate a esta computadora desde otra usando AnyDesk.',
  'admin.remoteAccess.idLabel': 'ID de AnyDesk de esta instalación',
  'admin.remoteAccess.copy': 'Copiar',
  'admin.remoteAccess.copied': 'Copiado',
  'admin.remoteAccess.howTitle': 'Cómo reconectarse',
  'admin.remoteAccess.howBody':
    'Abrí AnyDesk en la otra computadora, escribí este ID en el campo de conexión y presioná Conectar. Después ingresá la contraseña que definiste en AnyDesk.',
  'admin.remoteAccess.passwordNote':
    'La contraseña se configura y gestiona directamente desde AnyDesk. No se guarda ni se muestra acá.',
  'admin.remoteAccess.notDetectedTitle': 'AnyDesk no está instalado',
  'admin.remoteAccess.notDetectedBody':
    'Instalá AnyDesk desde anydesk.com en esta computadora (usá “Cerrar NoniOS” para llegar al escritorio) y después tocá Volver a detectar.',
  'admin.remoteAccess.redetect': 'Volver a detectar',
  'admin.remoteAccess.detecting': 'Detectando…',
} as const

export type TranslationKey = keyof typeof es
