import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';

export default function BlogLoading() {
  return (
    <div className="lp">
      <Navbar />

      <main className="blog-shell" aria-busy="true" aria-label="Loading blog articles">
        <div className="blog-toolbar" style={{ opacity: 0.6, pointerEvents: 'none' }}>
          <div className="row">
            <span className="g" style={{ padding: '6px 14px' }}>
              All articles
            </span>
          </div>
          <div className="row blog-search">
            <div style={{ height: '42px', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--line)', width: '100%' }} />
          </div>
        </div>

        <div className="blog-skeletons">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="blog-skeleton">
              <div className="img" />
              <div className="line short" />
              <div className="line mid" />
              <div className="line" />
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
