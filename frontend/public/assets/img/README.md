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
| `groups/` | Foto de cada grupo (`src/data/catalogo.js` → `GROUPS`, campo `img`) | `bts.jpg`, `blackpink.jpg`, `twice.jpg`, `stray-kids.jpg`, … |
| `products/`, `collection/`, `covers/`, `avatars/`, `banners/`, `posts/` | Ya no se usan: productos, piezas de colección, fotos de perfil y de publicaciones las suben los usuarios y se guardan en MongoDB (colección `imagenes`) | — |

Formato recomendado: `.jpg` o `.png`, cuadrado (1:1). Si agregas un grupo en
`src/data/catalogo.js`, ponle `img: "/assets/img/groups/<archivo>"` y guarda la
foto con ese mismo nombre en `groups/`. Si la foto no existe, el grupo se ve con
sus iniciales sobre su degradado.
