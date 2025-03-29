'use client';

import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="top-nav">
      <Link href="#how-it-works" className="nav-link">How It Works</Link>
      <Link href="#about" className="nav-link">About</Link>
    </nav>
  );
} 