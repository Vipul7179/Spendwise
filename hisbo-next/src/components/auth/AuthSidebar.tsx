'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const WORDS = ['your spending', 'your budgets', 'your savings', 'shared bills'];

export default function AuthSidebar() {
  const [wordIndex, setWordIndex] = useState(0);
  const [isOut, setIsOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOut(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % WORDS.length);
        setIsOut(false);
      }, 300);
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="ah">
      <i className="bl b1" />
      <i className="bl b2" />
      <i className="bl b3" />
      <div className="atop">
        <Link className="abrand" href="/" aria-label="Hisbo home">
          <span className="tlogo">
            <Image
              src="/logo-mark.webp"
              alt="Hisbo"
              width={32}
              height={32}
              className="lgi"
            />
          </span>
          Hisbo
        </Link>
        <Link className="bkb" href="/">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>

      <h1 className="ht">
        Take control of <span id="rot" className={isOut ? 'out' : ''}>{WORDS[wordIndex]}</span>
      </h1>
      <p className="hp2">
        Track expenses, set smart budgets, reach savings goals and split bills with friends.
      </p>

      <div className="fcs" aria-hidden="true">
        <div className="fc f1">
          <span className="m2">Groceries</span>
          <b>&minus;₹850</b>
        </div>
        <div className="fc f2">
          <span className="m2">Food budget &middot; 62% used</span>
          <div className="mb">
            <i />
          </div>
        </div>
        <div className="fc f3">
          <span className="m2">Goal reached</span>
          <b>New phone &#127881;</b>
        </div>
      </div>
    </aside>
  );
}

