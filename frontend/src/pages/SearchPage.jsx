import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../api/client";
import { UserAvatar } from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import GroupCard from "../components/GroupCard";
import ProductCard from "../components/ProductCard";
import { GROUPS, PRODUCTS } from "../data/mockData";
import useFollowedGroups from "../hooks/useFollowedGroups";

const TABS = ["Todo", "Merch", "Grupos", "Personas"];

function matches(text, query) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState("Todo");
  const [people, setPeople] = useState([]);
  const { isFollowing, toggleFollow } = useFollowedGroups();

  useEffect(() => {
    apiRequest(`/usuarios?q=${encodeURIComponent(query)}`)
      .then((data) => setPeople(data.usuarios))
      .catch(() => setPeople([]));
  }, [query]);

  const products = PRODUCTS.filter((product) => matches(product.title, query) || matches(product.group, query));
  const groups = GROUPS.filter((group) => matches(group.name, query) || matches(group.fandom, query));
  const show = (tab) => activeTab === "Todo" || activeTab === tab;

  return (
    <main className="page">
      {query && (
        <p className="sub" style={{ marginBottom: 12 }}>
          Resultados para "<b>{query}</b>"
        </p>
      )}

      <div className="tabs">
        {TABS.map((tab) => (
          <span key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </span>
        ))}
      </div>

      {show("Merch") && (
        <>
          <div className="section-title"><h3>Merch relacionado</h3></div>
          <div className="grid grid-4" style={{ marginBottom: 32 }}>
            {products.slice(0, activeTab === "Todo" ? 4 : undefined).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products.length === 0 && <EmptyState icon="bag">Sin merch para esta búsqueda.</EmptyState>}
          </div>
        </>
      )}

      {show("Grupos") && (
        <>
          <div className="section-title"><h3>Grupos</h3></div>
          <div className="grid grid-4" style={{ marginBottom: 32 }}>
            {groups.slice(0, activeTab === "Todo" ? 4 : undefined).map((group) => (
              <GroupCard key={group.name} group={group} following={isFollowing(group.name)} onToggleFollow={() => toggleFollow(group.name)} />
            ))}
            {groups.length === 0 && <EmptyState icon="star">Sin grupos para esta búsqueda.</EmptyState>}
          </div>
        </>
      )}

      {show("Personas") && (
        <>
          <div className="section-title"><h3>Personas</h3></div>
          <div className="grid grid-4">
            {people.map((person) => (
              <div className="card group-card" key={person.id}>
                <Link to={`/perfil/${person.username}`}>
                  <UserAvatar user={person} size={68} fontSize={20} />
                  <h4>{person.nombre || person.username}</h4>
                </Link>
                <div className="meta">@{person.username}</div>
                <Link to={`/perfil/${person.username}`} className="btn btn-primary btn-sm follow-btn">
                  Ver perfil
                </Link>
              </div>
            ))}
            {people.length === 0 && <EmptyState icon="users">No encontramos personas con ese nombre.</EmptyState>}
          </div>
        </>
      )}
    </main>
  );
}
