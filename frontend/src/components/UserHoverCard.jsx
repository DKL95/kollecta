import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "./Avatar";

export default function UserHoverCard({ user, children }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const timerRef = useRef(null);

  const username =
    typeof user === "string"
      ? user.replace(/^@/, "")
      : user?.username;

  const clearHoverTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const closeCard = useCallback(() => {
    clearHoverTimer();
    setOpen(false);
  }, [clearHoverTimer]);

  const scheduleClose = useCallback(() => {
    clearHoverTimer();

    timerRef.current = setTimeout(() => {
      const active = document.activeElement;

      if (
        containerRef.current?.contains(active) ||
        cardRef.current?.contains(active)
      ) {
        return;
      }

      setOpen(false);
    }, 250);
  }, [clearHoverTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const cardWidth = Math.min(360, viewportWidth - 24);
    const estimatedHeight = Math.min(
      cardRef.current?.scrollHeight || 430,
      viewportHeight - 24
    );

    const margin = 12;
    const gap = 8;

    let left = rect.left;
    let placement = "bottom";

    // Evitar que la tarjeta se salga horizontalmente.
    left = Math.max(
      margin,
      Math.min(left, viewportWidth - cardWidth - margin)
    );

    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    let top;

    // Colocar arriba si no cabe debajo y hay más espacio arriba.
    if (
      spaceBelow < estimatedHeight &&
      spaceAbove > spaceBelow
    ) {
      placement = "top";
      top = rect.top - estimatedHeight - gap;
    } else {
      top = rect.bottom + gap;
    }

    // Mantener la tarjeta dentro de la ventana.
    top = Math.max(
      margin,
      Math.min(
        top,
        viewportHeight - estimatedHeight - margin
      )
    );

    setPosition({
      top,
      left,
      placement,
    });
  }, []);

  useEffect(() => {
    if (!open || !username) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);

      try {
        const data = await apiRequest(
          `/usuarios/${encodeURIComponent(username)}`
        );

        if (!cancelled) {
          setProfile(data.usuario || null);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [open, username]);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleOutsideClick = (event) => {
      if (
        !containerRef.current?.contains(event.target) &&
        !cardRef.current?.contains(event.target)
      ) {
        closeCard();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeCard();
      }
    };

    const handleViewportChange = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener(
        "resize",
        handleViewportChange
      );
      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
    };
  }, [open, closeCard, updatePosition]);

  useEffect(() => {
    if (!open) return;

    // Recalcular después de cargar la información del perfil.
    const frame = requestAnimationFrame(updatePosition);

    return () => cancelAnimationFrame(frame);
  }, [open, profile, loading, updatePosition]);

  useEffect(() => {
    return () => {
      clearHoverTimer();
    };
  }, [clearHoverTimer]);

  function handleMouseEnter() {
    clearHoverTimer();

    timerRef.current = setTimeout(() => {
      updatePosition();
      setOpen(true);
    }, 450);
  }

  function handleFocus() {
    clearHoverTimer();
    updatePosition();
    setOpen(true);
  }

  if (!username) {
    return children;
  }

  const shown =
    profile ||
    (typeof user === "object" && user !== null
      ? user
      : { username });

  return (
    <>
      <span
        ref={containerRef}
        className="user-hover-container"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={scheduleClose}
        onFocus={handleFocus}
      >
        <Link
          ref={triggerRef}
          to={`/perfil/${encodeURIComponent(username)}`}
          className="user-hover-trigger"
          onClick={closeCard}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {children}
        </Link>
      </span>

      {open &&
        createPortal(
          <div
            ref={cardRef}
            className={`user-hover-card user-hover-card-${position.placement}`}
            role="dialog"
            aria-label={`Perfil de ${shown.nombre || username}`}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              visibility: "hidden",
            }}
            onMouseEnter={clearHoverTimer}
            onMouseLeave={scheduleClose}
            onFocus={handleFocus}
          >
            <div className="user-hover-cover" />

            <div className="user-hover-content">
              <UserAvatar user={shown} size={58} />

              {loading && !profile ? (
                <p className="user-hover-loading">
                  Cargando perfil...
                </p>
              ) : (
                <>
                  <strong className="user-hover-name">
                    {shown.nombre || username}
                  </strong>

                  <span className="user-hover-username">
                    @{username}
                  </span>

                  <p className="user-hover-bio">
                    {shown.descripcion || "Sin descripción"}
                  </p>

                  {Array.isArray(shown.gruposFavoritos) &&
                    shown.gruposFavoritos.length > 0 && (
                      <div className="user-hover-groups">
                        {shown.gruposFavoritos
                          .slice(0, 3)
                          .map((group) => (
                            <span
                              className="pill pink"
                              key={group}
                            >
                              {group}
                            </span>
                          ))}
                      </div>
                    )}

                  <div className="user-hover-stats">
                    <span>
                      <strong>
                        {shown.totalPublicaciones ?? "—"}
                      </strong>
                      Publicaciones
                    </span>

                    <span>
                      <strong>
                        {shown.totalAmigos ?? "—"}
                      </strong>
                      Amigos
                    </span>
                  </div>

                  <Link
                    to={`/perfil/${encodeURIComponent(username)}`}
                    className="btn btn-primary user-hover-button"
                    onClick={closeCard}
                  >
                    Ver perfil
                  </Link>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {open &&
        createPortal(
          <style>
            {`
              .user-hover-card {
                visibility: visible !important;
              }
            `}
          </style>,
          document.head
        )}
    </>
  );
}