'use client';

import Link from 'next/link';
import { useFavorites } from '@/lib/FavoritesContext';

export function Navbar() {
  const { favorites } = useFavorites();
  
  return (
    <nav className="top-nav flex justify-center items-center space-x-6 py-4">
      <Link href="/#how-it-works" className="nav-link whitespace-nowrap text-amber-900 hover:text-amber-600 transition-colors">How It Works</Link>
      <Link href="/#about" className="nav-link whitespace-nowrap text-amber-900 hover:text-amber-600 transition-colors">About</Link>
      <Link href="/favorites" className="nav-link whitespace-nowrap flex items-center text-amber-900 hover:text-amber-600 transition-colors">
        Favorites{favorites.length > 0 && <span className="ml-1 text-xs bg-amber-200 text-amber-900 rounded-full px-1.5 py-0.5">{favorites.length}</span>}
      </Link>
    </nav>
  );
} 