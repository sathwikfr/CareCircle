import { notFound } from 'next/navigation';
import { OrbPlayground } from '@/components/voice/OrbPlayground';

// Tuning page for the Saathi voice orb. Only exists under `next dev`.
export default function OrbDevPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <OrbPlayground />;
}
