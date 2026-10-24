# La Rabia — larabia-magazine

[English](README.md) · **Español**

**La Rabia** es la revista comunitaria digital del distrito 02 de Bilbao (Uribarri). En marcha en **https://larabiamag.com** (API: **https://api.larabiamag.com**).

Nació dentro de [uribarri.online](https://github.com/Gandino1984/uribarri.online) y se separó para crecer como producto propio, con su back-end, su base de datos y sus cuentas.

## Índice

- [Qué hace](#qué-hace)
- [Tecnología](#tecnología)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Roles y permisos](#roles-y-permisos)
- [Cómo funcionan las piezas principales](#cómo-funcionan-las-piezas-principales)
- [Idiomas (i18n)](#idiomas-i18n)
- [Desarrollo en local](#desarrollo-en-local)
- [Tests](#tests)
- [Despliegue](#despliegue)
- [Base de datos y migraciones](#base-de-datos-y-migraciones)
- [Convenciones](#convenciones)
- [Créditos](#créditos)

## Qué hace

**Lectura**

- **Portada:** un hero con las historias destacadas (su título, entradilla y proyecto siguen el idioma elegido en la cabecera) y, debajo, avances de las secciones.
- **Secciones:** los botones de la barra superior (Artículos, Proyectos, Talleres, Más › Ficción, Internacional…). Cualquier artículo o proyecto puede aparecer también en otras secciones si un super admin lo aprueba.
- **Página de proyectos:** «Proyectos» en la barra superior abre la página con todos los proyectos publicados, del más nuevo al más antiguo, con buscador (título, descripción o autora/or, sin importar mayúsculas ni tildes); cada tarjeta muestra sus autoras/es y cuántas publicaciones tiene.
- **Las publicaciones** pueden pertenecer a un **proyecto** (una serie, un fanzine, un libro…) o ir sueltas. Cada una es de uno de estos tipos:
  - un **artículo** (texto, imágenes e incrustados, por bloques);
  - un **cómic** (lector horizontal con paneles que pueden ser imagen, enlace, audio, incrustado o paisaje sonoro; navegación panel a panel, progreso de lectura guardado y pantalla completa); en el creador, cada panel muestra el porcentaje de su imagen mientras se sube;
  - un **micro-perfil**;
  - un **paisaje sonoro** (un dibujo que se mueve con un sonido).
- **Autoras/es:** el directorio de perfiles, en orden alfabético y con buscador (por nombre o especialidad, sin importar mayúsculas ni tildes), y las publicaciones de cada persona. La foto de una autora o autor es la de su perfil (si no tiene, la de su cuenta) en todas partes: el directorio, el avatar junto a su nombre y su tarjeta.
- **Talleres:**
  - Las tarjetas son públicas.
  - **Compartir:** cualquiera, con cuenta o sin ella, copia el enlace de un taller desde su menú ⋯ («Compartir»), como con los artículos. El enlace abre la página del taller a quien tiene la sesión iniciada; sin sesión, muestra la tarjeta de ese taller en Talleres (con un borde dorado, en su pestaña, aunque ya haya pasado) y una nota para iniciar sesión, y la página se abre en cuanto la inicia.
  - Para abrir uno hay que iniciar sesión. Reservar plaza depende del taller, y se decide al crearlo o editarlo: los **gratuitos** están abiertos a cualquier persona con cuenta; los demás piden ser socio/a (el equipo no lo necesita). Las tarjetas dicen «Gratuito» o «Para socios/as», y hay un filtro «Acceso».
  - **Plazas extra:** cuando un taller está completo, un socio/a (de pago o de cortesía) puede pedir una plaza más, con un mensaje si quiere; y también cualquiera con cuenta si el taller es gratuito (sin cuenta, nunca). El botón «Pedir una plaza» está en la tarjeta del taller y en su página, y la tarjeta muestra cuántas solicitudes hay pendientes. Quien lo gestiona ve las solicitudes en la página del taller y en la campana: aceptar abre una plaza (aforo + 1) y se la da a esa persona; rechazar no. La persona recibe la respuesta en la campana (`workshop_spot_requests`).
  - Quien lo gestiona — los super admins y, como con las autoras/es de un artículo, quien lo creó o lo imparte desde el equipo (sus talleristas) — lo edita, invita (la invitación reserva plaza), quita participantes o los bloquea.
  - Cada taller tiene su ubicación en un mapa (Leaflet/OpenStreetMap). No hay enlace a Google Maps: la gente se ubica en el propio mapa.
- **Espacio abierto:** las propuestas literarias que publica la revista. Cualquier persona con cuenta (no hace falta ser socio/a) puede enviar la suya con un formulario y seguir allí su estado.
- **Galería** (Más › Barrio › Galería): las exposiciones de las y los artistas visuales del barrio, abiertas a todo el mundo. Cada una tiene un título, un texto breve y hasta 15 obras (una imagen, que se guarda en WebP; un título —«Sin título» si no lo tiene— y su tamaño en píxeles), y sale también en la fila Barrio de la portada.
  - **Artistas visuales:** un rol que un super admin concede por invitación, como a las autoras/es; se suma a lo que la persona ya sea. En «Mi galería» montan su exposición; cada obra nueva o cambiada la revisa un super admin antes de verse.
  - **Mensajes:** cualquiera con cuenta puede escribir a una o un artista desde su exposición. Cada pareja visitante ↔ artista es una conversación, que se guarda y se responde en el chat de la galería; la campana avisa a cada parte de los mensajes sin leer.
  - **Galerías preparadas en nombre de una o un artista:** un super admin puede «Crear una galería» (en la página de la Galería o en Admin › Galería: un nombre y un email, o «Crear su galería» en alguien ya invitado) y colgar las obras por ella o él, sin revisión. La persona recibe la invitación (email, y una ventana y la campana al iniciar sesión) avisando de que tiene una galería preparada. No se ve hasta que la acepta; entonces se publica y pasa a gestionarla. Si la rechaza, se borra con sus obras.
- **Interacción:** me gusta, favoritos, comentarios y seguir proyectos.
- **Avisos** en la campana de la cabecera: contenido nuevo, invitaciones, respuestas y hacerse socio/a.
- **Barra superior:** la campana va justo después de la foto de perfil; «Publica» (editoras/es en adelante) es lo último de la barra (en el móvil, un icono a la izquierda del menú). El selector de idioma es una pequeña píldora fuera de la barra, arriba a la izquierda (el botón rojo «Hazte socio/a» va debajo), así que se ve incluso donde la barra se oculta (un artículo); en el móvil está en el menú.
- **Formulario de contacto** y **newsletter** («Recomendaciones»):
  - Las cuentas nuevas (al entrar con Google por primera vez) la reciben; la página de inicio de sesión lo avisa. Cualquiera la activa o la quita desde «Recomendaciones».
  - Cada newsletter lleva un enlace «Darme de baja» de un clic que funciona sin iniciar sesión, y una cabecera `List-Unsubscribe` para el botón propio del programa de correo (un token aleatorio por persona, `user.newsletter_token`, que nunca llega al front-end).

**Tres idiomas:** castellano, inglés y euskera.

- Toda la interfaz, los mensajes del servidor y las fechas siguen el idioma de la cabecera.
- Los artículos y proyectos pueden llevar versión en inglés y en euskera de sus textos, y el lector del artículo tiene su propio selector ES · EN · EU.

Ver [Idiomas (i18n)](#idiomas-i18n).

**Publicar**

- **El creador** es un asistente de seis pasos: proyecto (nuevo, existente o ninguno) → clasificación, autoras/es y secciones → portada, título y entradilla → tipo → contenido → revisar y publicar.
- **Revisión:** todo es borrador hasta publicarse. Quien no es super admin envía su trabajo a revisión. Un super admin lo aprueba o lo devuelve con un motivo; la autora o autor puede volver a pasarlo a borrador.
- **El editor de talleres** funciona como el creador: una página completa con cuatro pasos (el taller → cuándo y dónde → portada y talleristas → revisar y guardar) y «Mis talleres», los que gestionas. Los crean admins y super admins; los editan también sus talleristas del equipo.
- **Editor de paisajes sonoros:** asistente de tres pasos (imagen y estilo → sonido y reproductor → encuadre y resumen), para artículos y para paneles de cómic.
- **Autoras invitadas:** un super admin puede dar de alta a una autora o autor que aún no tiene cuenta y publicar en su nombre. La persona acepta o rechaza al iniciar sesión por primera vez (ver más abajo).

**Administración** (*Admin*, super admins):

- usuarios y roles;
- la cola de revisión (artículos, proyectos y cambios de sección);
- la **portada**: el orden de las historias destacadas del hero (flechas o arrastrando), quitar una, añadir cualquier historia publicada (`magazine_articles.featured_order`). El hero muestra solo las destacadas; las más gustadas que no lo están aparecen como sugerencias, para destacarlas con un clic;
- las propuestas enviadas desde Espacio abierto (leerlas, aceptarlas o descartarlas, descargar el archivo, responder por email);
- datos de la revista (nombre, eslogan, logos);
- talleres;
- apariencia (temas, colores, animaciones);
- el **constructor del menú** de la barra superior (etiquetas en ES / EN / EU, quién ve cada botón y qué abre).

**Hazte socio/a:** las lectoras y lectores se hacen socios/as de pago con **Stripe** (mensual y anual). La interfaz dice «socio/a» («Hazte socio/a», la insignia «Socio/a»); el código y las tablas lo siguen llamando *subscription*.

- Los socios/as reciben una insignia y pueden reservar plaza en los talleres.
- La función queda apagada hasta configurar las variables `STRIPE_*`.
- **Todavía no es pública:** mientras `MEMBERSHIP_PUBLIC` no sea `true` (`.env` del servidor), solo admins y super admins ven «Hazte socio/a» y pueden pagar, para probarlo. El resto no ve el botón, los talleres para socios/as solo avisan de que lo son, y el servidor no deja iniciar un pago (`not_open`). Para abrirlo, ponla a `true` y reinicia el back-end.
- Un super admin puede hacer a alguien **socio/a de cortesía** en Admin › Usuarios: cuenta como socio/a (misma insignia, talleres) sin pasar por Stripe. Es la columna `complimentary` de `reader_subscriptions`, que la sincronización con Stripe nunca escribe.

## Tecnología

- **Back-end:** Node.js 22+ · Express 4 · Sequelize 6 · MySQL 8 · Sharp (imágenes → WebP) · ffmpeg (audio → AAC con volumen normalizado) · Nodemailer · google-auth-library · Stripe
- **Front-end:** React 18 · Vite 6 · i18next (es / en / eu) · react-quill · Leaflet · @react-spring/web · Vitest
- **Infraestructura:** Docker Compose (db, back-end, front-end) · nginx-proxy externo + compañero de Let's Encrypt

## Estructura del repositorio

```
back-end/
  index.js        App de Express: estáticos, CORS, middleware de idioma, rutas, columnas que se añaden al arrancar
  config/         Sequelize + entorno (los orígenes CORS salen de FRONTEND_URL)
  models/         Modelos de Sequelize (21 tablas)
  controllers/    Una carpeta por área: user (incluye author_invitation_controller y google_oauth_controller),
                  magazine_article, magazine_project, article_blocks, author_profile, magazine_workshop,
                  engagement, subscription, paisaje, magazine_metadata, magazine_theme, magazine_nav, contact
  routers/        Rutas de Express (api_router las monta todas)
  middleware/     Subidas (portadas, bloques, perfiles, logos, fondos)
  services/       emailService.js (verificación, restablecer, bienvenida, contacto, newsletter, invitación de autoría)
  utils/          authHelper (roles), sections, translations, conversión/validación de imágenes, limpieza
  i18n/           messages.js (los mensajes del servidor en en/eu) + translateResponses.js (middleware)
  migrations/     Migraciones SQL numeradas (ver su README)
  uploads/        Subidas en tiempo de ejecución (fuera de git, volumen en producción)

front-end/
  src/app_context/  Contextos de React: Auth, UI, Magazine, Author, AuthorInvitation, Workshop, Engagement,
                    Subscription, Notification, PendingReview, Metadata, Theme, Nav (+ navConfig, themePresets)
  src/components/   layout, magazine (portada, listas, lector, visor de cómic), admin (creador, bloques, editor de cómic,
                    pestañas de Admin), authors, workshops, maps, google-auth, notifications, user, common
  src/paisaje/      El motor de paisajes sonoros (traído tal cual, no se toca) + integration/ (código de la revista); ver su README
  src/utils/        contentLang (versiones del contenido), locale (fechas), sections, articleFilters, projectKinds…
  src/i18n/         Configuración de i18next + locales/{es,en,eu}.json (claves planas con puntos)
  nginx/            Configuración de nginx de producción + keep-assets.sh (conserva los trozos JS de versiones anteriores)

Dockerfile            Imagen del back-end (incluye ffmpeg)
front-end/Dockerfile  Dos etapas: vite build → nginx
docker-compose.yml    db, back-end, front-end
.env.example          Cópialo a .env y rellénalo
```

## Roles y permisos

Los roles son marcas independientes en `user`; una cuenta puede tener varias.

| Rol | Puede |
|---|---|
| Lector/a (por defecto) | Leer, dar me gusta, comentar, seguir proyectos, hacerse socio/a, reservar talleres (siendo socio/a) |
| Lector/a premium (`is_premium_reader`) | Además, leer los artículos marcados como premium |
| Editor/a (`is_editor`) | Crear publicaciones y perfiles de autoría; todo pasa por revisión. Editar los talleres que imparte |
| Admin (`is_admin`) | Como editor/a, más crear talleres y las recomendaciones de la newsletter |
| Super admin (`is_super_admin`) | Todo; publica directamente; revisa lo de los demás; panel de Admin; invita autoras/es y artistas |
| Artista visual (`is_artist`, combinable con cualquier rol) | Su exposición en la Galería y sus mensajes — nada más |

- `canCreateContent` = editor/a, admin o super admin. `canPublishDirectly` = solo super admin.
- **Solo lo propio:** fuera de las super admins, cada persona cambia solo lo suyo: los artículos y proyectos que firma (y sus bloques, portadas…), su perfil de autora/or y su foto, su cuenta y su exposición. Crear exige ser del equipo de la revista y firmarlo (las super admins publican en nombre de otras personas). Lo comprueba el servidor (`requireOwnerOrSuperAdmin` / `requireCreator` en `utils/authHelper.js`, la autoría en `utils/ownership.js`); los roles solo cambian con `/user/grant-role`. La web envía `x-user-id` en cada escritura (`utils/axiosConfig.js`) y solo muestra «Editar» donde se puede; por ejemplo, «Editar proyecto» en el menú ⋯ de la página de un proyecto, que abre su formulario en el creador y vuelve.
- El servidor comprueba el rol en cada petición: lee la cabecera `x-user-id` y busca al usuario (`back-end/utils/authHelper.js`).
- Cuando se niega el acceso, el servidor responde 403 con un `code`, nunca 401: con un 401 la web cierra la sesión.
- Los emails de `SUPER_ADMIN_EMAILS` pasan a ser super admins al iniciar sesión.

## Cómo funcionan las piezas principales

**Inicio de sesión:** solo con Google (Google Identity Services). Si se entra con un email que ya tiene una cuenta sin contraseña, Google se vincula a esa cuenta.

**Revisión:**

- Lo de quien no es super admin pasa de `draft` a `pending_approval` (enviar a revisión), y de ahí a `published` (aprobar) o de vuelta a `draft` con un motivo (devolver).
- Los super admins lo gestionan en Admin › Pendientes. El contador de la cabecera muestra lo que espera, también las propuestas de Espacio abierto sin leer.

**Secciones** (`back-end/utils/sections.js`, `front-end/src/utils/sections.js`):

- La lista de secciones sale del menú: los botones de tipo «categoría de artículos», más Espacio abierto y Micro-perfiles.
- Cada publicación guarda sus secciones *aprobadas* y las *pedidas* (columnas JSON). Un super admin resuelve las peticiones.

**Autoras invitadas** (`back-end/controllers/user/author_invitation_controller.js`):

1. En «Autoras/es», un super admin pone nombre y email. El servidor crea una cuenta de Google sin contraseña (o invita a la cuenta de lectora que ya exista) y manda la invitación por email.
2. Mientras la persona no responde, los super admins pueden escribir su perfil y acreditarla. Si un super admin es el único autor y la añade, publica en su nombre.
3. Al iniciar sesión por primera vez, la persona ve la invitación (un modal y un aviso en la campana):
   - **Aceptar** → pasa a editora.
   - **Rechazar** → sigue como lectora, su perfil se oculta y lo que nadie más firma pasa a firmarse «La Rabia».
   - Si un super admin ya la hizo editora → no tiene nada que responder: al entrar la invitación cuenta como aceptada (su email dice «inicia sesión», no «acepta»).
4. El email de invitación (en español y en inglés, uno detrás del otro; HTML + texto plano; las respuestas van a `CONTACT_EMAIL`) guarda cuándo salió (`user.author_invite_email_sent_at`). El editor del perfil dice cuándo se envió, o que no consta como enviado, con «Enviar email». En «Autoras/es», los super admins ven las invitaciones pendientes que no constan como enviadas — también de quien ya hicieron editora y aún no ha entrado — y las envían todas con un botón (`GET /user/invite-author/unsent`, `POST /user/invite-author/send-unsent`).

**Galería** (`back-end/controllers/gallery/`, `front-end/src/components/gallery/`, migración `027`):

- Tablas: `gallery_exhibitions` (una por artista: título, texto), `gallery_works` (imagen en `uploads/gallery/` en WebP a su tamaño, título, `width_px` × `height_px` leídos del archivo tras aplicar su giro EXIF, posición, `status_work` pending → approved / rejected con motivo), `gallery_conversations` (artista ↔ visitante, la última lectura de cada parte) y `gallery_messages`.
- Público: `GET /gallery` (exposiciones con al menos una obra aprobada) y `GET /gallery/exhibition/:id` (solo obras aprobadas).
- Artistas: `GET|PATCH /gallery/mine`, `POST /gallery/mine/works` (multipart, ≤ 20 MB, como mucho 15), `PATCH|DELETE /gallery/mine/works/:id` (cualquier cambio devuelve la obra a revisión), `PATCH /gallery/mine/order`.
- Super admins: `GET /gallery/review?status=`, `POST /gallery/review/:id` {approve | reject, motivo}, `GET /gallery/review/count` (en el aviso de Admin); invitaciones en `POST /gallery/invite`, `GET /gallery/invitations`, `POST /gallery/invitations/:id/resend`, `POST /gallery/invitations/send-unsent` (email bilingüe, envío guardado en `user.artist_invite_email_sent_at`). La persona invitada responde con `GET /gallery/invitation` + `POST /gallery/invitation/respond`.
- Galerías preparadas en nombre de alguien (migración `028`, `gallery_exhibitions.prepared_by`): `POST /gallery/invite` con `gallery: true`, o `POST /gallery/for/:userId` para alguien ya invitado, la crea y le envía el email; luego `GET|PATCH /gallery/for/:userId`, `PATCH /gallery/for/:userId/order` y `POST|PATCH|DELETE /gallery/for/:userId/works[/:id]` usan los mismos controladores que la artista, para esa persona (solo super admins, mientras la invitación está pendiente; las obras quedan aprobadas). No sale en público hasta que la persona es artista. Al aceptar, `prepared_by` pasa a NULL (es suya); al rechazar, se borra con sus imágenes.
- Mensajes (con sesión): `POST /gallery/exhibition/:id/messages`, `GET /gallery/conversations`, `GET /gallery/conversations/:id` (la marca leída), `POST /gallery/conversations/:id/messages`; ≤ 2.000 caracteres, como mucho 60 por hora. `GET /gallery/feed` alimenta la campana (conversaciones sin leer, las revisiones de la o el artista, obras pendientes).

**Propuestas de Espacio abierto** (`back-end/controllers/open_space/`, `front-end/src/components/openmic/`):

- `POST /open-space/proposals` (multipart), para cualquier persona que haya iniciado sesión. Lleva un título, el tipo de texto, una explicación breve (≤ 600 caracteres) y el texto: pegado (≤ 50.000 caracteres), en un archivo (PDF, DOC, DOCX, ODT, TXT o RTF, ≤ 5 MB) o las dos cosas.
- Como mucho 5 propuestas por persona en 24 horas. Cada una manda un email al equipo (`CONTACT_EMAIL`).
- Los archivos se guardan en `uploads/proposals/` con nombres aleatorios y **no son públicos**. `index.js` responde 404 a esa carpeta antes de la ruta de estáticos. Quien la envió y los super admins descargan el archivo con `GET /open-space/proposals/:id/file`.
- Estado: `new` → `read` (cuando un super admin la abre en Admin › Propuestas) → `accepted` / `declined`. Quien la envió lo ve en la sección y puede retirar la propuesta.

**Contenido en otros idiomas** (`back-end/utils/translations.js`, `front-end/src/utils/contentLang.js`):

- El original es en castellano. Las versiones en inglés y en euskera van en columnas JSON: `translations_article` (título, entradilla), `translations_block` (texto, pie de foto, texto alternativo) y `translations_project` (título, descripción).
- En el creador, el selector «Idioma en el que escribes» elige qué versión se escribe.
- Cada lectora ve la versión de su idioma, o el original si no la hay.

**Paisajes sonoros** (`front-end/src/paisaje/`):

- El motor es de Cristian Vergara y **no se modifica**; el código de la revista va en `integration/`.
- La imagen se procesa en el navegador. El servidor solo guarda el dibujo y normaliza el audio con ffmpeg.
- Todo el audio de la revista, cómics incluidos, pasa por esta cadena (cualquier tamaño, se guarda en AAC).

**Trozos JS antiguos:** cada versión del front-end cambia el nombre de sus trozos. nginx sirve `/assets/` de la versión actual y, si no lo encuentra, de un volumen que guarda las versiones anteriores 30 días, para que las pestañas abiertas antes de un despliegue sigan funcionando.

## Idiomas (i18n)

La interfaz está traducida entera al **castellano, inglés y euskera**, en tres capas:

1. **Interfaz:**
   - Todo texto visible pasa por `t('clave', 'texto por defecto en castellano')`. Las claves están en `front-end/src/i18n/locales/{es,en,eu}.json` (claves planas con puntos; los plurales con `_one` / `_other`).
   - Contextos y utilidades usan `i18n.t` de `src/i18n/config`.
   - Las etiquetas del menú se guardan con `es` / `en` / `eu` y se editan en Admin › Menú.
2. **Mensajes del servidor:**
   - La web manda el idioma de la cabecera como `Accept-Language`.
   - `back-end/i18n/translateResponses.js` traduce los textos `error`, `success` y `message` de cada respuesta JSON con `back-end/i18n/messages.js`.
   - El código sigue escribiendo los mensajes en castellano. Un mensaje nuevo necesita su entrada ahí (texto exacto, o patrón si lleva valores).
3. **Contenido:** las versiones de artículos y proyectos descritas arriba.

**Las fechas** pasan por `front-end/src/utils/locale.js` (`localDate`). Chrome no trae fechas en euskera (su `Intl` recurre al castellano), así que ahí el euskera se escribe a mano («2026ko urriaren 19a»).

**Sin traducir:** los textos de la propia interfaz del motor de paisajes sonoros (el motor se mantiene como se entregó) y el contenido propio de la revista en la base de datos (nombre, eslogan, biografías).

## Desarrollo en local

```bash
# 1. Dependencias (una vez)
npm install                      # raíz del repositorio: mueve el back-end
cd front-end && npm install

# 2. MySQL (lo más fácil, con Docker)
docker compose up -d db

# 3. Back-end (desde la raíz): nodemon sobre back-end/index.js
npm run dev

# 4. Front-end: Vite en localhost:5174, con proxy a VITE_API_URL (por defecto localhost:3000)
cd front-end && npm run dev
```

- El back-end necesita `ffmpeg` instalado para procesar audio.
- Sin las variables `EMAIL_*` no se envían emails; el resto funciona.

## Tests

- `cd front-end && npm test` ejecuta la suite del motor de paisajes sonoros (Vitest, 277 tests). Tienen que quedar en verde.
- El resto de funciones se probaron de punta a punta con Puppeteer contra un MySQL desechable. Esos scripts no forman parte del repositorio.

## Despliegue

Producción está en un VPS: **https://larabiamag.com** (+ `www.`) y **https://api.larabiamag.com**.

- La web está detrás de un nginx-proxy externo con su compañero de Let's Encrypt, en la red Docker compartida `nginx-proxy`.
- El enrutado y los certificados salen de `VIRTUAL_HOST` / `LETSENCRYPT_HOST` de cada servicio (desde `.env`).

### Primera puesta en marcha

1. Clona el repositorio en el VPS (por ejemplo, `~/larabia`).
2. Copia `.env.example` a `.env` y rellénalo. Los valores por defecto apuntan a `larabiamag.com` / `api.larabiamag.com`.
3. Arranca: `docker compose up -d --build`. El primer arranque de la base de datos ejecuta `back-end/migrations/001_init_schema.sql`.
4. Mira cómo se emiten los certificados: `docker logs -f nginx-proxy-le | grep larabiamag`.
5. Comprueba `https://larabiamag.com` y `https://api.larabiamag.com/health`.

### Despliegue habitual

```bash
cd ~/larabia && git pull origin main \
  && docker compose build --no-cache back-end front-end \
  && docker compose up -d back-end front-end \
  && docker image prune -f && docker builder prune -f
```

- **Reconstruye solo lo que cambió.** `VITE_API_URL` y `VITE_GOOGLE_CLIENT_ID` se fijan en el front-end al compilar.
- **Limpia tras cada compilación:** cada `--no-cache` deja la imagen vieja (~1,4 GB la del back-end).
- **Haz backup de la base de datos antes de un despliegue que cambie el esquema:**
  ```bash
  docker exec larabia_db sh -c 'mysqldump --single-transaction -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
    | gzip > ~/larabia-backups/db-$(date +%F).sql.gz
  ```

### Primer super admin

Pon tu email en `SUPER_ADMIN_EMAILS` antes de iniciar sesión por primera vez. Se promociona solo en cada inicio de sesión.

### Cambiar de dominio

1. Apunta los registros DNS **A** (`nuevodominio.com`, `www.nuevodominio.com`, `api.nuevodominio.com`) al VPS.
2. Cambia `FRONT_VIRTUAL_HOST`, `API_VIRTUAL_HOST`, `FRONTEND_URL` y `VITE_API_URL` en `.env`.
3. Reconstruye con `docker compose build --no-cache front-end && docker compose up -d`.
4. Añade los nuevos orígenes al cliente OAuth de Google («Authorized JavaScript origins»).

Los orígenes CORS salen de `FRONTEND_URL`, que añade la variante `www.`.

## Base de datos y migraciones

El esquema está en `back-end/migrations/` ([README](back-end/migrations/README.md) · [ES](back-end/migrations/README.es.md)).

- `001` lo crea todo en una base vacía; los archivos numerados siguientes son incrementales.
- Desde la `012`, el back-end también añade al arrancar las columnas nuevas que falten (`back-end/index.js`), así que un despliegue no depende de aplicarlas a mano.
- Varias tablas se crean al arrancar con `sync()` si no existen (interacción, suscripciones, bloqueos e invitaciones de talleres).

## Convenciones

- **Todo texto visible en los tres idiomas, en el mismo cambio** (claves de la interfaz; `messages.js` para los mensajes del servidor).
- **Mayúsculas solo en botones de verdad.** Insignias, avisos y textos pulsables mantienen su caja (`text-transform: none`).
- **Primero el móvil:** comprueba cada pantalla a 390 px de ancho además de en escritorio.
- **Motor de paisajes sonoros:** no se tocan `src/paisaje/converter`, `styles`, `wizard` ni la lógica del reproductor; el código de la revista va en `integration/`.
- **Peticiones autenticadas:** pasan `headers: { 'x-user-id': currentUser.id_user }` explícitamente.

## Créditos

- **Paisaje sonoro** (el motor de paisajes sonoros): **Cristian Vergara**, 2026. Integrado con su permiso ([origen](https://github.com/zuriai-org/paisaje-sonoro-public)).
- Mapas © colaboradores de OpenStreetMap.

## Licencia

ISC — ver [LICENSE](LICENSE) (pendiente de añadir).
