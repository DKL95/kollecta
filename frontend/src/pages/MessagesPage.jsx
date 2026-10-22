import { useEffect, useRef, useState } from "react";
import Avatar, { UserAvatar } from "../components/Avatar";
import Icon from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { THREADS } from "../data/mockData";

export default function MessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState(THREADS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const chatBody = useRef(null);

  const activeThread = threads[activeIndex];

  useEffect(() => {
    chatBody.current.scrollTop = chatBody.current.scrollHeight;
  }, [activeIndex, threads]);

  function handleSend(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setThreads(
      threads.map((thread, index) =>
        index === activeIndex ? { ...thread, messages: [...thread.messages, { mine: true, text: draft.trim() }] } : thread
      )
    );
    setDraft("");
  }

  return (
    <main className="messages-shell">
      <div className="thread-list">
        {threads.map((thread, index) => (
          <div key={thread.name} className={`thread-item ${index === activeIndex ? "active" : ""}`} onClick={() => setActiveIndex(index)}>
            <Avatar initials={thread.initials} />
            <div className="info">
              <div className="top-line">
                <span className="n">{thread.name}</span>
                <span className="t">{thread.time}</span>
              </div>
              <div className="preview">{thread.messages[thread.messages.length - 1].text}</div>
            </div>
            {thread.unread > 0 && <span className="unread">{thread.unread}</span>}
          </div>
        ))}
      </div>

      <div className="chat-col">
        <div className="chat-head">
          <Avatar initials={activeThread.initials} />
          <div>
            <div className="n">{activeThread.name}</div>
            <div className="status">
              {activeThread.online ? (
                <>
                  <span className="status-dot"></span> En línea
                </>
              ) : (
                "Desconectado"
              )}
            </div>
          </div>
        </div>
        <div className="chat-body" ref={chatBody}>
          {activeThread.messages.map((message, index) => (
            <div key={index} className={`msg-row ${message.mine ? "mine" : ""}`}>
              {message.mine ? (
                <UserAvatar user={user} size={28} fontSize={10} />
              ) : (
                <Avatar initials={activeThread.initials} size={28} fontSize={10} />
              )}
              <div className="bubble">{message.text}</div>
            </div>
          ))}
        </div>
        <form className="chat-input-row" onSubmit={handleSend}>
          <button type="button" className="icon-btn" title="Adjuntar">
            <Icon name="paperclip" size={16} />
          </button>
          <input type="text" placeholder="Escribe un mensaje…" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Enviar
          </button>
        </form>
      </div>
    </main>
  );
}
