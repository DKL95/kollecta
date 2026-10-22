# KollectA

Red social + marketplace para fans del K-pop: compra, vende e intercambia merch oficial, presume tu colección, sigue a tus grupos favoritos y haz amigos con el mismo *bias*.

Proyecto integrador de **Programación Web II** — Facultad de Ciencias Físico Matemáticas, UANL (Lic. en Multimedia y Animación Digital).

## Equipo

| Nombre | Matrícula | Rol |
|---|---|---|
| Derek Alejandro Luna Hernandez | 1969757 | |
| [Nombre integrante 2] | [Matrícula] | |
| [Nombre integrante 3] | [Matrícula] | |
| [Nombre integrante 4] | [Matrícula] | |

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
| Marketplace, colección, mensajes, notificaciones | Pantallas en React con datos de ejemplo (`frontend/src/data/mockData.js`), pendiente su backend |

## Estructura de carpetas

```
WEB2/
├── server.js                 Punto de entrada del servidor Express (API + sirve el frontend compilado)
├── config/
│   └── db.js                 Conexión a MongoDB
├── models/                   Esquemas de Mongoose
│   ├── Usuario.js
│   ├── Publicacion.js
│   └── Imagen.js             Imágenes subidas (se guardan como binario en MongoDB)
├── controllers/              Lógica de cada endpoint
│   ├── authController.js
│   ├── usuarioController.js
│   ├── publicacionController.js
│   └── imagenController.js
├── routes/                   Definición de rutas de la API
│   ├── authRoutes.js
│   ├── usuarioRoutes.js
│   ├── publicacionRoutes.js
│   └── imagenRoutes.js
├── middleware/
│   ├── auth.js               Generación y verificación de JWT
│   └── upload.js             Subida de imágenes (Multer) y guardado en MongoDB
├── scripts/
│   └── migrarUploads.js      Migración única de fotos viejas de uploads/ a MongoDB
├── frontend/                 Aplicación React (Vite)
│   ├── index.html
│   ├── vite.config.js        Proxy de /api y /uploads hacia Express en desarrollo
│   ├── public/assets/img/    Fotos estáticas (grupos, colección, avatares)
│   └── src/
│       ├── main.jsx          Punto de entrada de React
│       ├── App.jsx           Rutas de todas las pantallas
│       ├── styles.css        Sistema de diseño compartido
│       ├── api/client.js     Cliente de la API (fetch + token)
│       ├── context/          Sesión del usuario (AuthContext)
│       ├── hooks/            Hooks reutilizables
│       ├── components/       Componentes compartidos (tarjetas, avatar, íconos, layout)
│       ├── pages/            Una página por pantalla
│       ├── data/mockData.js  Datos de ejemplo de secciones sin backend
│       └── utils/            Formato de dinero/fechas, categorías
├── docs/                     PDFs de diseño técnico, mockup y rúbrica del curso
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
| Mensajes | `/mensajes` | Conversaciones directas entre usuarios |
| Marketplace | `/marketplace` | Artículos en venta / intercambio con filtros por grupo |
| Detalle de artículo | `/marketplace/:productId` | Información de un artículo, contactar al vendedor o proponer intercambio |
| Vender / Intercambiar | `/vender` | Formulario para publicar un artículo con vista previa |
| Mi colección | `/coleccion` | Vitrina personal de merch coleccionado |
| Mi perfil | `/perfil` | Perfil propio: datos, editar perfil, publicaciones, grupos que sigue |
| Perfil de otro usuario | `/perfil/:username` | Perfil público de cualquier usuario |
| Grupos | `/grupos` | Explorar y seguir grupos de K-pop |
| Detalle de grupo | `/grupos/:groupName` | Info del grupo, merch disponible y publicaciones de la comunidad |

`/` redirige a `/inicio`. Todas las rutas excepto `/login` y `/registro` requieren sesión iniciada.

## Endpoints de la API

Todos bajo `/api`. Los marcados con 🔒 requieren el header `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registrar usuario (`multipart/form-data`, campo `fotoPerfil` opcional). Regresa `token` y `usuario` |
| POST | `/auth/login` | Iniciar sesión con `email` y `password`. Regresa `token` y `usuario` |
| GET 🔒 | `/auth/me` | Datos del usuario de la sesión |
| GET 🔒 | `/usuarios?q=texto` | Buscar usuarios por nombre o username |
| PUT 🔒 | `/usuarios/me` | Editar perfil propio (`nombre`, `descripcion`, `fotoPerfil`, `gruposFavoritos`) |
| GET 🔒 | `/usuarios/:username` | Perfil público de un usuario |
| GET 🔒 | `/usuarios/:username/publicaciones` | Publicaciones de un usuario |
| GET 🔒 | `/publicaciones?grupo=TWICE` | Listar publicaciones (filtro opcional por grupo) |
| POST 🔒 | `/publicaciones` | Crear publicación (`texto`, `grupo`, `imagen` opcional) |
| GET 🔒 | `/publicaciones/:id` | Obtener una publicación |
| PUT 🔒 | `/publicaciones/:id` | Editar publicación (solo el autor) |
| DELETE 🔒 | `/publicaciones/:id` | Eliminar publicación (solo el autor) |
| POST 🔒 | `/publicaciones/:id/like` | Dar o quitar like |
| GET | `/imagenes/:id` | Devuelve una imagen subida (pública, para usarla en `<img src>`) |

## Cómo ejecutar

Requisitos: Node.js 18 o superior.

1. Instalar dependencias (instala también las del frontend):
   ```bash
   npm install
   ```
2. Copiar `.env.example` como `.env` y poner la cadena de conexión de MongoDB Atlas y un `JWT_SECRET`.
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
