import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import PostCard from "../components/PostCard";
import ProductCard from "../components/ProductCard";
import { GROUPS, PRODUCTS } from "../data/mockData";
import useFollowedGroups from "../hooks/useFollowedGroups";

const TABS = ["Merch disponible", "Publicaciones de la comunidad"];

export default function GroupDetailPage() {
  const { groupName } = useParams();
  const group = GROUPS.find((item) => item.name === groupName);
  const { isFollowing, toggleFollow } = useFollowedGroups();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!group) return;
    apiRequest(`/publicaciones?grupo=${encodeURIComponent(group.name)}`)
      .then((data) => setPosts(data.publicaciones))
      .catch(() => setPosts([]));
  }, [group]);

  if (!group) {
    return (
      <main className="page">
        <EmptyState icon="star">No encontramos el grupo "{groupName}".</EmptyState>
      </main>
    );
  }

  const products = PRODUCTS.filter((product) => product.group === group.name);
  const following = isFollowing(group.name);

  function handlePostChange(updatedPost) {
    setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  }

  function handlePostDelete(postId) {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  return (
    <main className="page">
      <Link to="/grupos" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        ← Volver a grupos
      </Link>

      <div className="profile-cover" style={{ background: group.color, position: "relative" }}>
        <Photo src={group.img.replace("/groups/", "/covers/")} alt={group.name} className="cover-photo" cover />
        <Avatar initials={group.initials} src={group.img} alt={group.name} background="rgba(255,255,255,0.25)" className="cover-avatar" />
      </div>

      <div className="profile-head">
        <div>
          <h2>{group.name}</h2>
          <div className="handle">
            {group.agency} · Fandom: {group.fandom}
          </div>
        </div>
        <button className={following ? "btn btn-secondary" : "btn btn-primary"} onClick={() => toggleFollow(group.name)}>
          <Icon name={following ? "checkCircle" : "plus"} size={16} /> {following ? "Siguiendo" : "Seguir grupo"}
        </button>
      </div>

      <div className="profile-stats">
        <div className="stat"><b>{group.members}</b><span>Integrantes</span></div>
        <div className="stat"><b>{group.debut}</b><span>Año de debut</span></div>
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
