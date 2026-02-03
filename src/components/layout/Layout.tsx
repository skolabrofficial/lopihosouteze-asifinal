import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Gradient transition from header to content */}
      <div className="h-8 bg-gradient-to-b from-background/80 via-background/40 to-transparent -mt-2 relative z-10 pointer-events-none" />
      <main className="animate-fade-in -mt-4">{children}</main>
    </div>
  );
}
