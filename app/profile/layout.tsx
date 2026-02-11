import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <GlobalHeader variant="default" />
      <main className="flex-1">{children}</main>
      <GlobalFooter variant="standard" />
    </div>
  );
}
