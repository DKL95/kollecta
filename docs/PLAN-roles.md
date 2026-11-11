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
