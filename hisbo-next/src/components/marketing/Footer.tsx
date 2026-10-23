import Link from 'next/link';
import Image from '@/components/common/SkeletonImage';

export default function Footer() {
  return (
    <footer className="lft" role="contentinfo" aria-label="Site footer">
      <div className="footer-brand-wrap">
        <Link className="abrand" href="/" aria-label="Hisbo home">
          <span className="tlogo">
            <Image
              src="/logo-mark.webp"
              alt="Hisbo logo"
              width={32}
              height={32}
              className="lgi"
            />
          </span>
          <span className="abrand-text">Hisbo</span>
        </Link>
      </div>

      <div className="footer-links-row">
        <a href="https://www.instagram.com/thevipulshow" target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        <a href="https://www.linkedin.com/in/vipul-singh-46792a1a4" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <Link href="/blog">
          Blog
        </Link>
        <Link href="/privacy">
          Terms and Privacy
        </Link>
        <a href="mailto:vipulsingh.prof@gmail.com?subject=Hisbo%20support%20request">
          Contact support
        </a>
      </div>

      <div className="footer-copy-row">
        <span>Made with care by <b>Vipul Singh</b></span>
        <span className="footer-copy-sep">&bull;</span>
        <span>&copy; 2026 Hisbo</span>
      </div>
    </footer>
  );
}
