# Plan — Roles: Usuario, Moderador y Administrador

Estado al 11 de noviembre de 2026. Complementa `PLAN-revision-final.md`
(§4.4 pide moderación antes de cobrar, y la compra-venta del §3 necesita a
alguien que resuelva problemas entre personas).

---

## 1. Los tres roles

Los roles son **acumulativos**: `usuario < moderador < administrador`. Cada rol
puede hacer todo lo del anterior.

| Rol | Quién es | Para qué existe |
|---|---|---|
| **Usuario** | Cualquier persona registrada (rol por defecto) | Usar la red: publicar, chatear, coleccionar, comprar, vender e intercambiar |
| **Moderador** | Personas de confianza del fandom (pocas, nombradas por un admin) | Mantener sana la comunidad: revisar reportes, ocultar contenido, suspender cuentas por un tiempo, mediar en órdenes con problemas |
| **Administrador** | El equipo de KollectA | Todo lo anterior y además: nombrar o quitar moderadores, banear para siempre, ver reportes y métricas, configurar la plataforma |

## 2. Matriz de permisos

✅ = puede · 🟡 = solo lo suyo · — = no puede

| Acción | Usuario | Moderador | Admin |
|---|---|---|---|
| Publicar, comentar, dar like, chatear | ✅ | ✅ | ✅ |
| Editar / borrar publicaciones y comentarios | 🟡 | ✅ ocultar cualquiera | ✅ borrar cualquiera |
| Colección: agregar, editar y borrar artículos | 🟡 | 🟡 + ocultar artículos falsos | ✅ |
| Comprar, vender e intercambiar | ✅ | ✅ | ✅ |
| Ver una orden | 🟡 si participa | ✅ cualquiera (**hecho**) | ✅ |
| Resolver una disputa (cancelar o forzar el estado de una orden) | — | ✅ | ✅ |
| Reportar publicación, usuario, artículo o mensaje | ✅ | ✅ | ✅ |
| Ver y resolver la cola de reportes | — | ✅ | ✅ |
| Suspender una cuenta temporalmente (1–30 días) | — | ✅ | ✅ |
| Banear para siempre / reactivar cuentas | — | — | ✅ |
| Cambiar el rol de alguien | — | — | ✅ (**hecho**) |
| Ver la bitácora de moderación | — | 🟡 sus acciones | ✅ |
| Ver la sección de Reportes (métricas del §2.1) | — | — | ✅ |

Reglas que no se rompen:

- Nadie cambia **su propio** rol (ya validado en el backend).
- Un moderador **no** puede actuar sobre otro moderador ni sobre un admin.
- Debe quedar **al menos un administrador** activo: no se puede degradar ni banear al último.
- Los mensajes privados **no** los lee la moderación a menos que alguien reporte un mensaje concreto; en ese caso se ve solo ese mensaje y su contexto inmediato.

## 3. Lo que ya está hecho (esta ronda)

- `models/Usuario.js`: `rol` ahora es un `enum` (`usuario`, `moderador`, `administrador`), así no se puede guardar un rol inventado.
- `middleware/roles.js`:
  - `requiereRol("moderador")` — middleware para rutas; va después de `requiereAuth`.
  - `tieneRol(usuarioId, "moderador")` — para revisar dentro de un controlador.
  - El rol se lee **de la base de datos en cada petición**, no del JWT, para que quitar un rol o suspender una cuenta tenga efecto inmediato.
- `routes/adminRoutes.js` (solo administradores):
  - `GET /api/admin/usuarios?q=&rol=`
  - `PATCH /api/admin/usuarios/:id/rol` `{ rol }`
- `GET /api/ordenes/:id` permite a moderadores y admins ver cualquier orden (para disputas), con `miRol: null`.
- `scripts/asignarRol.js`: nombra al primer admin desde la terminal:
  `node scripts/asignarRol.js <username> administrador`
- Pruebas en `tests/ordenes.test.js` (bloque "roles").

## 4. Lo que falta, por fases

### Fase A — Moderación básica (para la revisión final)

1. **Colección `reportes`** (nueva, cuenta para la rúbrica):
   ```
   reportante   → Usuario
   tipo         → "publicacion" | "comentario" | "usuario" | "articulo" | "mensaje" | "orden"
   objetivo     → ObjectId del elemento reportado
   motivo       → "spam" | "acoso" | "falsificacion" | "estafa" | "contenido_inapropiado" | "otro"
   detalle      → String (≤ 500)
   estado       → "abierto" | "en_revision" | "resuelto" | "descartado"
   moderador    → Usuario (quien lo tomó)
   resolucion   → { accion, nota, fecha }
   ```
   Endpoints: `POST /api/reportes` (cualquiera), `GET /api/reportes?estado=` y
   `PATCH /api/reportes/:id` (moderador+). Un usuario no puede reportar dos veces lo mismo.
2. **Ocultar en vez de borrar**: campo `oculto: { por, motivo, fecha }` en
   publicaciones, comentarios y artículos. Los listados filtran `oculto: null`;
   el autor ve un aviso "Tu publicación fue ocultada por moderación".
3. **Suspensiones**: en `Usuario` agregar `suspendidoHasta: Date` y `motivoSuspension`.
   `requiereAuth` (o un middleware nuevo) responde `403 { mensaje, hasta }` mientras
   siga vigente. El baneo permanente usa `activo: false` (ya existe).
4. **Bitácora de moderación** (`moderaciones`): quién hizo qué, sobre qué, cuándo y
   por qué. Sirve también para el archivo de logs obligatorio (§2.2 del otro plan).
5. **Front**:
   - Botón "Reportar" en el menú ⋮ de publicaciones, perfiles, artículos y mensajes.
   - Pantalla `/moderacion` (moderador+): cola de reportes con filtros y acciones rápidas
     (ocultar, descartar, suspender, abrir la orden).
   - El `aPublico()` del usuario ya manda `rol`: el front muestra los enlaces de
     moderación/admin solo si corresponde (el backend igual valida todo).
   - Insignia pequeña "Mod" / "Admin" junto al nombre.

### Fase B — Administración

1. Pantalla `/admin` con pestañas: **Usuarios** (buscar, cambiar rol, banear/reactivar),
   **Reportes** (las ≥ 4 consultas del §2.1 del otro plan, protegidas con `requiereRol("administrador")`)
   y **Bitácora**.
2. Disputas de órdenes: `PATCH /api/ordenes/:id/disputa` (moderador+) para cancelar o
   forzar el estado con nota obligatoria; avisa a las dos partes y queda en el historial.
3. Regla del "último administrador" en el endpoint de roles y en el baneo.

### Fase C — 2027

- Permisos finos (por ejemplo, "moderador de marketplace" vs. "moderador de comunidad") si el equipo crece.
- Moderación por fandom: moderadores de un grupo K-pop solo en su comunidad.
- Filtro automático de palabras y de fotos repetidas (detectar photocards robadas de otros anuncios).
- Apelaciones: la persona suspendida puede pedir revisión una vez.
- Verificación de vendedores (INE/teléfono) gestionada por admins.

## 5. Cómo usarlo en el código

```js
const { requiereAuth } = require("../middleware/auth");
const { requiereRol, tieneRol } = require("../middleware/roles");

// Ruta solo para moderación
router.get("/reportes", requiereAuth, requiereRol("moderador"), listarReportes);

// Dentro de un controlador: el autor O la moderación
if (String(publicacion.autor) !== req.usuario.id && !(await tieneRol(req.usuario.id, "moderador"))) {
    return res.status(403).json({ mensaje: "No tienes permiso" });
}
```

## 6. Reparto sugerido

- **Back**: colección `reportes` + endpoints, campo `oculto`, suspensiones, bitácora.
- **Front**: botón Reportar, `/moderacion`, insignias, `/admin`.
- Pruebas: una por regla de la matriz del §2 (sobre todo las de "no puede").

## 7. Ronda del 12 de noviembre: fase A completa + Reportes por rol (local, sin subir)

**Moderación (fase A y parte de la B)**

- Colecciones nuevas: `denuncias` (se llaman así para no confundirlas con la sección
  "Reportes" de la rúbrica) y `moderaciones` (bitácora). Ya van 14 colecciones.
- `oculto: { por, motivo, fecha }` en publicaciones, comentarios y productos. Los listados
  lo filtran; el autor lo sigue viendo con aviso y la moderación también.
- `suspendidoHasta` / `motivoSuspension` / `motivoBaneo` en `Usuario`. `requiereAuth` ahora
  revisa la cuenta en la BD en cada petición y responde `403 { bloqueo, motivo, hasta }`;
  el login también. El front cierra la sesión y muestra el motivo en el login.
- Reglas: nadie se modera a sí mismo; un moderador no actúa sobre moderadores ni admins;
  siempre queda al menos un admin activo; **conflicto de interés**: nadie atiende una
  denuncia sobre sí mismo y las denuncias contra moderadores/admins solo las atiende un admin.
- Endpoints: `POST /api/denuncias`, `GET /api/denuncias/mias`, `GET /api/denuncias` y
  `PATCH /api/denuncias/:id` (mod+), `/api/moderacion/{resumen,usuarios,usuarios/:id/suspension,
  contenido/:tipo/:id,bitacora}` (mod+), `PATCH /api/admin/usuarios/:id/estado` (banear/reactivar).
- Front: botón "Denunciar" (publicaciones, comentarios, perfiles, productos), ocultar
  rápido para moderación, insignias Mod/Admin, pantalla `/moderacion` (Denuncias, Usuarios,
  Bitácora) con contador de pendientes en el menú.

**Reportes según el rol** (`GET /api/reportes`, `GET /api/reportes/:id?desde=&hasta=&meses=`)

| Rol | Reportes | Colecciones que cruza |
|---|---|---|
| Usuario | Mis compras y ventas por grupo · Mi actividad por mes · Mi colección contra el marketplace | ordenes⨝productos · publicaciones⨝comentarios⨝respuestas · colecciones⨝productos |
| Moderador | Denuncias por motivo · Cuentas más denunciadas · Vendedores con cancelaciones | denuncias⨝usuarios · denuncias⨝usuarios⨝moderaciones · ordenes⨝usuarios |
| Administrador | Ventas por grupo · Top 10 vendedores · Actividad mensual · Interés contra oferta · Embudo de órdenes · Trabajo del equipo de moderación | ordenes⨝productos · ordenes⨝usuarios⨝productos · usuarios∪publicaciones∪comentarios∪mensajes∪ordenes · usuarios∪publicaciones∪colecciones∪productos · ordenes · moderaciones⨝usuarios |

Los roles son acumulativos: el admin ve los 12. Pantalla `/reportes` con gráfica, tabla,
filtro de fechas o meses y descarga CSV. **11 de los 12 cruzan colecciones** (la rúbrica pide ≥ 4).

Pruebas: `tests/moderacion.test.js` (24) y 2 más en `tests/ordenes.test.js`; total 104/104.

**Pendiente**: nombrar administradores en producción (Alejandro Luna y Jesus Gonzalez) con
`node scripts/asignarRol.js <username> administrador`; disputas de órdenes (fase B).

## 8. Ronda del 15 de noviembre: disputas de órdenes (fase B)

- `orden.disputa`: `{ estado: abierta|resuelta, abiertaPor, motivo, detalle, fecha, estadoPrevio, moderador, resolucion: { accion, nota, fecha } }`.
  Motivos: `no_llego`, `no_corresponde`, `falsificacion`, `no_responde`, `otro`.
- `POST /api/ordenes/:id/disputa` (comprador o vendedor): solo con la orden aceptada, enviada o recibida
  y una disputa abierta a la vez. **La orden se congela**: nadie la mueve hasta que se resuelva. Mensaje
  automático en el chat y notificación a la otra parte.
- `GET /api/ordenes/disputas?estado=abiertas|resueltas|todas` (mod+).
- `PATCH /api/ordenes/:id/disputa` `{ accion: cancelar|completar|continuar, nota }` (mod+), con nota obligatoria:
  - `cancelar` libera los artículos y cancela; `completar` traspasa los artículos y completa;
    `continuar` deja la orden en su estado y la descongela.
  - Queda en el historial de la orden ("Moderación: …"), en la bitácora (`resolver_disputa`) y avisa a las dos partes.
  - Conflicto de interés: nadie resuelve una disputa donde participa; si participa alguien del equipo, solo un admin.
- `/api/moderacion/resumen` ahora regresa `{ pendientes, denuncias, disputas }`; el contador del menú suma ambas.
- Front: enlace "Abrir una disputa" en la orden, panel de la disputa (y botones para moderación) y pestaña
  **Disputas** en `/moderacion`.
- Pruebas: `tests/disputas.test.js` (7); total 111/111.
