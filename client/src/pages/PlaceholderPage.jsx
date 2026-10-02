export default function PlaceholderPage({ title, description }) {
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">PHASE 1 FOUNDATION</p><h1>{title}</h1><p>{description}</p></div></div><div className="empty-state"><span>◇</span><h2>Foundation ready</h2><p>The route, navigation and database tables are in place for this module.</p></div></section>;
}
