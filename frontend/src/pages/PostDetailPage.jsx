import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import PostCard from "../components/PostCard";

export default function PostDetailPage() {
  const { id } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarPublicacion = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(`/publicaciones/${id}`);

      console.log(
        "RESPUESTA COMPLETA:",
        JSON.stringify(data, null, 2)
      );

      console.log(
        "PUBLICACIÓN:",
        JSON.stringify(data.publicacion, null, 2)
      );

      if (!data.publicacion) {
        throw new Error("No se encontró la publicación.");
      }

      setPost(data.publicacion);

      setPost(data.publicacion);
    } catch (err) {
      setError(err.message || "No se pudo cargar la publicación.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarPublicacion();
  }, [cargarPublicacion]);

  function actualizarPublicacion(publicacionActualizada) {
    setPost(publicacionActualizada);
  }

  function eliminarPublicacion() {
    setPost(null);
    setError("Esta publicación fue eliminada.");
  }

  if (loading) {
    return (
      <main className="page">
        <div className="card">
          <p>Cargando publicación...</p>
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="page">
        <div className="card">
          <h2>No se pudo mostrar la publicación</h2>
          <p>{error || "La publicación no existe."}</p>

          <Link to="/inicio" className="btn btn-primary">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div style={{ marginBottom: 16 }}>
        <Link to="/notificaciones" className="btn btn-secondary">
          ← Volver a notificaciones
        </Link>
      </div>

      <PostCard
        post={post}
        onChange={actualizarPublicacion}
        onDelete={eliminarPublicacion}
      />
    </main>
  );
}