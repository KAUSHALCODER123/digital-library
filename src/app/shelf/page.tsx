import type { Metadata } from 'next';
import { ShelfView } from '@/components/shelf/ShelfView';

export const metadata: Metadata = {
  title: 'My shelf',
  description: 'Books you want to read, are reading, have read and love.',
  robots: { index: false },
};

export default function ShelfPage() {
  return <ShelfView />;
}
