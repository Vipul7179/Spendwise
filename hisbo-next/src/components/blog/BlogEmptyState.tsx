import React from 'react';

interface BlogEmptyStateProps {
  kind?: 'empty' | 'config' | 'error';
  compact?: boolean;
}

export function BlogEmptyIllustration() {
  return (
    <div className="blog-empty-art" aria-hidden="true">
      <svg viewBox="0 0 220 132" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 116c16-36 41-53 82-53s66 17 82 53" fill="color-mix(in srgb, var(--ok) 8%, var(--card))" />
        <rect x="48" y="39" width="124" height="76" rx="12" fill="var(--card)" stroke="color-mix(in srgb, var(--ok) 28%, var(--line))" strokeWidth="2" />
        <path d="M69 85h20V65H69v20Zm31 0h20V54h-20v31Zm31 0h20V71h-20v14Z" fill="color-mix(in srgb, var(--ok) 20%, var(--card))" />
        <path d="M68 94h86M68 101h54" stroke="color-mix(in srgb, var(--ok) 34%, var(--line))" strokeWidth="3" strokeLinecap="round" />
        <path d="M28 108h19l7-13 10 17 8-8h14" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M162 105h31m-25-7h19m-13-7h7" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="174" cy="79" r="14" fill="color-mix(in srgb, #f5b301 20%, var(--card))" stroke="color-mix(in srgb, #f5b301 55%, var(--line))" strokeWidth="2" />
        <path d="M174 70v18m5-14c-1-2-3-3-5-3-3 0-5 2-5 4 0 7 10 3 10 9 0 2-2 4-5 4-2 0-4-1-5-3" stroke="#a76a00" strokeWidth="2" strokeLinecap="round" />
        <path d="M49 34c-5-15 1-26 13-30 4 13-1 23-13 30Zm4 4c8-15 19-18 29-13-6 13-16 17-29 13Z" fill="color-mix(in srgb, var(--ok) 45%, var(--card))" stroke="color-mix(in srgb, var(--ok) 55%, var(--line))" strokeWidth="1.5" />
        <path d="M51 37v16" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function BlogEmptyState({ kind = 'empty', compact = false }: BlogEmptyStateProps) {
  const copy = {
    empty: {
      heading: 'A little knowledge. A better financial future.',
      description: 'Practical ideas to help you manage your money, build healthier habits, and make smarter financial decisions.',
      status: 'Articles coming soon',
    },
    config: {
      heading: 'The Hisbo Journal is getting ready.',
      description: 'We are preparing thoughtful ideas for your financial journey. Please check back soon.',
      status: 'Opening soon',
    },
    error: {
      heading: 'The journal is taking a short pause.',
      description: "We couldn't load the journal right now. Please try again shortly.",
      status: 'Temporarily unavailable',
    },
  }[kind];

  const TitleTag = compact ? 'h2' : 'h1';

  return (
    <div className={`blog-empty-state${compact ? ' journal-empty' : ''}`}>
      <BlogEmptyIllustration />
      <span className="status">
        <i />
        {copy.status}
      </span>
      <TitleTag>{copy.heading}</TitleTag>
      <p>{copy.description}</p>
    </div>
  );
}

