import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Grupos que sigue el usuario (se guardan en gruposFavoritos en la base de datos)
export default function useFollowedGroups() {
  const { user, saveUser } = useAuth();
  const followed = (user && user.gruposFavoritos) || [];

  async function toggleFollow(groupName) {
    const next = followed.includes(groupName)
      ? followed.filter((name) => name !== groupName)
      : [...followed, groupName];

    saveUser({ ...user, gruposFavoritos: next });
    try {
      const data = await apiRequest("/usuarios/me", { method: "PUT", body: { gruposFavoritos: next } });
      saveUser(data.usuario);
    } catch (error) {
      saveUser(user);
      alert(error.message);
    }
  }

  return { followed, isFollowing: (groupName) => followed.includes(groupName), toggleFollow };
}
