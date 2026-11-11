# Plan — Revisión final y KollectA 2027

Basado en la rúbrica (`docs/FE-PW2-052-CIOO-AD2026.pdf`), en el estado del repo
al 10 de noviembre de 2026 y en lo que platicamos: compra-venta funcional,
anuncios + suscripción tipo Discord Nitro, y que la app siga viva el próximo año.

---

## 1. Dónde estamos contra la rúbrica final

La entrega final vale **50 % de la calificación práctica**. Los puntos marcados
"REQ: Sí" son obligatorios: si falta uno, el proyecto no se puede acreditar.

| Requisito (pág. 4-6 y 10 del PDF) | Estado | Qué falta |
|---|---|---|
| Al menos 6 colecciones con buen diseño | ✅ 10 colecciones | Nada; agregar `ordenes` las vuelve 11 |
| Todo el acceso a BD por ORM | ✅ Mongoose | — |
| El front solo habla con el back | ✅ | — |
| **Sección "Reportes" con ≥ 4 consultas multi-tabla** | ❌ **No existe** | Pantalla + endpoints (ver §2.1) |
| Endpoints create/update/delete/get por colección | ⚠️ Parcial | Ver tabla de §2.3 |
| Validaciones en back end independientes del front | ✅ En casi todo | Revisar `coleccionRoutes.js` |
| **Excepciones e inicio/fin de procesos críticos en archivo de logs** | ❌ **No existe** (solo `console.log`) | Ver §2.2 |
| Pantallas por acción HTTP por colección | ⚠️ Parcial | Justificar las que no aplican (§2.3) |
| Comunicación por JSON | ✅ | — |
| Login obligatorio; solo registro fuera | ✅ | — |
| Token en todos los endpoints salvo login/registro | ⚠️ | `GET /api/imagenes/:id` es público (las `<img>` no mandan token). Justificarlo o usar URL firmada como ya hacen los videos |
| Diseño con patrones MaterialUI "o equivalentes" | ⚠️ | Tenemos design system propio: documentarlo en el PDF como el equivalente (tokens, componentes) |
| **Script de SQL de creación de tablas** | ❌ | Usamos MongoDB: acordar con el profesor un **script de mongosh** con `createCollection` + `$jsonSchema` + índices (§2.4) |
| PDF: BD + endpoints + **manual de usuario con capturas** | ❌ Pendiente | §2.5 |
| README con instrucciones de ejecución | ✅ Revisar que esté al día | — |
| Hosting público (opcional, 10 pts) | ✅ https://kollecta.onrender.com | — |
| Uso real de Git por los 4 | ⚠️ | Commits de **cada** integrante en ramas propias + PRs a `dev` |
| Front ↔ Back ↔ BD sin errores (20 pts) | ⚠️ | Marketplace, Grupos y Búsqueda todavía leen `mockData.js` |

### Datos de prueba que siguen en el frontend

`frontend/src/data/mockData.js` todavía alimenta pantallas reales. El profesor
lo puede ver como "front no conectado al back":

- `MarketplacePage.jsx` y `ProductDetailPage.jsx` → `PRODUCTS` (artículos falsos).
- `SearchPage.jsx` → `GROUPS`, `PRODUCTS`.
- `ProfilePage.jsx` → `MY_COLLECTION`.
- `HomePage.jsx` → `FRIENDS`.
- `GROUPS` (catálogo de grupos K-pop) puede quedarse como catálogo fijo, pero
  conviene moverlo a una colección `grupos` (también sirve para las comunidades del §5).

---

## 2. Pendientes obligatorios para la revisión final (en orden)

### 2.1 Reportes (obligatorio)

Una pantalla `/reportes` con al menos 4 consultas que crucen colecciones
(`$lookup` en agregaciones de Mongoose). Propuesta, que además sirve al negocio:

1. **Ventas e intercambios por grupo K-pop**: `ordenes` ⨝ `colecciones` → total y monto por grupo.
2. **Top vendedores**: `ordenes` ⨝ `usuarios` → ventas completadas, monto, calificación.
3. **Actividad de la comunidad por mes**: `publicaciones` + `comentarios` + `mensajes` por mes.
4. **Artículos más buscados sin oferta**: categorías con más publicaciones "busco…" contra artículos disponibles (indicador para decidir qué promover).
5. (Extra) **Embudo de órdenes**: cuántas pasan de pendiente → aceptada → completada.

Endpoint: `GET /api/reportes/:nombre`, con token. Las gráficas pueden ir con una
librería ligera (Recharts) para que se vea profesional.

### 2.2 Archivo de logs (obligatorio)

- Agregar `winston` (o un logger propio con `fs.appendFile`) que escriba en `logs/app.log`.
  `logs/` ya está en `.gitignore`.
- Registrar **inicio y fin** de: registro, login, crear/editar/borrar publicación,
  subir video, crear orden y cambio de estado, crear grupo.
- El middleware de errores de `app.js` debe mandar cada excepción al log con ruta, usuario y stack.
- Reemplazar los `console.log`/`console.error` de los controladores por el logger.
- En Render los archivos se borran al reiniciar: para la demo basta, y en 2027 se puede mandar a un servicio de logs.

### 2.3 CRUD por colección

| Colección | C | R | U | D | Nota |
|---|---|---|---|---|---|
| usuarios | ✅ registro | ✅ | ✅ `/me` | ⚠️ no hay "borrar cuenta" | Agregar desactivación (`activo: false`) |
| publicaciones | ✅ | ✅ | ✅ | ✅ | — |
| comentarios / respuestas | ✅ | ✅ | ✅ | ✅ | — |
| colecciones (artículos) | ✅ | ✅ | ✅ | ✅ | Pasar la lógica de `coleccionRoutes.js` a un controlador (código limpio) |
| conversaciones | ✅ | ✅ | ✅ grupos | ✅ ocultar / salir | Chats grupales ya agregados |
| mensajes | ✅ | ✅ | ❌ editar | ❌ borrar | Agregar editar/borrar mensaje propio |
| notificaciones | sistema | ✅ | ✅ leída | ❌ | Justificar "C" (las crea el sistema); agregar borrar |
| solicitudes de amistad | ✅ | ✅ | ✅ | ✅ | — |
| imágenes | interno | ✅ | — | interno | Justificar: se manejan dentro de publicaciones |
| **ordenes (nueva)** | | | | | §3 |

### 2.4 "Script de SQL" en MongoDB

Proponer al profesor `scripts/crear-base.mongodb.js` (ejecutable con `mongosh`) con
`db.createCollection(nombre, { validator: { $jsonSchema: … } })` por colección más sus
índices y relaciones documentadas. Es el equivalente directo de un script DDL.
**Confirmarlo con él antes de la entrega.**

### 2.5 PDF final

Diseño de BD (diagrama actualizado con `ordenes` y grupos), tabla de endpoints
(método, ruta, auth, body, respuesta) y **manual de usuario**: una sección por
pantalla, con captura y flechas o indicaciones. Las capturas se pueden sacar de
https://kollecta.onrender.com.

### 2.6 Pruebas automáticas

- Hoy nadie las puede correr: piden `MONGODB_URI_TEST`, que no está en los `.env`.
  Propuesta: agregar `mongodb-memory-server` como devDependency para que
  `npm test` levante un MongoDB temporal en la propia computadora, sin tocar Atlas.
- Al correrlas así (10 nov): pasan auth (18/18), chats grupales (9/9) y
  usuarios (16/17). Fallan 4 de publicaciones y la búsqueda de usuarios, **igual
  que antes de los cambios de esta ronda**: están desactualizadas respecto al código.
- `--test-concurrency=1` evita que los archivos choquen entre sí.

### 2.7 Reparto sugerido

- **Persona A**: Reportes (back + pantalla) y logs.
- **Persona B**: Compra-venta (§3) en el back: modelo `Orden`, endpoints, notificaciones.
- **Persona C**: Compra-venta en el front: Marketplace con datos reales, detalle, "Mis órdenes".
- **Persona D**: PDF (BD, endpoints, manual), script de mongosh, quitar `mockData` y CRUD faltantes.

Cada quien en su rama `feature/...`, con PR a `dev` y commits chicos (15 pts de Git).

---

## 3. Sistema de compra-venta

### Fase 1: para la revisión final (sin cobrar dinero en la app)

El dinero se acuerda entre las personas (transferencia, efectivo en un punto de
entrega) y la app registra y da seguimiento a la operación. Es realista para la
entrega y no requiere darse de alta como negocio.

**Modelo `Orden`** (colección `ordenes`):

```
comprador        → Usuario
vendedor         → Usuario
articulo         → { coleccion, articuloId, titulo, imagen, grupo }   (copia, por si lo borran)
tipo             → "compra" | "intercambio"
precio           → Number (MXN, solo compra)
ofrecido         → [articuloId]  (solo intercambio: lo que ofrece el comprador)
entrega          → "envio" | "en_persona"
estado           → pendiente → aceptada → enviada → recibida → completada
                   (o rechazada / cancelada)
historial        → [{ estado, fecha, por }]
conversacion     → Conversacion (chat abierto automáticamente)
calificacion     → { estrellas 1-5, comentario }  (la deja el comprador al completar)
```

En el artículo de colección agregar `precio` (distinto de `valorEstimado`) y
`reservado` (para que no lo compren dos personas a la vez).

**Endpoints**:

- `POST /api/ordenes`: crear (valida que el artículo esté disponible, no sea tuyo y no esté reservado).
- `GET /api/ordenes?rol=comprador|vendedor&estado=`: mis compras / mis ventas.
- `GET /api/ordenes/:id`: detalle (solo comprador o vendedor).
- `PATCH /api/ordenes/:id/estado`: transición válida según quién la pide (el vendedor acepta o envía, el comprador confirma la recepción).
- `POST /api/ordenes/:id/calificacion`.
- `DELETE /api/ordenes/:id`: cancelar mientras siga pendiente.

**Reglas**: al aceptar, el artículo queda `reservado`. Al completar, el artículo
sale de la colección del vendedor y, si fue intercambio, también los ofrecidos;
opcionalmente se copian a la colección del comprador. Cada cambio de estado genera
una notificación (ya existe la colección `notificaciones`) y un mensaje automático en el chat.

**Pantallas**:

- Marketplace con artículos reales: `GET /api/coleccion/marketplace` (artículos con
  `disponibleCompra` o `disponibleIntercambio`, sin reservar), con filtros por grupo,
  categoría, precio y tipo.
- Detalle del artículo con botones **Comprar** / **Proponer intercambio**.
- **Mis órdenes**: pestañas Compras / Ventas, con línea de tiempo del estado.
- Calificación del vendedor en su perfil (promedio y número de ventas).

### Fase 2: 2027, pagos dentro de la app

- **Compra protegida**: el comprador paga en la app y el dinero se libera al
  vendedor cuando confirma que recibió el artículo. Se hace con un proveedor que
  maneje marketplaces y pagos divididos: **Mercado Pago** (muy usado en México,
  acepta OXXO) o **Stripe Connect**. Antes de elegir, revisar las comisiones
  vigentes y los requisitos de cada uno.
- Guías de envío integradas (Envia.com, Skydropx o similar).
- Disputas: botón "tengo un problema" que congela el pago y abre un caso para moderación.
- Verificación de vendedores (INE o teléfono) para vender por arriba de cierto monto.

---

## 4. Monetización

Tres fuentes que se complementan. Los precios son una propuesta inicial para
validar con usuarios reales; ajústenlos con datos.

### 4.1 Suscripción "KollectA Plus" (tipo Discord Nitro)

Personalización y estatus, nunca funciones básicas detrás de un pago: comprar,
vender, chatear y publicar siguen gratis.

| Beneficio | Gratis | Plus |
|---|---|---|
| Anuncios | Sí | **Sin anuncios** |
| Perfil | Estándar | **Banner animado, color de nombre, marco de avatar, tema de color de la app** |
| Insignia | — | **Insignia Plus + "fan desde"** con el grupo bias |
| Vitrina de colección | 1 diseño | **Diseños premium, fondos y stickers de fandom** |
| Subidas | 10 fotos, video ≤ 100 MB | 20 fotos, video más largo y en alta calidad |
| Chats grupales | Hasta 50 | Hasta 200 + ícono y color del grupo |
| Marketplace | Comisión estándar | **Comisión reducida** + 1 "destacar artículo" al mes |
| Reacciones | Básicas | **Emojis y stickers de fandom** |

Precio sugerido para probar: **$59 MXN/mes o $549 MXN/año**, con 7 días de prueba.

**Implementación**: colección `suscripciones` (usuario, plan, estado, periodo,
id del proveedor), cobro recurrente con Stripe Billing o suscripciones de Mercado
Pago, y un webhook que active o desactive `usuario.plus`. Los cosméticos se guardan
en `usuario.personalizacion` y el front los aplica con variables CSS (ya usamos tokens).

### 4.2 Anuncios

- Formato nativo: una tarjeta "Patrocinado" cada ~8 publicaciones en el feed y un
  banner en el Marketplace. **Nunca dentro de los chats.**
- Primero **venta directa a tiendas de K-pop** (tiendas de álbumes y merch en
  México, eventos y fan cafés): pagan más que una red de anuncios y encajan con la comunidad.
- Después, una red de anuncios (Google AdSense) cuando haya tráfico. Requiere
  dominio propio, política de privacidad y aviso de cookies.
- **Cuidado con los menores de edad**: buena parte del fandom tiene menos de 18
  años. Pedir la fecha de nacimiento en el registro, no mostrar anuncios
  personalizados a menores y limitar el marketplace a mayores de edad o con
  permiso del tutor.

### 4.3 Comisión del marketplace

- Fase 1 (gratis): sin comisión, para atraer vendedores.
- Fase 2 (compra protegida): comisión pequeña por venta pagada en la app (5 % sugerido; 3 % con Plus).
- **Destacar artículo**: pago único ($15–29 MXN) para aparecer arriba 7 días.

### 4.4 Requisitos antes de cobrar (no son opcionales)

- Alta en el SAT de quien cobre (persona física con actividad empresarial o una
  empresa) y emisión de facturas. **Consultar con un contador.**
- Términos y condiciones, aviso de privacidad (LFPDPPP) y política de reembolsos.
- Moderación: reportar publicaciones, usuarios y artículos falsos (las photocards falsas son un problema real).
- Pasar Render al plan de pago para que no se duerma, comprar un dominio y respaldar la BD de Atlas.

---

## 5. Roadmap 2027

| Trimestre | Meta |
|---|---|
| Ene–Mar | Lanzamiento beta cerrado con fandoms locales (Monterrey). Marketplace fase 1, reportes, moderación básica, dominio propio, Render de pago. Medir usuarios activos y operaciones por semana. |
| Abr–Jun | KollectA Plus (cosméticos + sin anuncios). Comunidades por grupo K-pop creadas por usuarios. Anuncios directos de 2-3 tiendas aliadas. App instalable (PWA). |
| Jul–Sep | Compra protegida con pagos integrados y guías de envío. Verificación de vendedores. Calificaciones visibles. |
| Oct–Dic | Notificaciones push, eventos (fan meetings, preventas), red de anuncios si el tráfico lo justifica. Evaluar app nativa. |

**Indicadores a seguir desde el día 1** (los reportes del §2.1 ya los cubren):
usuarios activos semanales, operaciones completadas, porcentaje de órdenes
canceladas, conversión gratis → Plus, y retención a 30 días.

---

## 6. Ya hecho en esta ronda (rama local `dev`, sin subir)

- **Chats grupales**: crear grupo (nombre + mínimo 2 personas), renombrar,
  agregar y quitar personas (solo admins), salir del grupo, nombre del
  remitente en cada burbuja, no leídos por persona y "leído" cuando todos lo
  leyeron. Endpoints nuevos:
  - `POST /api/mensajes/grupos`
  - `PATCH /api/mensajes/grupos/:id`
  - `POST /api/mensajes/grupos/:id/participantes`
  - `DELETE /api/mensajes/grupos/:id/participantes/:usuarioId` (también sirve para salir)
- **Imágenes de publicaciones**: una sola foto ahora se ve completa, sin cortar
  caras; las galerías de 2 a 4 fotos se adaptan al ancho; en teléfono una foto
  sola ya no sale a media pantalla. Se quitaron ~2 KB de reglas CSS que se contradecían.

## 7. Ronda del 11 de noviembre (rama local `dev`, sin subir)

- **Compra-venta fase 1 (§3) iniciada y funcionando**: modelo `Orden` (colección `ordenes`),
  campos `precio` y `reservadoPor` en los artículos, endpoints de `/api/ordenes`,
  `GET /api/coleccion/marketplace`, mensaje automático en el chat y notificación en cada
  cambio, traspaso de artículos al completar, calificación y reputación del vendedor.
  Marketplace, Buscar y Detalle de grupo ya leen datos reales; nuevas pantallas
  "Mis órdenes" y "Detalle de orden". Falta: mostrar la reputación en el perfil.
- **Colección primero, venta después**: "Agregar pieza" (`/coleccion/agregar`) guarda la pieza
  sin ponerla a la venta. En "Vender", el botón "Añadir artículo de la colección" pasa los
  datos y fotos de una pieza al formulario y, al publicar, pone **esa misma pieza** a la venta
  (no se duplica). En el detalle, el dueño tiene "Poner a la venta" / "Quitar de la venta";
  quitarla cierra las solicitudes pendientes y avisa a los compradores. Vender exige precio > 0.
- **Roles**: base en `middleware/roles.js` y `/api/admin`; plan completo en `docs/PLAN-roles.md`.
- **Arreglos**: botón "+ Grupo" visible en escritorio, menú ⋮ del chat se cierra solo y
  tiene íconos, una sola petición de notificaciones por página, categorías de "Vender"
  alineadas con el backend ("Ropa" y "Accesorio" hacían fallar la publicación).
