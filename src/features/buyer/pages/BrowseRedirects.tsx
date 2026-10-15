import { Navigate, useLocation, useParams } from 'react-router-dom';

/** Old `/c/:slug` links -> the homepage shop (`/?category=<slug>`), keeping sort / class / filters. */
export function CategoryRedirect() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { search } = useLocation();
  const next = new URLSearchParams(search);
  next.set('category', slug);
  return <Navigate to={`/?${next.toString()}`} replace />;
}

/** Old `/search?q=x` links -> `/?search=x` (other filters kept; bare `/search` -> home). */
export function SearchRedirect() {
  const { search } = useLocation();
  const next = new URLSearchParams(search);
  const q = next.get('q');
  if (q != null) { next.delete('q'); if (q.trim()) next.set('search', q.trim()); }
  const qs = next.toString();
  return <Navigate to={qs ? `/?${qs}` : '/'} replace />;
}
