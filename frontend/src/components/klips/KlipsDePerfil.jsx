import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/client";
import { formatoConteo } from "../../utils/historias";
import EmptyState from "../EmptyState";
import Icon from "../Icon";

// Pestaña "Klips" del perfil: cuadrícula que abre el feed filtrado por esa persona.
export default function KlipsDePerfil({ username, propio }) {
  const [klips, setKlips] = useState(null);

  useEffect(() => {
    let cancelado = false;
    apiRequest(`/klips?autor=${encodeURIComponent(username)}`)
      .then((datos) => !cancelado && setKlips(datos.klips))
      .catch(() => !cancelado && setKlips([]));
    return () => {
      cancelado = true;
    };
  }, [username]);

  if (klips === null) return <EmptyState icon="klip">Cargando Klips…</EmptyState>;
  if (klips.length === 0) {
    return (
      <EmptyState icon="klip">
        {propio ? (
          <>
            Aún no subes Klips. <Link to="/klips">Sube el primero</Link>.
          </>
        ) : (
          "Todavía no tiene Klips."
        )}
      </EmptyState>
    );
  }

  return (
    <div className="klips-perfil">
      {klips.map((klip) => (
        <Link key={klip.id} to={`/klips/${klip.id}?autor=${encodeURIComponent(username)}`} className="klips-perfil-celda">
          <Icon name="play" size={26} />
          {klip.texto && <span className="klips-perfil-texto">{klip.texto}</span>}
          <span className="klips-perfil-datos">
            <span><Icon name="eye" size={12} /> {formatoConteo(klip.reproducciones)}</span>
            <span><Icon name="heart" size={12} /> {formatoConteo(klip.totalLikes)}</span>
          </span>
          {klip.oculta && <span className="klips-perfil-oculto">Oculto</span>}
        </Link>
      ))}
    </div>
  );
}
