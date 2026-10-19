import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="lft">
      Made with care by <b>Vipul Singh</b>
      <div style={{ margin: '8px 0' }}>
        <a href="https://www.instagram.com/thevipulshow" target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
        <a href="https://www.linkedin.com/in/vipul-singh-46792a1a4" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <Link href="/privacy">
          Terms and Privacy
        </Link>
        <a href="mailto:vipulsingh.prof@gmail.com?subject=Hisbo%20support%20request">
          Contact support
        </a>
      </div>
      &copy; 2026 Hisbo
    </footer>
  );
}

