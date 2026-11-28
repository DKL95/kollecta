import { Link, useNavigate } from "react-router-dom";
import { UserAvatar } from "../components/Avatar";
import Icon from "../components/Icon";
import RoleBadge from "../components/RoleBadge";
import { useAuth } from "../context/AuthContext";
import useInstalarApp from "../hooks/useInstalarApp";
import { esModerador } from "../utils/roles";
import { useSonidoActivo } from "../utils/sonido";

// Fila de la lista de ajustes: puede ser un enlace o un botón.
function Opcion({ icono, titulo, detalle, to, state, onClick, derecha, presionado, peligro = false }) {
  const contenido = (
    <>
      <span className="settings-ic">
        <Icon name={icono} size={18} />
      </span>
      <span className="settings-text">
        <span className="settings-title">{titulo}</span>
        {detalle && <span className="settings-detail">{detalle}</span>}
      </span>
      {derecha ?? (to && <span className="settings-chevron"><Icon name="chevronRight" size={16} /></span>)}
    </>
  );

  const clase = `settings-row ${peligro ? "danger" : ""}`;

  return to ? (
    <Link className={clase} to={to} state={state}>
      {contenido}
    </Link>
  ) : (
    <button type="button" className={clase} onClick={onClick} aria-pressed={presionado}>
      {contenido}
    </button>
  );
}

// Ajustes de la cuenta (estilo Instagram). Se llega desde el engrane del perfil
// o desde el menú lateral en computadora.
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sonidoActivo, alternarSonido] = useSonidoActivo();
  const { puedeInstalar, instruccionesIphone, instalar } = useInstalarApp();

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  return (
    <main className="page settings-page">
      <Link to="/perfil" className="settings-user">
        <UserAvatar user={user} size={52} fontSize={17} />
        <span className="settings-text">
          <span className="settings-title">
            {user?.nombre || user?.username} <RoleBadge rol={user?.rol} />
          </span>
          <span className="settings-detail">@{user?.username} · Ver mi perfil</span>
        </span>
        <span className="settings-chevron"><Icon name="chevronRight" size={16} /></span>
      </Link>

      <section className="settings-section" aria-labelledby="ajustes-cuenta">
        <h3 id="ajustes-cuenta">Tu cuenta</h3>
        <Opcion icono="user" titulo="Mi avatar y stickers" detalle="Arma tu avatar y crea stickers con él" to="/avatar" />
        <Opcion icono="pencil" titulo="Editar perfil" detalle="Nombre, foto, descripción y grupos" to="/perfil" state={{ editar: true }} />
        <Opcion icono="folder" titulo="Mi colección" to="/coleccion" />
        <Opcion icono="package" titulo="Mis órdenes" detalle="Compras, ventas e intercambios" to="/ordenes" />
        <Opcion icono="bell" titulo="Notificaciones" to="/notificaciones" />
      </section>

      <section className="settings-section" aria-labelledby="ajustes-preferencias">
        <h3 id="ajustes-preferencias">Preferencias</h3>
        <Opcion
          icono="disc"
          titulo="Sonido en la colección"
          detalle="Un sonido corto al pasar el cursor por tus piezas"
          onClick={alternarSonido}
          presionado={sonidoActivo}
          derecha={
            <span className={`settings-switch ${sonidoActivo ? "on" : ""}`} aria-hidden="true">
              <span />
            </span>
          }
        />
        {puedeInstalar && (
          <Opcion icono="download" titulo="Instalar app" detalle="Agrega KollectA a tu pantalla de inicio" onClick={instalar} />
        )}
        {!puedeInstalar && instruccionesIphone && (
          <div className="settings-row static">
            <span className="settings-ic">
              <Icon name="download" size={18} />
            </span>
            <span className="settings-text">
              <span className="settings-title">Instalar app</span>
              <span className="settings-detail">En Safari toca Compartir → Agregar a inicio</span>
            </span>
          </div>
        )}
      </section>

      <section className="settings-section" aria-labelledby="ajustes-diversion">
        <h3 id="ajustes-diversion">Diversión</h3>
        <Opcion icono="klip" titulo="Klips" detalle="Mira y sube videos cortos" to="/klips" />
        <Opcion icono="target" titulo="Tareas" detalle="Completa tareas y gana sobres de estampitas" to="/tareas" />
        <Opcion icono="card" titulo="Álbum de estampitas" to="/estampitas" />
        <Opcion icono="gamepad" titulo="Minijuegos" detalle="Lightstick Snake, K-Style Boutique y Memorama" to="/juegos" />
      </section>

      <section className="settings-section" aria-labelledby="ajustes-mas">
        <h3 id="ajustes-mas">Más</h3>
        <Opcion icono="chart" titulo="Reportes" detalle="Estadísticas según tu rol" to="/reportes" />
        {esModerador(user) && <Opcion icono="shield" titulo="Moderación" to="/moderacion" />}
      </section>

      <section className="settings-section" aria-label="Sesión">
        <Opcion icono="power" titulo="Cerrar sesión" onClick={cerrarSesion} peligro />
      </section>
    </main>
  );
}
