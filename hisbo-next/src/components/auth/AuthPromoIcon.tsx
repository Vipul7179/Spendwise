export default function AuthPromoIcon({ name }: { name: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'tracking' ? <><path d="M4 20V13M10 20V9M16 20v-7M22 20V5M3 8l6-5 6 4 6-5" /></> :
      name === 'budgets' ? <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></> :
      name === 'goals' ? <><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 12v7M8 21h8" /></> :
      name === 'split' ? <><circle cx="9" cy="7" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3" /></> :
      name === 'privacy' ? <><path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6L12 2Z" /><path d="m8 12 3 3 5-6" /></> :
      <path d="m13 2-9 12h7l-1 8 10-12h-7z" />}
  </svg>;
}
