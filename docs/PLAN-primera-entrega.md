# Plan de trabajo — Primera Entrega Obligatoria (jueves)

Basado en la rúbrica del curso (`docs/FE-PW2-052-CIOO-AD2026.pdf`) y el estado
actual del repo (mockup navegable ya entregado en el Kick Off).

## Qué toca entregar el jueves

Es la **Primera Entrega Obligatoria** (no el Kick Off). Según el PDF (pág. 5),
hay que subir a la plataforma del profesor un `.zip`/`.rar` por equipo con:

1. **`.txt`** con nombres + matrículas del equipo + enlace al repositorio de GitHub.
2. **PDF de diseño técnico**: diseño de base de datos + descripción de endpoints.
3. **Repositorio de GitHub** con:
   - README actualizado: nombres del equipo, descripción de la app, descripción de carpetas.
   - **Código fuente del Back End.**

## Cómo se califica (100 pts = 15% de la calificación práctica)

| Rubro | Pts |
|---|---|
| PDF diseño técnico (BD + propuesta de pantallas) | 30 |
| Back End funcionando, código limpio | 20 |
| Front End (funcionalidad descrita), código limpio | 20 |
| Responder preguntas del profesor | 10 |
| Uso real de Git/GitHub (commits, push, branches de **cada** integrante) | 15 |
| Comunicación Back End ↔ BD sin errores | 5 |

El punto de Git (15 pts) requiere actividad real de los 4 integrantes, no de
una sola persona subiendo todo al final.

## Reparto sugerido (4 integrantes, 3 días: lunes → jueves)

### Lunes — diseño en conjunto (1-2h todos juntos)

- Definir juntos el modelo de datos a partir de lo que ya existe en
  `frontend/js/data.js`: usuarios, grupos, productos/publicaciones
  (marketplace), posts (feed), comentarios, amigos/follows, mensajes/threads,
  colección personal, órdenes/transacciones. Son de sobra las 6 tablas mínimas.
- Decidir el stack del Back End: p. ej. **Node.js + Express +
  Sequelize/Prisma (ORM) + MySQL o PostgreSQL**, autenticación con JWT.
  Debe combinar bien con el front vanilla JS ya existente (comunicación por JSON).
- Crear rama `dev` (ya existe) → cada quien su rama `feature/...`.

### Reparto por persona

- **Persona A — Diseño de BD + PDF técnico**: diagrama entidad-relación
  (6+ tablas, relaciones, tipos de datos) y documento con descripción de
  endpoints (rutas, método HTTP, propósito). Rubro de mayor peso (30 pts).
- **Persona B — Setup del Back End**: estructura del proyecto (carpetas
  `models/`, `routes/`, `controllers/`), conexión a BD vía ORM, configuración
  de entorno (`.env`), logging básico.
- **Persona C — Endpoints CRUD**: implementar create/read/update/delete por
  tabla con validaciones en back end (aunque se repitan con las del front).
- **Persona D — Auth + Git/README**: login/registro con JWT, middleware de
  autorización por token, y mantener el README + `.txt` de entrega
  actualizados. Apoya a Persona C con endpoints si sobra tiempo.

### Martes

Cada quien avanza en su parte en su propia rama, con commits frecuentes y
descriptivos (no uno gigante al final).

### Miércoles

- Merge de todas las ramas a `dev`.
- Probar que Back End ↔ BD responde sin errores.
- Terminar el PDF técnico.
- Ensayar respuestas por si el profesor pregunta (10 pts) — que los 4 puedan
  explicar el diseño de BD y los endpoints, no solo quien los hizo.

### Jueves (antes de clase)

Armar el `.zip`: `.txt` + PDF + confirmar que el repo tiene el código del
Back End y el README actualizado.
