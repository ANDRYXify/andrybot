// Manuale in spagnolo: la scheda Emote (7TV). Traduzione di src/web/manuali/it/emote.js (vedi docs/LINGUE.md).

export default {
  id: 'emote',
  slug: 'emotes',
  titolo: 'Manual de las emotes 7TV: gestiónalas desde el panel | SocialBot',
  h1: 'Manual de las emotes 7TV',
  desc: 'Conectar tu cuenta 7TV, añadir, quitar y renombrar las emotes del canal, y convertir una imagen, un GIF o un vídeo en una emote animada.',
  corpo: [
    { h2: 'Emotes (7TV)', scheda: 'emote', p: [
      'Las emotes 7TV de tu canal se gestionan desde aquí: las añades, las quitas, las renombras y creas otras nuevas a partir de una imagen, un GIF o un vídeo, sin abrir 7tv.app.',
      'Las emotes del canal y las globales de 7TV salen también en el chat en pantalla del overlay, y las del canal vuelan en el muro de emotes (<a href="/es/manual/overlay">manual del Overlay Studio</a>). Después de cada cambio hecho desde aquí, el overlay las vuelve a leer al momento. Si 7TV responde despacio, el overlay se queda con la última lista buena y lo reintenta en menos de un minuto.',
      'La pestaña está en el grupo «Escena y overlay» y entra también en el plan gratuito. Es solo para Twitch: con un canal en Kick lees «Solo en Twitch». Si también emites en Twitch, conecta esa cuenta y la pestaña se activa.',
    ] },
    { tabella: [
      ['Qué', 'Propietario del canal', 'Moderador'],
      ['Ver el set', 'sí', 'sí'],
      ['Conectar y desconectar 7TV', 'sí', 'no'],
      ['Añadir, subir, renombrar y quitar emotes', 'sí, con 7TV conectado', 'sí, cuando el propietario ya ha conectado 7TV'],
    ] },

    { h3: 'Tu cuenta 7TV' },
    { p: [
      'El set de emotes del canal pertenece a <strong>tu cuenta 7TV</strong>, y solo ella puede cambiarlo. Por eso hace falta su <em>token</em>, que pegas aquí una sola vez. No hay un botón para entrar con 7TV: el inicio de sesión de 7TV solo vuelve a 7tv.app y no entrega el token a otro sitio.',
      'El token se queda en el servidor y nunca vuelve al navegador. El bot solo lo usa con las direcciones oficiales de 7TV.',
    ] },
    { passi: [
      { t: 'Entra en 7TV', d: 'Ve a <a href="https://7tv.app">7tv.app</a> desde un ordenador e inicia sesión con Twitch: arriba a la derecha tiene que salir tu nombre. Sin sesión no hay token.' },
      { t: 'Abre las herramientas de desarrollo', d: 'Pulsa F12, o en Mac ⌘⌥I. En Chrome y Edge abre la pestaña «Application», en Firefox «Almacenamiento». Si no la ves, está detrás de las flechas » de arriba.' },
      { t: 'Copia el token', d: 'A la izquierda abre «Local storage» y elige https://7tv.app. En el filtro escribe 7tv-token y copia todo el valor, sin comillas.' },
      { t: 'Conecta', d: 'Pégalo en «Token de tu cuenta 7TV» y pulsa «Conectar 7TV».' },
    ] },
    { p: [
      'Los pasos también están en el panel, en «¿Cómo encuentro mi token de 7TV?». También sirve la pestaña «Red» (Network): en una petición a api.7tv.app es lo que sigue a «Bearer» en el encabezado «authorization». Si pegas también «Bearer» o las comillas, da igual: se quitan solos.',
      'Antes de conectarlo, el bot le pregunta a 7TV <strong>de quién es ese token</strong> y si puede cambiar el set de tu canal. Vale tu cuenta, o la de un editor de tu canal en 7TV. Si 7TV dice que no, el token no se guarda.',
      'Una vez conectado, la tarjeta muestra «7TV conectado» con tu nombre en 7TV y el botón «Desconectar». «Desconectar» pide confirmación y borra el token: desde aquí ya no cambias las emotes hasta que lo vuelvas a conectar.',
      'Un moderador lee «Solo el propietario del canal puede conectar o desconectar 7TV.» o, si 7TV aún no está conectado, «7TV aún no está conectado. Solo el propietario del canal puede conectarlo.»',
    ] },
    { tabella: [
      ['Mensaje', 'Qué hacer'],
      ['«Pega el token de tu cuenta 7TV.»', 'El campo está vacío.'],
      ['«El token no tiene la forma correcta, o ha caducado»', 'Has copiado un trozo equivocado, o el token ha caducado: vuelve a copiarlo desde 7tv.app.'],
      ['«7TV no reconoce este token: vuelve a entrar en 7tv.app y cópialo de nuevo»', 'La forma es correcta pero 7TV no lo acepta: suele ser de una sesión cerrada. Sal y vuelve a entrar en 7tv.app, y cópialo otra vez.'],
      ['«Este token es de la cuenta 7TV @…, que no puede cambiar las emotes de tu canal»', 'Copiaste el token mientras estabas en 7TV con otra cuenta. Entra con la tuya, o pide que te pongan entre los editores del canal en 7TV.'],
      ['«No encuentro tu cuenta 7TV: conecta antes 7TV a tu Twitch»', 'En 7tv.app tu cuenta no está vinculada al canal de Twitch: vincúlala allí y vuelve a intentarlo.'],
      ['«Tu canal de 7TV no tiene un set de emotes activo»', 'En 7tv.app activa un set de emotes para el canal y vuelve a intentarlo.'],
      ['«7TV no responde ahora: inténtalo dentro de un momento»', '7TV no ha respondido: el token no se ha guardado. Inténtalo dentro de poco.'],
    ] },

    { h3: 'Tus emotes' },
    { p: [
      'El set activo del canal, tal como lo ve el chat. Arriba están el nombre del set y cuántos huecos usas de los que tienes. Cada emote muestra la imagen y el nombre. Las animadas llevan la etiqueta «GIF».',
      'El set se puede ver también sin conectar 7TV. En ese caso el propietario lee «Estas son las emotes de tu canal (solo lectura).» y las emotes no tienen botones.',
      'Con 7TV conectado, cada emote tiene dos botones. El lápiz la <strong>renombra</strong> en tu canal: se abre «¿Cómo llamo a esta emote?», hasta 100 caracteres. La emote sigue siendo la de su autor, pero en tu canal se escribe como quieras. Cuando termina, lees «Emote renombrada ✓».',
      'La ✕ la <strong>quita</strong> del set, después de una confirmación: «Puedes volver a ponerla desde 7TV cuando quieras.» Cuando termina, lees «Emote quitada.»',
      'Con el set vacío lees «¡No hay emotes en el set. Añade algunas abajo!». Si 7TV no responde, lees «No puedo leer tu emote-set.»',
    ] },

    { h3: 'Añadir emotes' },
    { tabella: [
      ['Cómo', 'Cuándo sirve', 'Qué haces'],
      ['«Busca una emote…»', 'Quieres una emote que ya existe.', 'Escribe y pulsa «Buscar» o Intro. Llegan hasta 36 resultados del directorio público de 7TV, primero los más populares, cada uno con el nombre de su autor. «Añadir» debajo de un resultado la mete en el set con su nombre.'],
      ['«…o añade por enlace / ID»', 'La has visto en otro canal y quieres darle un alias.', 'Pega la dirección <code>https://7tv.app/emotes/…</code> o solo el ID. El alias es opcional, hasta 40 caracteres. Pulsa «Añadir».'],
      ['«Sube tu propia emote»', 'La emote no existe: la haces tú.', 'Mira la tarjeta de aquí abajo.'],
    ] },
    { p: [
      'Desde los resultados de la búsqueda la emote entra sin alias. Para añadirla con un alias, copia su enlace y usa «…o añade por enlace / ID», o renómbrala después.',
      'Cuando sale bien lees «Emote añadida ✓». Otros mensajes: «No se han encontrado emotes.», «Búsqueda no disponible ahora.», «Pega el enlace o el ID de una emote 7TV.», «No reconozco esta emote: pega el enlace o el id de 7TV», «Conecta antes tu cuenta 7TV.».',
    ] },

    { h3: 'Sube tu propia emote' },
    { p: ['Elige el archivo, escribe el nombre de la emote y, si quieres, el alias en tu canal. Pulsa «Subir a 7TV»: mientras trabaja, el botón dice «Convirtiendo y subiendo…». El bot convierte el archivo al formato que pide 7TV y lo añade enseguida al set.'] },
    { tabella: [
      ['Campo', 'Límites', 'Notas'],
      ['«Archivo (imagen / GIF / vídeo)»', 'hasta 60 MB', 'un archivo de audio no vale'],
      ['«nombre de la emote (sin espacios)»', 'de 2 a 60 caracteres; los espacios se quitan', 'el nombre con el que la emote nace en 7TV'],
      ['«alias en tu canal (opcional)»', '60 caracteres', 'cómo se escribe en tu canal; si está vacío, vale el nombre'],
    ] },
    { ul: [
      'Una imagen se convierte en una emote fija, en WebP.',
      'Los GIF y los vídeos se convierten en una emote animada en WebP, en bucle, con transparencia donde la había. Los GIF transparentes siguen transparentes.',
      'De un vídeo se guardan los <strong>primeros 6 segundos</strong>, sin audio.',
      'El lado más largo llega a 384 píxeles, a 20 fotogramas por segundo.',
      'La emote convertida tiene que pesar menos de <strong>7 MB</strong>, el límite de 7TV.',
    ] },
    { p: [
      'Si todo va bien lees «Emote subida y añadida a tu canal ✓». Si 7TV acepta la emote pero no la añade al set, por ejemplo porque el set está lleno o el alias ya está en uso, lees «Emote subida a 7TV ✓» y debajo una nota con el motivo. La emote se queda en tu cuenta 7TV y la añades cuando lo hayas arreglado.',
      'En 7TV las emotes solo las ve quien tiene su extensión.',
    ] },
    { tabella: [
      ['Mensaje', 'Qué hacer'],
      ['«Elige un archivo para subir.»', 'Falta el archivo.'],
      ['«Ponle un nombre a la emote (mín. 2 caracteres, sin espacios).»', 'Escribe un nombre de al menos dos caracteres.'],
      ['«una emote no puede ser un audio»', 'Elige una imagen, un GIF o un vídeo.'],
      ['«animación demasiado pesada: prueba con un vídeo más corto o más pequeño»', 'Recorta el vídeo o reduce su tamaño antes de subirlo.'],
      ['«imagen demasiado pesada incluso después de la conversión»', 'Usa una imagen más pequeña o con menos detalle.'],
      ['«archivo demasiado grande (máx. 60MB)»', 'El archivo pasa de 60 MB: acórtalo o hazlo más pequeño antes.'],
    ] },

    { h3: 'Cuando no funciona' },
    { ul: [
      '<strong>«7TV ya no acepta el token conectado: desconecta 7TV y vuelve a conectarlo con un token nuevo».</strong> El token de 7TV caduca, o lo han revocado. El propietario pulsa «Desconectar» y pega un token nuevo. Un moderador lee en cambio «7TV ya no acepta el token del canal: pide al propietario que vuelva a conectar 7TV».',
      '<strong>«7TV dice: …».</strong> Es 7TV quien ha rechazado el cambio, y el motivo es suyo, en inglés. Por ejemplo, cuando ya hay en el set una emote con el mismo nombre.',
      '<strong>«Emote añadida» quiere decir añadida de verdad.</strong> El panel lo dice solo cuando 7TV responde con el set en el que ha trabajado. Si 7TV no lo confirma, lees «7TV no ha hecho el cambio».',
      '<strong>Añado una emote y en el chat no se ve.</strong> Twitch y 7TV guardan su copia unos minutos. En el chat en pantalla del overlay se ve antes.',
      '<strong>El alias no se aplica.</strong> Un alias que ya usa otra emote del set no se puede repetir: dos emotes con el mismo nombre en el chat serían imposibles de distinguir.',
      '<strong>El set está lleno.</strong> Cuántos huecos tienes lo decide 7TV según tu nivel allí. Se libera espacio quitando una emote.',
      '<strong>No veo el lápiz ni la ✕.</strong> Solo aparecen con 7TV conectado: sin él, el set es de solo lectura.',
    ] },
  ],
  faq: [
    { d: '¿Hace falta una suscripción a 7TV?', r: 'Para conectar la cuenta, no. Cuántos huecos tiene tu set lo decide 7TV según tu nivel allí.' },
    { d: '¿Mi token de 7TV está seguro?', r: 'Se queda en el servidor, nunca pasa por el navegador, y el bot solo lo usa con las direcciones oficiales de 7TV. Desde 7tv.app puedes revocarlo cuando quieras.' },
    { d: 'Si quito una emote, ¿la pierdo?', r: 'No: sale de tu set, pero sigue en 7TV y puedes volver a ponerla.' },
    { d: '¿Puedo convertir un clip en emote?', r: 'Sí: subes el vídeo y lo convertimos nosotros. Se guardan los primeros 6 segundos, sin audio. Si pesa demasiado, acórtalo antes.' },
    { d: '¿Mis moderadores pueden gestionar las emotes?', r: 'Sí, cuando hayas conectado 7TV: añaden, suben, renombran y quitan. Conectar y desconectar 7TV sigue siendo cosa tuya.' },
    { d: '¿Las emotes se ven también en el overlay?', r: 'Sí: en el chat en pantalla, las del canal y las globales de 7TV; en el muro de emotes, las del canal.' },
  ],
};
