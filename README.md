# KollectA

Red social + marketplace para fans del K-pop: compra, vende e intercambia merch oficial, presume tu colección, sigue a tus grupos favoritos y haz amigos con el mismo *bias*.

Proyecto integrador de **Programación Web II** — Facultad de Ciencias Físico Matemáticas, UANL (Lic. en Multimedia y Animación Digital).

## Equipo

| Nombre | Matrícula | Rol |
|---|---|---|
| Derek Alejandro Luna Hernandez | 1969757 | |
| Jesús Antonio González Leal | 2072116 | |
| Javier Peña Reyes | 2109195 | |
| Tania Jazmín Herrera Cavazos | 1938779 | |

## Descripción de la aplicación

KollectA combina dos cosas que la comunidad K-pop ya hace todo el tiempo por separado (grupos de Facebook, chats de WhatsApp, Carousell/Mercado Libre) en una sola plataforma:

- **Marketplace de merch**: vender o intercambiar photocards, álbumes, lightsticks, ropa oficial y accesorios (el trato se cierra por mensaje con el vendedor).
- **Vitrina de colección**: cada usuario arma y presume su colección personal en su perfil.
- **Seguimiento de grupos**: seguir grupos de K-pop para ver su merch y las publicaciones de la comunidad.
- **Red social**: feed de publicaciones, likes, mensajería directa y perfiles de usuario.

## Tecnologías

- **Front End**: React 18 + React Router 6 (Vite).
- **Back End**: Node.js + Express 5.
- **Base de datos**: MongoDB (Atlas) con Mongoose.
- **Autenticación**: JWT (token en el header `Authorization: Bearer <token>`), contraseñas cifradas con bcrypt.
- **Imágenes**: Multer recibe las fotos de perfil y de publicaciones y se guardan **dentro de MongoDB** (colección `imagenes`), así todo el equipo las ve y no se pierden al subir la app a un hosting.

## Estado actual

| Módulo | Estado |
|---|---|
| Registro / login | Conectado a la base de datos (JWT + bcrypt) |
| Feed de publicaciones (crear, eliminar, like, filtrar por grupo) | Conectado a la base de datos |
| Perfil (ver, editar, publicaciones del usuario) | Conectado a la base de datos |
| Seguir grupos | Conectado (se guarda en `gruposFavoritos` del usuario) |
| Búsqueda de personas | Conectado a la base de datos |
| Colección, mensajes (directos y grupales), notificaciones | Conectado a la base de datos |
| Marketplace y compra-venta / intercambio (fase 1: el pago se acuerda entre las personas) | Conectado a la base de datos (colecciones `productos` y `ordenes`, aparte de la colección personal) |
| Roles usuario / moderador / administrador, denuncias, disputas, moderación y reportes | Conectado a la base de datos (`middleware/roles.js`, `/api/admin`, `/api/moderacion`, `/api/reportes`) |
| Catálogo de grupos K-pop y solicitudes de grupos nuevos | Conectado (colección `grupos`): los 13 grupos fijos de `data/gruposBase.js` se guardan en la base la primera vez que se piden, más los que pide la comunidad. Un usuario solicita un grupo y queda pendiente; un moderador o administrador lo aprueba o rechaza (con motivo) en Moderación → Grupos, lo agrega directo y **edita cualquier grupo** (datos, logo y portada; al renombrarlo se actualizan publicaciones, merch, colecciones y seguidores) |
| Banner del perfil | Conectado (`usuarios.banner`): color, textura, logo de un grupo o imagen propia, con vista previa |

## Estructura de carpetas

```
WEB2/
├── server.js                 Punto de entrada: conecta a MongoDB, Socket.IO (chat en tiempo real) y abre el puerto
├── app.js                    Configuración de Express (rutas de la API, errores, frontend compilado); las pruebas la usan sin abrir puerto
├── data/gruposBase.js        Los 13 grupos fijos de la app (se guardan en la colección grupos para poder editarlos)
├── config/
│   ├── db.js                 Conexión a MongoDB con Mongoose
│   └── logger.js             Bitácora con winston (logs/app.log y logs/error.log)
├── models/                   Esquemas de Mongoose: una colección por archivo (15) + subesquemas (gif.js, oculto.js)
├── controllers/              Lógica de cada endpoint (validaciones, consultas, respuestas JSON)
├── routes/                   Rutas de la API: método + URL + middlewares → función del controlador
├── middleware/
│   ├── auth.js               JWT de sesión, cookie de imágenes y permisos temporales de video
│   ├── roles.js              requiereRol(): usuario, moderador, administrador
│   ├── upload.js             Subida de imágenes y videos (Multer) y guardado en MongoDB
│   └── registrarOperacion.js Inicio/fin de operaciones importantes en la bitácora
├── services/
│   ├── moderacion.js         Sanciones, bitácora de moderación y avisos
│   ├── videoStorage.js       Videos en GridFS (modelo ArchivoVideo para sus datos)
│   └── gifs.js               Búsqueda en GIPHY desde el servidor (la llave no llega al navegador)
├── scripts/
│   ├── crear-base.mongodb.js Script de creación de la base para mongosh (equivalente al script SQL)
│   ├── generarCrearBase.js   Genera el script anterior a partir de models/
│   ├── documento/            Genera el PDF técnico (base de datos, endpoints y manual)
│   ├── demo/                 Siembra y limpia las cuentas de demostración
│   ├── asignarRol.js         Da rol de moderador/administrador desde la terminal
│   └── migrarUploads.js      Migración única de fotos viejas de uploads/ a MongoDB
├── tests/                    Pruebas automáticas de la API y del frontend (node:test)
├── frontend/                 Aplicación React (Vite)
│   ├── index.html
│   ├── vite.config.js        Proxy de /api y /uploads hacia Express en desarrollo
│   ├── public/               Íconos, manifest y service worker (app instalable), fotos estáticas
│   └── src/
│       ├── main.jsx          Punto de entrada de React
│       ├── App.jsx           Rutas de todas las pantallas
│       ├── styles.css        Sistema de diseño compartido (claro/oscuro, adaptable a teléfono)
│       ├── api/              Cliente de la API (fetch + token) y conexión de Socket.IO
│       ├── context/          Sesión del usuario (AuthContext)
│       ├── hooks/            Hooks reutilizables (catálogo de grupos, contadores, grupos seguidos, instalar app)
│       ├── components/       Componentes compartidos (tarjetas, diálogos, selectores de emoji/GIF, layout)
│       ├── pages/            Una página por pantalla
│       ├── data/catalogo.js  Categorías de merch
│       └── utils/            Formato de dinero/fechas, categorías, roles, emojis
├── docs/                     PDF técnico, manual de usuario con capturas y rúbrica del curso
├── INTEGRANTES.txt           Nombres, matrículas y enlace al repositorio
├── app-android/              App de Android (APK) con Capacitor
├── render.yaml               Despliegue en Render
├── .env.example              Variables de entorno necesarias
└── package.json              Scripts para correr todo el proyecto
```

**Convención de nombres**: componentes y páginas de React en `PascalCase` (`HomePage.jsx`, `PostCard.jsx`), funciones y variables en `camelCase`. El backend usa nombres en español (`crearPublicacion`, `usuarioController`).

## Pantallas y rutas

| Pantalla | Ruta | Descripción |
|---|---|---|
| Login | `/login` | Inicio de sesión |
| Registro | `/registro` | Alta de nuevo usuario con foto de perfil y grupo favorito |
| Inicio (feed) | `/inicio` | Publicar, ver y dar like a publicaciones; filtrar por grupo |
| Buscar | `/buscar?q=<texto>` | Búsqueda de merch, grupos y personas |
| Notificaciones | `/notificaciones` | Likes, intercambios, seguidores |
| Mensajes | `/mensajes` | Conversaciones directas y chats grupales |
| Marketplace | `/marketplace` | Artículos en venta / intercambio con filtros por grupo |
| Detalle de producto | `/marketplace/:productId` | Producto del marketplace; comprar o proponer intercambio; el dueño lo retira o lo vuelve a publicar |
| Pieza de colección | `/articulo/:id` | Pieza de la vitrina personal (no se vende); el dueño puede publicar un anuncio con sus datos |
| Mis órdenes | `/ordenes` | Mis compras y mis ventas, filtradas por estado |
| Detalle de orden | `/ordenes/:id` | Línea de tiempo, acciones según el rol (aceptar, enviar, recibir, completar), chat y calificación |
| Vender / Intercambiar | `/vender` | Publicar un producto en el marketplace; "Añadir artículo de la colección" copia los datos y fotos de una pieza (la colección no cambia) |
| Agregar a mi colección | `/coleccion/agregar` | Guardar una pieza en la colección; queda fuera de la venta |
| Mi colección | `/coleccion` | Vitrina personal de merch coleccionado |
| Mi perfil | `/perfil` | Perfil propio: datos, editar perfil, personalizar banner, publicaciones, grupos que sigue (con logo) |
| Perfil de otro usuario | `/perfil/:username` | Perfil público de cualquier usuario |
| Grupos | `/grupos` | Explorar y seguir grupos de K-pop; solicitar uno nuevo y ver mis solicitudes (`?vista=solicitudes`) |
| Detalle de grupo | `/grupos/:groupName` | Info del grupo, merch disponible y publicaciones de la comunidad; moderación: editar grupo |
| Detalle de publicación | `/publicaciones/:id` | Una publicación con sus comentarios y respuestas (se abre desde el feed o una notificación) |
| Reportes | `/reportes` | 12 reportes estadísticos; cada rol ve los que le corresponden |
| Moderación | `/moderacion` | Solo moderadores y administradores: denuncias, disputas, solicitudes de grupos, sanciones, usuarios y bitácora |
| Página no encontrada | cualquier otra ruta | Aviso con enlace de regreso al inicio |

`/` redirige a `/inicio`. Todas las rutas excepto `/login` y `/registro` requieren sesión iniciada.

## Endpoints de la API

Todos bajo `/api`, en JSON. **Todos exigen token** (`Authorization: Bearer <token>`) excepto `POST /auth/register` y `POST /auth/login`. El catálogo completo (método, acceso, entrada y respuesta de cada uno) está en [`docs/KollectA-documento-tecnico.pdf`](docs/KollectA-documento-tecnico.pdf).

| Recurso | Base | Operaciones |
|---|---|---|
| Autenticación | `/auth` | registro, login, sesión actual, cerrar sesión |
| Usuarios y amistades | `/usuarios` | buscar, ver perfil, editar el propio, solicitudes de amistad (enviar, aceptar, rechazar, cancelar), quitar amigo |
| Publicaciones | `/publicaciones` | CRUD con imágenes, videos y GIF; likes; comentarios y respuestas (CRUD + likes) |
| Colección | `/coleccion` | CRUD de piezas de la vitrina personal |
| Marketplace | `/productos` | CRUD de anuncios (retirar / volver a publicar) |
| Órdenes | `/ordenes` | crear, ver, cambiar estado, retirar, calificar, disputas |
| Mensajes | `/mensajes` | conversaciones directas y grupales; enviar, **editar y borrar** mensajes propios |
| Notificaciones | `/notificaciones` | listar, marcar leídas, **borrar** |
| Grupos | `/grupos` | catálogo; solicitar, ver y cancelar mis solicitudes; aprobar, rechazar y editar (moderador+) |
| Denuncias y moderación | `/denuncias`, `/moderacion`, `/admin` | denunciar, atender, sancionar, bitácora, roles y baneos |
| Reportes | `/reportes` | 12 reportes que cruzan varias colecciones |
| Archivos | `/imagenes`, `/videos` | imágenes guardadas en MongoDB; videos en GridFS con URL temporal |
| GIFs | `/gifs` | búsqueda en GIPHY a través del servidor |

**Imágenes y videos**: las etiquetas `<img>` y `<video>` no pueden mandar el header `Authorization`. Por eso, al iniciar sesión el servidor deja una cookie `httpOnly` con un token de solo lectura que únicamente abre `/api/imagenes/:id` (no sirve como sesión para el resto de la API), y los videos se piden con una URL firmada que vence en 3 minutos.

## Manual de usuario

[`docs/manual/MANUAL-usuario.md`](docs/manual/MANUAL-usuario.md): una sección por pantalla, con capturas numeradas, roles, flujo de órdenes y disputas, reportes y moderación.

## Instalar como app (PWA)

KollectA se puede instalar en el celular o la computadora desde el navegador: `frontend/public/manifest.webmanifest` (nombre, colores e íconos en `frontend/public/icons/`) y un service worker (`frontend/public/sw.js`) que guarda la app para abrirla rápido. El service worker **nunca** guarda respuestas de `/api`, así que los datos siempre vienen del servidor. Solo se registra en la versión compilada (`npm run build`), no con `npm run dev`. El botón **Instalar app** aparece cuando el navegador lo permite (Chrome, Edge, Android); en iPhone se indica cómo hacerlo desde Safari.

## App de Android (APK)

En [`app-android/`](app-android/README.md) está la app nativa para Android hecha con Capacitor: abre la versión publicada de KollectA en un WebView, con su propio ícono y pantalla de inicio. Para compilarla: `cd app-android && npm install && npm run apk`.

## Datos de demostración

Para enseñar la app con movimiento real (publicaciones, compras, ventas, reseñas, una disputa y una denuncia) hay un script que lo crea **a través de la API**, como lo haría una persona. Todo queda marcado como demo: el nombre dice "· Demo" y el correo es `@demo.kollecta`. Las imágenes son dibujos originales que genera `scripts/demo/dibujos.js` (no usa fotos de terceros).

```bash
DEMO_URL=https://kollecta.onrender.com npm run sembrar-demo    # o http://localhost:3000
npm run limpiar-demo                    # muestra qué se borraría (usa MONGODB_URI del .env)
npm run limpiar-demo -- --confirmar     # borra todas las cuentas demo y lo que crearon
```

Las contraseñas de las cuentas demo quedan en `scripts/demo/.cuentas-demo.json`, que Git ignora. Si un nombre de usuario ya existe, el script usa otra variante.

## Documento técnico (PDF)

[`docs/KollectA-documento-tecnico.pdf`](docs/KollectA-documento-tecnico.pdf): arquitectura, pantallas y rutas, diseño de la base de datos (diagrama entidad-relación y diccionario de datos), descripción de los 85 endpoints, reportes, seguridad, sistema de diseño y el manual de usuario con capturas.

Casi todo se genera desde el código (modelos, `App.jsx`, `routes/`, reportes y el manual). Para regenerarlo, con Edge o Chrome instalados:

```bash
npm run documento
```

Si agregas o cambias una ruta, documéntala en `scripts/documento/endpoints.js`: el generador y `tests/documento.test.js` fallan si el catálogo no coincide con `routes/*.js`.

## Cómo ejecutar

Requisitos: Node.js 18 o superior.

1. Instalar dependencias (instala también las del frontend):
   ```bash
   npm install
   ```
2. Copiar `.env.example` como `.env` y poner la cadena de conexión de MongoDB Atlas y un `JWT_SECRET`.
   - Opcional: `GIPHY_API_KEY` (gratis en https://developers.giphy.com) para el buscador de GIFs de publicaciones, comentarios y chat. Sin ella todo funciona, pero el botón **GIF** avisa que no está configurado. En Render se agrega en *Environment*.
3. **Desarrollo** (backend en :3000 + frontend con recarga en caliente en :5173):
   ```bash
   npm run dev
   ```
   Abrir http://localhost:5173
4. **Producción / demo** (Express sirve el frontend compilado):
   ```bash
   npm run build
   npm start
   ```
   Abrir http://localhost:3000

### Pruebas automáticas

Agrega `MONGODB_URI_TEST` a tu `.env` (puede ser la misma URI de Atlas: las pruebas usan bases separadas `kpop_test_*` que se borran solas y nunca tocan `kpop`) y corre:

```bash
npm test
```

Cubre registro, login, JWT, perfil, búsqueda, publicaciones (CRUD, likes y permisos), imágenes y videos protegidos, mensajes y notificaciones, colección, marketplace y órdenes, disputas, roles y moderación, reportes, logs, el script de la base y las utilidades del frontend. Requiere Node 21 o superior.

Para comprobar además que el script de la base acepta todo lo que guarda la app, corre las pruebas con `CON_ESQUEMA=1`: cada base de prueba se crea con `scripts/crear-base.mongodb.js` (validadores `$jsonSchema` activos).

### Archivo de logs

El backend escribe su bitácora con [winston](https://github.com/winstonjs/winston) en la carpeta `logs/` (ignorada por Git):

| Archivo | Contenido |
|---|---|
| `logs/app.log` | Todo desde el nivel `LOG_LEVEL` (por defecto `info`), una línea JSON por evento |
| `logs/error.log` | Solo errores, con ruta, usuario y stack |

- Se registran el **inicio y el fin** de las operaciones importantes: registro, login, crear, editar y borrar publicaciones (con imágenes y videos), comentar, crear o editar grupos, publicar productos, órdenes (crear, cambiar estado, calificar, disputas), denuncias y acciones de moderación. El fin incluye el código HTTP, el usuario y la duración en ms. Nunca se guarda el cuerpo de la petición (puede traer contraseñas).
- El middleware de errores de `app.js` manda cada excepción al log con método, ruta, usuario y stack.
- Variables opcionales: `LOG_LEVEL` (`error`, `warn`, `info`, `http`, `debug`) y `LOG_DIR`.
- Cada archivo rota al llegar a 5 MB (se guardan 5). En Render los archivos se borran al reiniciar el servicio.

Para agregar el registro a una ruta nueva: `router.post("/", registrarOperacion("nombre de la operación"), controlador)` (`middleware/registrarOperacion.js`).

### Script de creación de la base (mongosh)

`scripts/crear-base.mongodb.js` es el equivalente del script SQL de creación de tablas: crea las 15 colecciones con su validador `$jsonSchema` (tipos, campos obligatorios, enums y límites) y sus índices, incluidos los únicos.

```bash
mongosh "<MONGODB_URI>" scripts/crear-base.mongodb.js          # base "kpop"
BASE=otra_base mongosh "<MONGODB_URI>" scripts/crear-base.mongodb.js
```

Se puede correr varias veces: si una colección ya existe, solo actualiza su validador. El archivo **se genera** a partir de `models/` y no se edita a mano. Si cambias un modelo, regenéralo así (la prueba `tests/esquema.test.js` falla si se quedó desactualizado):

```bash
npm run generar-base
```

### Fotos subidas antes de guardarlas en MongoDB

Las primeras fotos de perfil se guardaron en la carpeta `uploads/` de la computadora de quien las subió (por eso los demás no las veían). Quien tenga esos archivos debe correr **una vez**, con su `.env` apuntando a Atlas:

```bash
npm run migrar-uploads
```

Sube esas fotos a MongoDB y actualiza las rutas en la base de datos. Se puede correr varias veces sin duplicar nada.

### Fotos reales

El marketplace, los grupos y la colección muestran un ícono + degradado si no existe la foto. Para agregar fotos ver [`frontend/public/assets/img/README.md`](frontend/public/assets/img/README.md).

## Flujo de trabajo en Git

- `main`: rama estable, solo recibe merges de `dev` ya revisados.
- `dev`: rama de integración del equipo, punto de partida para nuevas ramas de feature (`feature/nombre-corto`).

```bash
git clone <url-del-repo>
cd kollecta
git checkout dev
npm install
git checkout -b feature/mi-cambio
# ... trabajar, commitear ...
git push origin feature/mi-cambio
# abrir Pull Request hacia dev
```
