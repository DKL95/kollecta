import { useState } from "react";
import EmptyState from "../components/EmptyState";
import GroupCard from "../components/GroupCard";
import { GROUPS } from "../data/mockData";
import useFollowedGroups from "../hooks/useFollowedGroups";

export default function GroupsPage() {
  const { followed, isFollowing, toggleFollow } = useFollowedGroups();
  const [activeTab, setActiveTab] = useState("Todos");

  const tabs = ["Todos", `Siguiendo (${followed.length})`];
  const groups = activeTab === "Todos" ? GROUPS : GROUPS.filter((group) => isFollowing(group.name));

  return (
    <main className="page">
      <div className="tabs">
        {tabs.map((tab, index) => {
          const value = index === 0 ? "Todos" : "Siguiendo";
          return (
            <span key={value} className={`tab ${activeTab === value ? "active" : ""}`} onClick={() => setActiveTab(value)}>
              {tab}
            </span>
          );
        })}
      </div>

      <div className="grid grid-4">
        {groups.map((group) => (
          <GroupCard key={group.name} group={group} following={isFollowing(group.name)} onToggleFollow={() => toggleFollow(group.name)} />
        ))}
        {groups.length === 0 && <EmptyState icon="star">Todavía no sigues a ningún grupo.</EmptyState>}
      </div>
    </main>
  );
}
