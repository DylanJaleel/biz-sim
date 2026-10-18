export function PageSkeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Lädt">
      <div className="skeleton__line skeleton__line--title" />
      <div className="skeleton__block" />
      <div className="skeleton__line" />
    </div>
  );
}
