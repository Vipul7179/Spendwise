import Link from 'next/link';

export default function ArticleNotFound() {
  return <section className="blog-shell">
    <div className="blog-empty">This article could not be found or is not public yet.</div>
    <Link className="backlink" href="/blog">&larr; Back to blog</Link>
  </section>;
}
