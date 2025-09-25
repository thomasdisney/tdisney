import '../styles/globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'SlipBot Studio',
  description: 'Plan warehouse sessions with SlipBot drag-and-drop canvas.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
