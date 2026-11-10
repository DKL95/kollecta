import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CollectionPage from "./pages/CollectionPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupsPage from "./pages/GroupsPage";
import PostDetailPage from "./pages/PostDetailPage";
import HomePage from "./pages/HomePage";
import MarketplacePage from "./pages/MarketplacePage";
import MessagesPage from "./pages/MessagesPage";
import NotFoundPage from "./pages/NotFoundPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import SellPage from "./pages/SellPage";

// Todas las pantallas de la app y su ruta. `handle` define el título de la barra superior.
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/inicio" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/registro", element: <RegisterPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/publicaciones/:id", element: <PostDetailPage />, handle: { title: "Publicación", subtitle: "Detalle de publicación" } },
      { path: "/inicio", element: <HomePage />, handle: { title: "Inicio", subtitle: "Lo último de tus grupos y amigos" } },
      { path: "/buscar", element: <SearchPage />, handle: { title: "Buscar", subtitle: "Grupos, merch y personas en un solo lugar" } },
      { path: "/notificaciones", element: <NotificationsPage />, handle: { title: "Notificaciones" } },
      { path: "/mensajes", element: <MessagesPage />, handle: { title: "Mensajes" } },
      { path: "/marketplace", element: <MarketplacePage />, handle: { title: "Marketplace", subtitle: "Compra, vende e intercambia merch oficial" } },
      { path: "/marketplace/:productId", element: <ProductDetailPage />, handle: { title: "Detalle de artículo", subtitle: "Marketplace" } },
      { path: "/articulo/:productId", element: <ProductDetailPage />, handle: { title: "Detalle de artículo", subtitle: "Mi colección" } },
      { path: "/marketplace/:productId", element: <ProductDetailPage />, handle: { title: "Detalle de artículo", subtitle: "Marketplace" } },
      { path: "/articulo/:productId", element: <ProductDetailPage />, handle: { title: "Detalle de artículo", subtitle: "Mi colección" } },
      { path: "/vender", element: <SellPage />, handle: { title: "Vender / Intercambiar", subtitle: "Publica una pieza de tu colección" } },
      { path: "/coleccion", element: <CollectionPage />, handle: { title: "Mi colección", subtitle: "Tu vitrina personal de merch" } },
      { path: "/perfil", element: <ProfilePage />, handle: { title: "Mi perfil" } },
      { path: "/perfil/:username", element: <ProfilePage />, handle: { title: "Perfil" } },
      { path: "/grupos", element: <GroupsPage />, handle: { title: "Grupos", subtitle: "Sigue a tus grupos favoritos y no te pierdas su merch" } },
      { path: "/grupos/:groupName", element: <GroupDetailPage />, handle: { title: "Detalle de grupo" } },
      { path: "*", element: <NotFoundPage />, handle: { title: "Página no encontrada" } },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
