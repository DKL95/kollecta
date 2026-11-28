import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import Avatar, { UserAvatar } from "../components/Avatar";
import BannerDialog from "../components/BannerDialog";
import ProfileBanner from "../components/ProfileBanner";
import useGrupos from "../hooks/useGrupos";
import CollectionItem from "../components/CollectionItem";
import EmptyState from "../components/EmptyState";
import SellerReviews from "../components/SellerReviews";
import Icon from "../components/Icon";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { adaptarArticulo } from "../utils/coleccion";
import RoleBadge from "../components/RoleBadge";
import ReportDialog from "../components/ReportDialog";
import ModActionDialog from "../components/ModActionDialog";
import KlipsDePerfil from "../components/klips/KlipsDePerfil";
import { esAdmin, esModerador } from "../utils/roles";

const TABS = ["Publicaciones", "Klips", "Colección", "Reseñas", "Grupos que sigo"];

export default function ProfilePage() {
  const { user, saveUser } = useAuth();
  const params = useParams();
  const username = params.username || user.username;
  const isOwnProfile = username === user.username;
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  // null = cargando, [] = vacía
  const [collection, setCollection] = useState(null);
  const [collectionError, setCollectionError] = useState("");
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  // Estados para las solicitudes de amistad
  const [friendStatus, setFriendStatus] = useState("none");
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState("");
  const [denunciando, setDenunciando] = useState(false);
  const [sancion, setSancion] = useState(null); // "suspender" | "banear"
  const [editandoBanner, setEditandoBanner] = useState(false);
  const { grupos } = useGrupos();
  // Reputación como vendedor (null = cargando)
  const [reputacion, setReputacion] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setReputacion(null);
    apiRequest(`/ordenes/resumen/${encodeURIComponent(username)}`)
      .then((data) => !cancelado && setReputacion(data))
      .catch(() => !cancelado && setReputacion({ operaciones: 0, calificaciones: 0, promedio: null }));
    return () => {
      cancelado = true;
    };
  }, [username]);

  useEffect(() => {
    setProfile(null);
    setError("");
    setEditing(false);

    Promise.all([
      apiRequest(`/usuarios/${encodeURIComponent(username)}`),
      apiRequest(`/usuarios/${encodeURIComponent(username)}/publicaciones`)
    ])
      .then(([profileData, postsData]) => {
        setProfile(profileData.usuario);
        setPosts(postsData.publicaciones);
      })
      .catch((requestError) => setError(requestError.message));
  }, [username]);

  // Cargar la colección real del perfil (propio o ajeno).
  const profileId = profile?.id;

  useEffect(() => {
    setCollection(null);
    setCollectionError("");

    if (!profileId) return;

    let cancelled = false;

    apiRequest(`/coleccion/usuario/${profileId}`)
      .then((data) => {
        if (!cancelled) {
          setCollection((data.articulos || []).map(adaptarArticulo));
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setCollection([]);
          setCollectionError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  // Desde Ajustes → "Editar perfil": abrir el formulario en cuanto cargue el perfil
  // y limpiar el aviso para que no se vuelva a abrir al recargar.
  useEffect(() => {
    if (!profile || !isOwnProfile || !location.state?.editar) return;
    setEditing(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [profile, isOwnProfile, location.state, location.pathname, navigate]);

  // Consultar el estado de la amistad al entrar en un perfil
  useEffect(() => {
    setFriendStatus("none");
    setFriendRequestId(null);
    setFriendError("");

    if (isOwnProfile) {
      return;
    }

    let cancelled = false;

    apiRequest(`/usuarios/${encodeURIComponent(username)}/amistad`)
      .then((data) => {
        if (cancelled) return;

        setFriendStatus(data.estado || "none");
        setFriendRequestId(data.solicitudId || null);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setFriendError(requestError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username, isOwnProfile]);

  // Enviar, aceptar, rechazar o cancelar una solicitud
  async function handleFriendAction(action) {
    if (friendLoading || !friendRequestActionAllowed(action)) {
      return;
    }

    setFriendLoading(true);
    setFriendError("");

    try {
      if (action === "send") {
        const data = await apiRequest(
          `/usuarios/${encodeURIComponent(username)}/solicitud`,
          { method: "POST" }
        );

        setFriendStatus("sent");
        setFriendRequestId(
          data.solicitud?._id ||
          data.solicitud?.id ||
          data.solicitudId ||
          null
        );
      }

      if (action === "accept") {
        await apiRequest(`/usuarios/solicitudes/${friendRequestId}/aceptar`, {
          method: "POST"
        });

        setFriendStatus("friends");
        setFriendRequestId(null);

        // Actualizar el contador del perfil que se está mostrando
        setProfile((current) =>
          current
            ? {
                ...current,
                totalAmigos: (current.totalAmigos || 0) + 1
              }
            : current
        );
      }

      if (action === "reject") {
        await apiRequest(`/usuarios/solicitudes/${friendRequestId}/rechazar`, {
          method: "POST"
        });

        setFriendStatus("none");
        setFriendRequestId(null);
      }

      if (action === "cancel") {
        await apiRequest(`/usuarios/solicitudes/${friendRequestId}`, {
          method: "DELETE"
        });

        setFriendStatus("none");
        setFriendRequestId(null);
      }
    } catch (requestError) {
      setFriendError(requestError.message);
    } finally {
      setFriendLoading(false);
    }
  }

  // Evita acciones que no corresponden al estado actual
  function friendRequestActionAllowed(action) {
    if (action === "send") return friendStatus === "none";
    if (action === "accept" || action === "reject") {
      return friendStatus === "received" && Boolean(friendRequestId);
    }
    if (action === "cancel") {
      return friendStatus === "sent" && Boolean(friendRequestId);
    }
    return false;
  }

  if (error) {
    return (
      <main className="page">
        <EmptyState icon="user">{error}</EmptyState>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page">
        <EmptyState icon="user">Cargando perfil…</EmptyState>
      </main>
    );
  }

  // Para el perfil propio se usan los datos de la sesión (se actualizan al editar o seguir grupos)
  const shown = isOwnProfile ? { ...profile, ...user } : profile;
  const favoriteGroups = shown.gruposFavoritos || [];

  function handleSaved(updatedUser) {
    saveUser(updatedUser);
    // Las publicaciones ya cargadas traen el nombre y la foto anteriores del autor
    setPosts((current) =>
      current.map((post) =>
        post.esMia
          ? {
              ...post,
              autor: {
                ...post.autor,
                nombre: updatedUser.nombre,
                fotoPerfil: updatedUser.fotoPerfil
              }
            }
          : post
      )
    );
    setEditing(false);
  }

  const moderacion = profile.moderacion;
  const puedoModerar = !isOwnProfile && esModerador(user) && (profile.rol === "usuario" || esAdmin(user));

  async function recargarPerfil() {
    const data = await apiRequest(`/usuarios/${encodeURIComponent(username)}`);
    setProfile(data.usuario);
  }

  async function aplicarSancion({ motivo, dias }) {
    if (sancion === "suspender") {
      await apiRequest(`/moderacion/usuarios/${profile.id}/suspension`, { method: "POST", body: { dias, motivo } });
    } else {
      await apiRequest(`/admin/usuarios/${profile.id}/estado`, { method: "PATCH", body: { activo: false, motivo } });
    }
    await recargarPerfil();
  }

  async function quitarSancion() {
    try {
      if (moderacion && !moderacion.activo) {
        await apiRequest(`/admin/usuarios/${profile.id}/estado`, { method: "PATCH", body: { activo: true } });
      } else {
        await apiRequest(`/moderacion/usuarios/${profile.id}/suspension`, { method: "DELETE" });
      }
      await recargarPerfil();
    } catch (err) {
      alert(err.message);
    }
  }

  function handlePostChange(updatedPost) {
    setPosts((current) =>
      current.map((post) =>
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  }

  function handlePostDelete(postId) {
    setPosts((current) =>
      current.filter((post) => post.id !== postId)
    );
  }

  return (
    <main className="page">
      <ProfileBanner banner={shown.banner}>
        <UserAvatar user={shown} className="cover-avatar" />
        {isOwnProfile && (
          <button type="button" className="btn btn-secondary btn-sm banner-edit-btn" onClick={() => setEditandoBanner(true)}>
            <Icon name="pencil" size={14} /> Personalizar banner
          </button>
        )}
      </ProfileBanner>

      {editandoBanner && (
        <BannerDialog
          user={shown}
          onClose={() => setEditandoBanner(false)}
          onSaved={(usuario) => {
            saveUser(usuario);
            setEditandoBanner(false);
          }}
        />
      )}

      <div className="profile-head">
        <div>
          <h2>
            {shown.nombre || shown.username} <RoleBadge rol={shown.rol} />
          </h2>
          <div className="handle">@{shown.username}</div>

          {moderacion && (!moderacion.activo || moderacion.suspendido) && (
            <div className="mod-notice" role="status" style={{ marginTop: 10 }}>
              <Icon name="shield" size={15} />
              <span>
                {!moderacion.activo
                  ? `Cuenta baneada: ${moderacion.motivoBaneo || "sin motivo"}`
                  : `Suspendida hasta el ${new Date(moderacion.suspendidoHasta).toLocaleDateString("es-MX")}: ${moderacion.motivoSuspension}`}
              </span>
            </div>
          )}

          <div className="badges-row">
            {favoriteGroups[0] && (
              <span className="pill gold">
                Grupo Principal: {favoriteGroups[0]}
              </span>
            )}

            <span className="pill cyan">
              <Icon name="checkCircle" size={13} /> Miembro desde{" "}
              {new Date(shown.fechaRegistro).toLocaleDateString("es-MX", {
                month: "long",
                year: "numeric"
              })}
            </span>
          </div>
        </div>

        {isOwnProfile ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setEditing(!editing)}
            >
              <Icon name="pencil" size={14} />{" "}
              {editing ? "Cancelar" : "Editar perfil"}
            </button>

            <Link to="/vender" className="btn btn-primary">
              <Icon name="plus" size={14} /> Publicar
            </Link>

            <Link to="/ajustes" className="btn btn-secondary profile-settings-btn" title="Ajustes" aria-label="Ajustes">
              <Icon name="settings" size={16} />
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8
            }}
          >
            {friendStatus === "none" && (
              <button
                className="btn btn-primary"
                onClick={() => handleFriendAction("send")}
                disabled={friendLoading}
              >
                <Icon name="plus" size={14} />{" "}
                {friendLoading ? "Enviando…" : "Agregar amigo"}
              </button>
            )}

            {friendStatus === "sent" && (
              <button
                className="btn btn-secondary"
                onClick={() => handleFriendAction("cancel")}
                disabled={friendLoading || !friendRequestId}
              >
                {friendLoading ? "Cancelando…" : "Cancelar solicitud"}
              </button>
            )}

            {friendStatus === "received" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleFriendAction("accept")}
                  disabled={friendLoading || !friendRequestId}
                >
                  {friendLoading ? "Procesando…" : "Aceptar solicitud"}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => handleFriendAction("reject")}
                  disabled={friendLoading || !friendRequestId}
                >
                  Rechazar
                </button>
              </div>
            )}

            {friendStatus === "friends" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" disabled>
                  <Icon name="checkCircle" size={14} /> Amigos
                </button>

                <button
                  className="btn btn-secondary"
                  disabled={friendLoading}
                  onClick={async () => {
                    const confirmar = window.confirm(
                      `¿Seguro que quieres eliminar a @${shown.username} de tus amigos?`
                    );

                    if (!confirmar) return;

                    const otroUsuarioId = profile.id || profile._id;

                    if (!otroUsuarioId) {
                      setFriendError("No se pudo identificar al usuario.");
                      return;
                    }

                    setFriendLoading(true);
                    setFriendError("");

                    try {
                      await apiRequest(
                        `/usuarios/${encodeURIComponent(otroUsuarioId)}/amigo`,
                        { method: "DELETE" }
                      );

                      setFriendStatus("none");
                      setFriendRequestId(null);

                      setProfile((current) =>
                        current
                          ? {
                              ...current,
                              totalAmigos: Math.max(
                                0,
                                (current.totalAmigos || 0) - 1
                              )
                            }
                          : current
                      );
                    } catch (requestError) {
                      setFriendError(requestError.message);
                    } finally {
                      setFriendLoading(false);
                    }
                  }}
                >
                  {friendLoading ? "Procesando…" : "Eliminar amigo"}
                </button>
              </div>
            )}

            {friendError && (
              <p className="form-error" role="alert">
                {friendError}
              </p>
            )}

            <div className="profile-mod-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDenunciando(true)}>
                <Icon name="flag" size={13} /> Denunciar cuenta
              </button>

              {puedoModerar && moderacion && (moderacion.suspendido || !moderacion.activo) && (
                (moderacion.activo || esAdmin(user)) && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={quitarSancion}>
                    <Icon name="shield" size={13} /> {moderacion.activo ? "Levantar suspensión" : "Reactivar cuenta"}
                  </button>
                )
              )}

              {puedoModerar && moderacion?.activo && !moderacion.suspendido && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setSancion("suspender")}>
                  <Icon name="shield" size={13} /> Suspender
                </button>
              )}

              {puedoModerar && esAdmin(user) && moderacion?.activo && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setSancion("banear")}>
                  <Icon name="shield" size={13} /> Banear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {denunciando && (
        <ReportDialog tipo="usuario" objetivo={profile.id} resumen={`@${profile.username}`} onClose={() => setDenunciando(false)} />
      )}

      {sancion && (
        <ModActionDialog
          titulo={sancion === "suspender" ? `Suspender a @${profile.username}` : `Banear a @${profile.username}`}
          descripcion={
            sancion === "suspender"
              ? "No podrá entrar a KollectA durante ese tiempo. Queda registrado en la bitácora."
              : "La cuenta queda dada de baja para siempre (un administrador puede reactivarla). Sus publicaciones y anuncios dejan de verse."
          }
          confirmar={sancion === "suspender" ? "Suspender" : "Banear"}
          peligro
          pedirDias={sancion === "suspender"}
          onConfirm={aplicarSancion}
          onClose={() => setSancion(null)}
        />
      )}

      {editing ? (
        <EditProfileForm user={user} onSaved={handleSaved} />
      ) : (
        <p className="profile-bio">
          {shown.descripcion || "Sin descripción"}
        </p>
      )}

      <div className="profile-stats">
        <div className="stat">
          <b>{posts.length}</b>
          <span>Publicaciones</span>
        </div>

        <div className="stat">
          <b>{profile.totalAmigos ?? 0}</b>
          <span>Amigos</span>
        </div>

        <div className="stat">
          <b>{favoriteGroups.length}</b>
          <span>Grupos que sigue</span>
        </div>

        <div className="stat">
          <b>
            {posts.reduce(
              (total, post) => total + post.totalLikes,
              0
            )}
          </b>
          <span>Likes recibidos</span>
        </div>

        {reputacion?.operaciones > 0 && (
          <button type="button" className="stat stat-link" onClick={() => setActiveTab("Reseñas")}>
            <b className="stat-gold">{reputacion.promedio ? `★ ${reputacion.promedio}` : reputacion.operaciones}</b>
            <span>
              {reputacion.promedio
                ? `${reputacion.calificaciones} reseña${reputacion.calificaciones === 1 ? "" : "s"}`
                : `Venta${reputacion.operaciones === 1 ? "" : "s"} completada${reputacion.operaciones === 1 ? "" : "s"}`}
            </span>
          </button>
        )}
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <span
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </span>
        ))}
      </div>

      {activeTab === "Publicaciones" && (
        <div style={{ maxWidth: 680 }}>
          {posts.length === 0 && (
            <EmptyState icon="folder">
              Aún no hay publicaciones.
            </EmptyState>
          )}

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChange={handlePostChange}
              onDelete={handlePostDelete}
            />
          ))}
        </div>
      )}

      {activeTab === "Colección" &&
        (collection === null ? (
          <div className="card side-card">
            <p>Cargando colección...</p>
          </div>
        ) : collectionError ? (
          <EmptyState icon="folder">{collectionError}</EmptyState>
        ) : collection.length === 0 ? (
          <EmptyState icon="folder">
            {isOwnProfile ? (
              <>
                Tu colección está vacía.{" "}
                <Link to="/vender">Agrega tu primera pieza</Link>
              </>
            ) : (
              `@${shown.username} todavía no tiene piezas en su colección.`
            )}
          </EmptyState>
        ) : (
          <div className="grid grid-4">
            {collection.map((item) => (
              <CollectionItem key={item.id} item={item} />
            ))}
          </div>
        ))}

      {activeTab === "Klips" && <KlipsDePerfil username={shown.username} propio={isOwnProfile} />}

      {activeTab === "Reseñas" && (
        <SellerReviews reputacion={reputacion} username={shown.username} propio={isOwnProfile} />
      )}

      {activeTab === "Grupos que sigo" && (
        <div className="followed-groups">
          {favoriteGroups.length === 0 && (
            <EmptyState icon="star">
              Todavía no sigue a ningún grupo.
            </EmptyState>
          )}

          {favoriteGroups.map((groupName) => {
            const grupo = grupos.find((g) => g.name === groupName);
            return (
              <Link key={groupName} to={`/grupos/${encodeURIComponent(groupName)}`} className="card followed-group">
                <Avatar
                  initials={grupo?.initials || groupName.slice(0, 3).toUpperCase()}
                  src={grupo?.img}
                  alt={groupName}
                  background={grupo?.color || "var(--gradient-brand)"}
                  size={64}
                  fontSize={16}
                />
                <span className="followed-group-name">{groupName}</span>
                {grupo?.fandom && <span className="followed-group-meta">{grupo.fandom}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

function EditProfileForm({ user, onSaved }) {
  const [nombre, setNombre] = useState(user.nombre || "");
  const [descripcion, setDescripcion] = useState(user.descripcion || "");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  async function handleSubmit(event) {
    event.preventDefault();

    const body = new FormData();
    body.append("nombre", nombre);
    body.append("descripcion", descripcion);

    if (photo) {
      body.append("fotoPerfil", photo);
    }

    setSaving(true);
    setError("");

    try {
      const data = await apiRequest("/usuarios/me", {
        method: "PUT",
        body
      });

      onSaved(data.usuario);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card edit-profile-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="edit-nombre">Nombre</label>

        <input
          id="edit-nombre"
          type="text"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="edit-descripcion">Descripción</label>

        <textarea
          id="edit-descripcion"
          rows="3"
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="edit-foto">Nueva foto de perfil</label>

        <input
          id="edit-foto"
          type="file"
          accept="image/*"
          onChange={(event) => {
            setPhoto(event.target.files?.[0] || null);
          }}
        />
      </div>

      {photoPreview && (
        <div className="edit-profile-photo-preview">
          <div className="edit-profile-photo-item">
            <img
              src={photoPreview}
              alt="Vista previa de la nueva foto de perfil"
            />

            <button
              type="button"
              className="edit-profile-photo-remove"
              onClick={() => {
                setPhoto(null);

                const input = document.getElementById("edit-foto");

                if (input) {
                  input.value = "";
                }
              }}
              aria-label="Quitar foto seleccionada"
              title="Quitar foto"
            >
              ×
            </button>
          </div>

          <span className="edit-profile-photo-label">
            Vista previa de la nueva foto
          </span>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={saving}
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}