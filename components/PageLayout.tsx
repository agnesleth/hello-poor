'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <>
      <div className="logo-container">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="Hello Poor Logo"
            width={64}
            height={64}
            className="logo"
          />
        </Link>
      </div>
      <Navbar />
      {children}
    </>
  );
} 