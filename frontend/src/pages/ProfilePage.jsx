import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import CollectionItem from "../components/CollectionItem";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { MY_COLLECTION } from "../data/mockData";

const TABS = ["Publicaciones", "Colección", "Grupos que sigo"];

export default function ProfilePage() {
  const { user, saveUser } = useAuth();
  const params = useParams();
  const username = params.username || user.username;
  const isOwnProfile = username === user.username;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  // Estados para las solicitudes de amistad
  const [friendStatus, setFriendStatus] = useState("none");
  const [friendRequestId, setFriendRequestId] = useState(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState("");

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
      <div
        className="profile-cover"
        style={{ background: "var(--gradient-brand)" }}
      >
        <UserAvatar user={shown} className="cover-avatar" />
      </div>

      <div className="profile-head">
        <div>
          <h2>{shown.nombre || shown.username}</h2>
          <div className="handle">@{shown.username}</div>

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
          </div>
        )}
      </div>

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
        (isOwnProfile ? (
          <div className="grid grid-4">
            {MY_COLLECTION.map((item) => (
              <CollectionItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState icon="folder">
            La colección de @{shown.username} todavía no es pública.
          </EmptyState>
        ))}

      {activeTab === "Grupos que sigo" && (
        <div className="badges-row">
          {favoriteGroups.length === 0 && (
            <EmptyState icon="star">
              Todavía no sigue a ningún grupo.
            </EmptyState>
          )}

          {favoriteGroups.map((groupName) => (
            <Link
              key={groupName}
              to={`/grupos/${encodeURIComponent(groupName)}`}
              className="pill pink"
            >
              {groupName}
            </Link>
          ))}
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