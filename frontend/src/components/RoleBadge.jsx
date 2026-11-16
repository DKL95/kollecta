// Insignia pequeña junto al nombre: "Mod" o "Admin". Los usuarios normales no llevan.
export default function RoleBadge({ rol }) {
  if (rol !== "moderador" && rol !== "administrador") return null;
  const esAdmin = rol === "administrador";
  return (
    <span
      className={`role-badge ${esAdmin ? "admin" : "mod"}`}
      title={esAdmin ? "Administrador de KollectA" : "Moderador de la comunidad"}
    >
      {esAdmin ? "Admin" : "Mod"}
    </span>
  );
}
