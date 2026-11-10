export default function FilterChips({ options, active, onChange, allLabel = "Todos" }) {
  return (
    <div className="filter-row">
      {[allLabel, ...options].map((option, index) => {
        const value = index === 0 ? "Todos" : option;
        return (
          <span key={value} className={`chip ${active === value ? "active" : ""}`} onClick={() => onChange(value)}>
            {option}
          </span>
        );
      })}
    </div>
  );
}
