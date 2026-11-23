import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { adaptarGrupo } from "../utils/grupos";

/* Catálogo de grupos (GET /api/grupos): los fijos de la app más los que aprobó la moderación.
   Se pide una sola vez y se comparte entre pantallas; refrescarGrupos() lo vuelve a pedir
   (p. ej. cuando un moderador crea o aprueba uno). */

let cache = null;
let pendiente = null;
const oyentes = new Set();

function avisar() {
  oyentes.forEach((oyente) => oyente(cache));
}

export function refrescarGrupos() {
  pendiente = apiRequest("/grupos")
    .then((data) => {
      cache = data.grupos.map(adaptarGrupo);
      avisar();
      return cache;
    })
    .catch((error) => {
      if (!cache) cache = [];
      avisar();
      throw error;
    })
    .finally(() => {
      pendiente = null;
    });
  return pendiente;
}

export default function useGrupos() {
  const [grupos, setGrupos] = useState(cache);

  useEffect(() => {
    oyentes.add(setGrupos);
    if (!cache && !pendiente) refrescarGrupos().catch(() => {});
    else setGrupos(cache);
    return () => oyentes.delete(setGrupos);
  }, []);

  const lista = grupos || [];
  return { grupos: lista, nombres: lista.map((grupo) => grupo.name), cargando: grupos === null };
}
