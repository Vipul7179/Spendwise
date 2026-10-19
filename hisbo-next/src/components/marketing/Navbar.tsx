import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <header className="lh">
      <Link className="abrand" href="/" aria-label="Hisbo home">
        <span className="tlogo">
          <Image
            src="/logo-mark.webp"
            alt="Hisbo logo"
            width={32}
            height={32}
            priority
            className="lgi"
          />
        </span>
        <span>Hisbo</span>
      </Link>

      <nav className="lnavc" role="navigation" aria-label="Sections">
        <a href="#features">Features</a>
        <a href="#how">How it works</a>
        <a href="#faq">FAQ</a>
      </nav>

      <div className="lnav">
        <Link className="landing-blog-link" href="/blog">
          Blog
        </Link>
        <Link className="lbtn ol" href="/login">
          Log in
        </Link>
        <Link className="lbtn p" href="/signup">
          Sign up
        </Link>
      </div>
    </header>
  );
}

