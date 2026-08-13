# KollectA

Red social + marketplace para fans del K-pop: compra, vende e intercambia merch oficial, presume tu colección, sigue a tus grupos favoritos y haz amigos con el mismo *bias*.

Proyecto integrador de **Programación Web II** — Facultad de Ciencias Físico Matemáticas, UANL (Lic. en Multimedia y Animación Digital).

## Equipo

| Nombre | Matrícula | Rol |
|---|---|---|
| Derek Alejandro Luna Hernandez| [1969757 | |
| [Nombre integrante 2] | [Matrícula] | |
| [Nombre integrante 3] | [Matrícula] | |
| [Nombre integrante 4] | [Matrícula] | |

## Descripción de la aplicación

KollectA combina dos cosas que la comunidad K-pop ya hace todo el tiempo por separado (grupos de Facebook, chats de WhatsApp, Carousell/Mercado Libre) en una sola plataforma:

- **Marketplace de merch**: comprar, vender o intercambiar photocards, álbumes, lightsticks, ropa oficial y accesorios.
- **Vitrina de colección**: cada usuario arma y presume su colección personal en su perfil.
- **Seguimiento de grupos**: seguir grupos de K-pop para ver su merch y actividad de la comunidad relacionada.
- **Red social**: feed de publicaciones, likes, comentarios, mensajería directa y sistema de amigos/seguidores.

## Estado actual del proyecto

Esta entrega corresponde al **maquetado (mockup) navegable** de la aplicación: pantallas en HTML, CSS y JavaScript puro, con datos de ejemplo (`frontend/js/data.js`) para poder visualizar el flujo completo sin backend todavía. El Front End real (conectado a un Back End con base de datos) se desarrollará en las siguientes entregas del semestre.

## Estructura de carpetas

```
WEB2/
├── frontend/               Maquetado navegable (HTML + CSS + JS, sin backend aún)
│   ├── index.html          Login
│   ├── register.html       Registro de usuario
│   ├── home.html           Feed social (inicio)
│   ├── marketplace.html    Explorar merch (comprar / intercambiar)
│   ├── product.html        Detalle de un artículo del marketplace
│   ├── sell.html           Publicar un artículo (venta o intercambio)
│   ├── collection.html     Mi colección personal
│   ├── profile.html        Perfil de usuario
│   ├── groups.html         Explorar / seguir grupos de K-pop
│   ├── group-detail.html   Detalle de un grupo (merch, fans, feed)
│   ├── messages.html       Mensajes directos (chats)
│   ├── cart.html           Carrito de compras
│   ├── notifications.html  Notificaciones
│   ├── search.html         Búsqueda global
│   ├── css/styles.css      Sistema de diseño compartido (colores, componentes)
│   └── js/
│       ├── data.js         Datos de ejemplo (usuarios, grupos, productos, posts)
│       ├── nav.js          Sidebar / topbar / nav inferior + guard de sesión
│       └── app.js          Lógica de interacción de cada pantalla
├── docs/                   PDFs de diseño técnico, mockup y entregables del curso
└── FE-PW2-052-CIOO-AD2026.pdf   Rúbrica de evaluación del curso
```

## Pantallas y rutas

| Pantalla | Ruta | Descripción |
|---|---|---|
| Login | `frontend/index.html` | Inicio de sesión |
| Registro | `frontend/register.html` | Alta de nuevo usuario |
| Inicio (feed) | `frontend/home.html` | Publicaciones de la comunidad, sugerencias de grupos y amigos |
| Marketplace | `frontend/marketplace.html` | Explorar artículos en venta / intercambio, con filtros por grupo |
| Detalle de artículo | `frontend/product.html?id=<id>` | Información completa de un artículo, comprar o proponer intercambio |
| Vender / Intercambiar | `frontend/sell.html` | Formulario para publicar un artículo nuevo |
| Mi colección | `frontend/collection.html` | Vitrina personal de merch coleccionado |
| Perfil | `frontend/profile.html` | Perfil del usuario con estadísticas y colección |
| Grupos | `frontend/groups.html` | Explorar y seguir grupos de K-pop |
| Detalle de grupo | `frontend/group-detail.html?group=<nombre>` | Info del grupo, merch disponible, fans |
| Mensajes | `frontend/messages.html` | Conversaciones directas entre usuarios |
| Carrito | `frontend/cart.html` | Resumen de compra antes de pagar |
| Notificaciones | `frontend/notifications.html` | Likes, intercambios, seguidores, pedidos |
| Búsqueda | `frontend/search.html` | Búsqueda combinada de merch, grupos y personas |

## Cómo ejecutar el mockup

No requiere instalación ni backend. Dos opciones:

1. **Abrir directo en el navegador**: doble clic en `frontend/index.html`.
2. **Con un servidor local** (recomendado para que las rutas con `?query` funcionen igual que en producción), por ejemplo con la extensión *Live Server* de VS Code, o:
   ```bash
   cd frontend
   npx serve .
   ```

El login/registro es simulado: cualquier correo y contraseña te dejan entrar (guarda una bandera en `localStorage`).

## Flujo de trabajo en Git

- `main`: rama estable, solo recibe merges de `dev` ya revisados.
- `dev`: rama de integración del equipo, punto de partida para nuevas ramas de feature (`feature/nombre-corto`).

```bash
git clone <url-del-repo>
cd WEB2
git checkout dev
git checkout -b feature/mi-cambio
# ... trabajar, commitear ...
git push origin feature/mi-cambio
# abrir Pull Request hacia dev
```

## Próximas entregas

- Diseño técnico de base de datos (mínimo 6 tablas) + descripción de endpoints.
- Servicio Back End con ORM, autenticación por token y endpoints CRUD por tabla.
- Conexión del Front End al Back End vía JSON.
- Sección de reportes con al menos 4 consultas.
