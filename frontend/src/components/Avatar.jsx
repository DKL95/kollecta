import Photo from "./Photo";
import { getInitials } from "../utils/format";

export default function Avatar({ initials, src, alt, size, fontSize, background, className = "" }) {
  const style = { position: "relative", overflow: "hidden" };
  if (size) Object.assign(style, { width: size, height: size });
  if (fontSize) style.fontSize = fontSize;
  if (background) style.background = background;

  return (
    <span className={`avatar ${className}`} style={style}>
      {initials}
      <Photo src={src} alt={alt} className="" cover />
    </span>
  );
}

export function UserAvatar({ user, ...props }) {
  return (
    <Avatar
      initials={getInitials(user)}
      src={user && user.fotoPerfil}
      alt={user ? user.nombre || user.username : ""}
      {...props}
    />
  );
}
