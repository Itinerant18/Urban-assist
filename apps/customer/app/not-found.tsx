import Link from 'next/link';
import { Button, EmptyState } from '@urban-assist/ui';

export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <div className="flex gap-2">
            <Link href="/"><Button>Back to home</Button></Link>
            <Link href="/services"><Button variant="outline">Browse services</Button></Link>
          </div>
        }
      />
    </main>
  );
}
