import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "./Avatar";
import Icon from "./Icon";
import Photo from "./Photo";
import { timeAgo } from "../utils/format";

export default function PostCard({ post, onChange, onDelete }) {
  const author = post.autor;

  async function handleLike() {
    // Se actualiza al instante y luego se sincroniza con el servidor
    onChange({ ...post, meGusta: !post.meGusta, totalLikes: post.totalLikes + (post.meGusta ? -1 : 1) });
    try {
      const data = await apiRequest(`/publicaciones/${post.id}/like`, { method: "POST" });
      onChange(data.publicacion);
    } catch (error) {
      onChange(post);
      alert(error.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm("¿Eliminar esta publicación?")) return;
    try {
      await apiRequest(`/publicaciones/${post.id}`, { method: "DELETE" });
      onDelete(post.id);
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <article className="card post">
      <div className="post-head">
        <Link to={`/perfil/${author.username}`}>
          <UserAvatar user={author} />
        </Link>
        <div>
          <div className="name">
            <Link to={`/perfil/${author.username}`}>{author.nombre || author.username}</Link>{" "}
            <span className="handle">@{author.username}</span>
          </div>
          <div className="time">
            {timeAgo(post.fechaCreacion)}
            {post.grupo && (
              <>
                {" · "}
                <span className="pill pink" style={{ padding: "1px 8px" }}>{post.grupo}</span>
              </>
            )}
          </div>
        </div>
        {post.esMia && (
          <button className="icon-btn more" title="Eliminar publicación" onClick={handleDelete} style={{ width: 32, height: 32 }}>
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
      <p className="post-text">{post.texto}</p>
      {post.imagen && (
        <div className="post-media">
          <Photo src={post.imagen} alt={post.texto} />
        </div>
      )}
      <div className="post-actions">
        <button className={`post-action-btn like-btn ${post.meGusta ? "liked" : ""}`} onClick={handleLike}>
          <span className="ic">
            <Icon name={post.meGusta ? "heartFilled" : "heart"} size={16} />
          </span>{" "}
          <span className="count">{post.totalLikes}</span>
        </button>
        <button className="post-action-btn">
          <Icon name="comment" size={16} /> {post.totalComentarios}
        </button>
        <button className="post-action-btn">
          <Icon name="share" size={16} /> Compartir
        </button>
      </div>
    </article>
  );
}
