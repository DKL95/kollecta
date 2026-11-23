import useGrupos from "../hooks/useGrupos";
import { COLORES_BANNER, TEXTURAS_BANNER, normalizarBanner } from "../utils/banner";
import Avatar from "./Avatar";
import Photo from "./Photo";

// Portada del perfil. `banner` viene del usuario; `children` (la foto de perfil, botones) va encima.
export default function ProfileBanner({ banner, children, className = "" }) {
  const { grupos } = useGrupos();
  const actual = normalizarBanner(banner);
  const textura = TEXTURAS_BANNER[actual.textura];
  const grupo = actual.logo ? grupos.find((g) => g.name === actual.logo) : null;

  return (
    <div className={`profile-cover ${className}`}>
      <div className="banner-capas" style={{ background: COLORES_BANNER[actual.color].fondo }} aria-hidden="true">
        {actual.imagen ? (
          <Photo src={actual.imagen} alt="" className="cover-photo" cover />
        ) : (
          <>
            {textura.imagen !== "none" && (
              <span className="banner-textura" style={{ backgroundImage: textura.imagen, backgroundSize: textura.tamano }} />
            )}
            {grupo && (
              <>
                {grupo.img && <span className="banner-logos" style={{ backgroundImage: `url("${grupo.img}")` }} />}
                <span className="banner-logo">
                  <Avatar initials={grupo.initials} src={grupo.img} alt="" background={grupo.color} className="banner-logo-avatar" />
                  <span className="banner-logo-name">{grupo.name}</span>
                </span>
              </>
            )}
          </>
        )}
      </div>
      {children}
    </div>
  );
}
