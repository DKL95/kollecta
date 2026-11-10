# Fotos reales del mockup

Esta app **no trae fotos oficiales de grupos, álbumes ni merch** — no tenemos
derechos sobre ese material y no corresponde subirlo a un repositorio público
de GitHub. En su lugar, cada tarjeta muestra un emoji + degradado como
marcador de posición.

El código ya está listo para mostrar fotos reales automáticamente en cuanto
las agregues: cada tarjeta intenta cargar una imagen desde esta carpeta, y si
no la encuentra, se queda con el emoji (sin errores, sin tocar código).

## Qué foto usar

Usa únicamente imágenes de las que tengas derecho de uso: fotos que tú tomes
de tu propia colección, diseños originales del equipo, o material con
licencia libre (CC0 / Unsplash / Pexels, etc.). Evita subir fotos oficiales
de agencias, portadas de álbum o fotos promocionales de los idols — aunque
las encuentres reposteadas en Pinterest/Instagram, no dejan de tener dueño.

Esto aplica también a `avatars/`: usa tu propia foto o un dibujo/avatar
tuyo, no la foto de un idol real como si fuera tu foto de perfil.

## Convención de nombres

| Carpeta | Corresponde a | Nombre de archivo |
|---|---|---|
| `products/` | Cada artículo del marketplace (`src/data/mockData.js` → `PRODUCTS`) | `p1.jpg`, `p2.jpg`, … `p12.jpg` (según el `id` del producto) |
| `groups/` | Avatar de cada grupo (`src/data/mockData.js` → `GROUPS`) | `bts.jpg`, `blackpink.jpg`, `twice.jpg`, `stray-kids.jpg`, `seventeen.jpg`, `newjeans.jpg`, `aespa.jpg`, `ateez.jpg`, `itzy.jpg`, `txt.jpg` |
| `covers/` | Banner grande de la pantalla `/grupos/:groupName` (opcional, formato ancho) | mismo nombre que en `groups/`, ej. `bts.jpg` |
| `collection/` | Piezas de "Mi colección" (`src/data/mockData.js` → `MY_COLLECTION`) | `1.jpg` … `8.jpg` |
| `avatars/`, `banners/`, `posts/` | Ya no se usan: las fotos de perfil y de publicaciones ahora las suben los usuarios y se guardan en `uploads/` | — |

Formato recomendado: `.jpg` o `.png`, cuadrado (1:1) para `products/` y
`collection/`, panorámico (ancho) para `covers/`. Si agregas más productos o
grupos en `mockData.js`, añade el campo `img: "/assets/img/<carpeta>/<archivo>"`
al objeto correspondiente y coloca el archivo con ese mismo nombre aquí.

## Ejemplo

```js
// src/data/mockData.js
{ id: "p1", title: "Photocard Jimin — 'Face' PC Album", /* ... */, img: "/assets/img/products/p1.jpg" }
```

Basta con guardar tu foto como `frontend/public/assets/img/products/p1.jpg` — no
hay que editar código para que aparezca.
