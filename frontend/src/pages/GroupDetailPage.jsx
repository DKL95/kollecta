import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import Avatar from "../components/Avatar";
import GroupRequestDialog from "../components/GroupRequestDialog";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import PostCard from "../components/PostCard";
import ProductCard from "../components/ProductCard";
import useGrupos from "../hooks/useGrupos";
import { adaptarProducto } from "../utils/coleccion";
import useFollowedGroups from "../hooks/useFollowedGroups";
import { useAuth } from "../context/AuthContext";
import { esModerador } from "../utils/roles";

const TABS = ["Merch disponible", "Publicaciones de la comunidad"];

export default function GroupDetailPage() {
  const { groupName } = useParams();
  const { grupos, cargando } = useGrupos();
  const group = grupos.find((item) => item.name === groupName);
  const { isFollowing, toggleFollow } = useFollowedGroups();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [posts, setPosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [editando, setEditando] = useState(false);
  const { user, saveUser } = useAuth();
  const navigate = useNavigate();

  const nombre = group?.name;

  useEffect(() => {
    if (!nombre) return;
    apiRequest(`/publicaciones?grupo=${encodeURIComponent(nombre)}`)
      .then((data) => setPosts(data.publicaciones))
      .catch(() => setPosts([]));
    apiRequest(`/productos?grupo=${encodeURIComponent(nombre)}`)
      .then((data) => setProducts(data.productos.map(adaptarProducto)))
      .catch(() => setProducts([]));
  }, [nombre]);

  if (!group) {
    return (
      <main className="page">
        <EmptyState icon="star">{cargando ? "Cargando grupo…" : <>No encontramos el grupo "{groupName}".</>}</EmptyState>
      </main>
    );
  }

  const following = isFollowing(group.name);

  function handlePostChange(updatedPost) {
    setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  }

  function handlePostDelete(postId) {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  // Si se renombró, la URL y los grupos que sigue la sesión cambian de nombre.
  async function alGuardar(actualizado) {
    if (actualizado.nombre === group.name) return;
    navigate(`/grupos/${encodeURIComponent(actualizado.nombre)}`, { replace: true });
    try {
      const data = await apiRequest("/auth/me");
      saveUser(data.usuario);
    } catch {
      // se actualizará al volver a entrar
    }
  }

  return (
    <main className="page">
      <Link to="/grupos" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Volver a grupos
      </Link>

      <div className="profile-cover" style={{ background: group.color, position: "relative" }}>
        <Photo src={group.cover} alt={group.name} className="cover-photo" cover />
        <Avatar initials={group.initials} src={group.img} alt={group.name} background="rgba(255,255,255,0.25)" className="cover-avatar" />
      </div>

      <div className="profile-head">
        <div>
          <h2>{group.name}</h2>
          <div className="handle">
            {[group.agency, group.fandom && `Fandom: ${group.fandom}`].filter(Boolean).join(" · ")}
          </div>
          {group.description && <p className="group-description">{group.description}</p>}
        </div>
        <div className="group-head-actions">
          {esModerador(user) && (
            <button type="button" className="btn btn-ghost" onClick={() => setEditando(true)}>
              <Icon name="pencil" size={16} /> Editar grupo
            </button>
          )}
          <button className={following ? "btn btn-secondary" : "btn btn-primary"} onClick={() => toggleFollow(group.name)}>
            <Icon name={following ? "checkCircle" : "plus"} size={16} /> {following ? "Siguiendo" : "Seguir grupo"}
          </button>
        </div>
      </div>

      {editando && <GroupRequestDialog grupo={group} onClose={() => setEditando(false)} onSaved={alGuardar} />}

      <div className="profile-stats">
        <div className="stat"><b>{group.members ?? "—"}</b><span>Integrantes</span></div>
        <div className="stat"><b>{group.debut ?? "—"}</b><span>Año de debut</span></div>
        <div className="stat"><b>{posts.length}</b><span>Publicaciones en KollectA</span></div>
        <div className="stat"><b>{products.length}</b><span>Artículos en marketplace</span></div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => (
          <span key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </span>
        ))}
      </div>

      {activeTab === "Merch disponible" && (
        <div className="grid grid-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {products.length === 0 && <EmptyState icon="package">Aún no hay merch de {group.name} publicado.</EmptyState>}
        </div>
      )}

      {activeTab === "Publicaciones de la comunidad" && (
        <div style={{ maxWidth: 680 }}>
          {posts.length === 0 && <EmptyState icon="folder">Nadie ha publicado sobre {group.name} todavía.</EmptyState>}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onChange={handlePostChange} onDelete={handlePostDelete} />
          ))}
        </div>
      )}
    </main>
  );
}
