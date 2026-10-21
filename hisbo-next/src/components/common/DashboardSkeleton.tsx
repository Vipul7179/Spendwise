export default function DashboardSkeleton() {
  return <div className="dashboard-skeleton" role="status" aria-label="Loading dashboard">
    <span className="sr-only">Loading dashboard</span>
    <div className="skeleton-block skeleton-heading" aria-hidden="true" />
    <div className="skeleton-block skeleton-hero" aria-hidden="true">
      <span className="skeleton-line" /><span className="skeleton-line skeleton-value" />
      <span className="skeleton-line" /><span className="skeleton-line skeleton-progress" />
    </div>
    <div className="skeleton-summary" aria-hidden="true">
      {[0, 1, 2, 3].map(index => <div className="skeleton-block" key={index}>
        <span className="skeleton-line" /><span className="skeleton-line skeleton-value" />
      </div>)}
    </div>
    <div className="skeleton-block skeleton-chart" aria-hidden="true" />
  </div>;
}
