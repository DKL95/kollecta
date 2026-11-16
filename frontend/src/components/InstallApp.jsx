import { useState } from "react";
import useInstalarApp from "../hooks/useInstalarApp";

const CLAVE_CERRADO = "kollecta_instalar_cerrado";

function leerCerrado() {
  try {
    return localStorage.getItem(CLAVE_CERRADO) === "1";
  } catch {
    return false;
  }
}

// Botón del menú lateral (computadora).
export function InstallButton() {
  const { puedeInstalar, instalar } = useInstalarApp();
  if (!puedeInstalar) return null;
  return (
    <button type="button" className="btn btn-secondary btn-sm btn-block install-btn" onClick={instalar}>
      📲 Instalar app
    </button>
  );
}

// Aviso abajo de la pantalla (celular). Se puede cerrar y no vuelve a salir.
export function InstallBanner() {
  const { puedeInstalar, instruccionesIphone, instalar } = useInstalarApp();
  const [cerrado, setCerrado] = useState(leerCerrado);

  if (cerrado || (!puedeInstalar && !instruccionesIphone)) return null;

  function cerrar() {
    setCerrado(true);
    try {
      localStorage.setItem(CLAVE_CERRADO, "1");
    } catch {
      /* sin almacenamiento: solo se oculta en esta visita */
    }
  }

  return (
    <div className="install-banner" role="dialog" aria-label="Instalar KollectA">
      <img src="/icons/icon-192.png" alt="" width="40" height="40" />
      <div className="install-banner-text">
        <strong>Instala KollectA</strong>
        {puedeInstalar ? (
          <span>Ábrela desde tu pantalla de inicio, como una app.</span>
        ) : (
          <span>
            En Safari toca <b>Compartir</b> <span aria-hidden="true">⬆️</span> y luego <b>Agregar a inicio</b>.
          </span>
        )}
      </div>
      {puedeInstalar && (
        <button type="button" className="btn btn-primary btn-sm" onClick={instalar}>
          Instalar
        </button>
      )}
      <button type="button" className="install-banner-close" onClick={cerrar} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}
