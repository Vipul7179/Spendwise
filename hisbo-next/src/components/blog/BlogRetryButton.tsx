'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function BlogRetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" className="retry" disabled={pending}
      onClick={() => startTransition(() => router.refresh())}>
      {pending ? 'Trying again…' : 'Try again'}
    </button>
  );
}
