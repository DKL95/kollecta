// Panel izquierdo decorativo de login / registro
export default function AuthVisual({ headline, sub, cards }) {
  return (
    <div className="auth-visual">
      <div className="brand">
        Kollect<span>A</span>
      </div>
      <div>
        <div className="headline">{headline}</div>
        <div className="sub">{sub}</div>
        <div className="auth-mock-cards">
          {cards.map(([top, bottom]) => (
            <div className="auth-mock-card" key={top + bottom}>
              {top}
              <br />
              {bottom}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.8 }}>© 2026 KollectA — Proyecto académico, Programación Web II</div>
    </div>
  );
}
