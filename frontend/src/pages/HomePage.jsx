import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import Avatar from "../components/Avatar";
import Composer from "../components/Composer";
import EmptyState from "../components/EmptyState";
import FilterChips from "../components/FilterChips";
import Icon from "../components/Icon";
import PostCard from "../components/PostCard";
import { FRIENDS, GROUPS, GROUP_NAMES } from "../data/mockData";
import useFollowedGroups from "../hooks/useFollowedGroups";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isFollowing, toggleFollow } = useFollowedGroups();

  useEffect(() => {
    const query = filter === "Todos" ? "" : `?grupo=${encodeURIComponent(filter)}`;
    setLoading(true);
    setError("");
    apiRequest(`/publicaciones${query}`)
      .then((data) => setPosts(data.publicaciones))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [filter]);

  function handleCreated(post) {
    if (filter === "Todos" || filter === post.grupo) setPosts([post, ...posts]);
  }

  function handleChange(updatedPost) {
    setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  }

  function handleDelete(postId) {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  return (
    <main className="page">
      <div className="layout-2col">
        <div>
          <Composer onCreated={handleCreated} />
          <FilterChips options={GROUP_NAMES} active={filter} onChange={setFilter} />

          {loading && <EmptyState icon="package">Cargando publicaciones…</EmptyState>}
          {!loading && error && <EmptyState icon="close">{error}</EmptyState>}
          {!loading && !error && posts.length === 0 && (
            <EmptyState icon="folder">
              {filter === "Todos" ? "Todavía no hay publicaciones. ¡Sé el primero en publicar!" : `No hay publicaciones de ${filter} todavía.`}
            </EmptyState>
          )}
          {!loading &&
            !error &&
            posts.map((post) => <PostCard key={post.id} post={post} onChange={handleChange} onDelete={handleDelete} />)}
        </div>

        <div>
          <div className="card side-card">
            <h4>Grupos sugeridos</h4>
            {GROUPS.slice(0, 4).map((group) => (
              <div className="mini-row" key={group.name}>
                <Avatar initials={group.initials} src={group.img} alt={group.name} background={group.color} />
                <div className="info">
                  <div className="n">{group.name}</div>
                  <div className="s">{group.fandom}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleFollow(group.name)}>
                  {isFollowing(group.name) ? "Siguiendo" : "Seguir"}
                </button>
              </div>
            ))}
            <Link to="/grupos" className="see-all">
              Ver todos los grupos →
            </Link>
          </div>
          <div className="card side-card">
            <h4>Amigos activos</h4>
            {FRIENDS.slice(0, 4).map((friend) => (
              <div className="mini-row" key={friend.handle}>
                <Avatar initials={friend.initials} />
                <div className="info">
                  <div className="n">{friend.name}</div>
                  <div className="s">
                    {friend.mutual} amigos en común{" "}
                    {friend.online && (
                      <>
                        <span className="status-dot"></span> en línea
                      </>
                    )}
                  </div>
                </div>
                <Link className="icon-btn" to="/mensajes" style={{ width: 32, height: 32 }}>
                  <Icon name="chat" size={14} />
                </Link>
              </div>
            ))}
            <Link to="/mensajes" className="see-all">
              Ir a mensajes →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
