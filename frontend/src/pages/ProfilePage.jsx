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

  useEffect(() => {
    setProfile(null);
    setError("");
    setEditing(false);
    Promise.all([apiRequest(`/usuarios/${username}`), apiRequest(`/usuarios/${username}/publicaciones`)])
      .then(([profileData, postsData]) => {
        setProfile(profileData.usuario);
        setPosts(postsData.publicaciones);
      })
      .catch((requestError) => setError(requestError.message));
  }, [username]);

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
        post.esMia ? { ...post, autor: { ...post.autor, nombre: updatedUser.nombre, fotoPerfil: updatedUser.fotoPerfil } } : post
      )
    );
    setEditing(false);
  }

  function handlePostChange(updatedPost) {
    setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  }

  function handlePostDelete(postId) {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  return (
    <main className="page">
      <div className="profile-cover" style={{ background: "var(--gradient-brand)" }}>
        <UserAvatar user={shown} className="cover-avatar" />
      </div>

      <div className="profile-head">
        <div>
          <h2>{shown.nombre || shown.username}</h2>
          <div className="handle">@{shown.username}</div>
          <div className="badges-row">
            {favoriteGroups[0] && <span className="pill gold">Bias: {favoriteGroups[0]}</span>}
            <span className="pill cyan">
              <Icon name="checkCircle" size={13} /> Miembro desde {new Date(shown.fechaRegistro).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
        {isOwnProfile && (
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
              <Icon name="pencil" size={14} /> {editing ? "Cancelar" : "Editar perfil"}
            </button>
            <Link to="/vender" className="btn btn-primary">
              <Icon name="plus" size={14} /> Publicar
            </Link>
          </div>
        )}
      </div>

      {editing ? <EditProfileForm user={user} onSaved={handleSaved} /> : <p className="profile-bio">{shown.descripcion || "Sin descripción"}</p>}

      <div className="profile-stats">
        <div className="stat">
          <b>{posts.length}</b>
          <span>Publicaciones</span>
        </div>
        <div className="stat">
          <b>{profile.totalAmigos}</b>
          <span>Amigos</span>
        </div>
        <div className="stat">
          <b>{favoriteGroups.length}</b>
          <span>Grupos que sigue</span>
        </div>
        <div className="stat">
          <b>{posts.reduce((total, post) => total + post.totalLikes, 0)}</b>
          <span>Likes recibidos</span>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <span key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </span>
        ))}
      </div>

      {activeTab === "Publicaciones" && (
        <div style={{ maxWidth: 680 }}>
          {posts.length === 0 && <EmptyState icon="folder">Aún no hay publicaciones.</EmptyState>}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChange={handlePostChange} onDelete={handlePostDelete} />
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
          <EmptyState icon="folder">La colección de @{shown.username} todavía no es pública.</EmptyState>
        ))}

      {activeTab === "Grupos que sigo" && (
        <div className="badges-row">
          {favoriteGroups.length === 0 && <EmptyState icon="star">Todavía no sigue a ningún grupo.</EmptyState>}
          {favoriteGroups.map((groupName) => (
            <Link key={groupName} to={`/grupos/${encodeURIComponent(groupName)}`} className="pill pink">
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const body = new FormData();
    body.append("nombre", nombre);
    body.append("descripcion", descripcion);
    if (photo) body.append("fotoPerfil", photo);

    setSaving(true);
    setError("");
    try {
      const data = await apiRequest("/usuarios/me", { method: "PUT", body });
      onSaved(data.usuario);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" style={{ padding: 20, marginBottom: 20, maxWidth: 560 }} onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="edit-nombre">Nombre</label>
        <input id="edit-nombre" type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="edit-descripcion">Descripción</label>
        <textarea id="edit-descripcion" rows="3" value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="edit-foto">Nueva foto de perfil</label>
        <input id="edit-foto" type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files[0] || null)} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
