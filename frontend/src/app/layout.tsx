import { AuthProvider } from '@/lib/auth-context';
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-jakarta-sans',
  subsets: ['latin'],
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'E-commerce - Autentikasi',
  description: 'Platform e-commerce dengan sistem autentikasi lengkap',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${plusJakartaSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased font-jakarta-sans`}>
        <AuthProvider>
        
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
