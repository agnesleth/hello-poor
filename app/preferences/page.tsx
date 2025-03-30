import { PreferencesForm } from '@/components/PreferencesForm';
import { Navbar } from '@/components/Navbar';
import { PageLayout } from '@/components/PageLayout';
import Link from 'next/link';

export default function PreferencesPage() {
  return (
    <PageLayout>
      <main className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50">
        <Navbar />
        
        <div className="top-nav">
          <Link href="/#how-it-works" className="nav-link">How It Works</Link>
          <Link href="/#about" className="nav-link">About</Link>
        </div>
        
        <div className="container">
          <div className="w-full max-w-4xl mx-auto">
            <h1 className="hero-text text-amber-900">HELLO POOR</h1>
            <p className="subtitle text-amber-800 w-full max-w-4xl mx-auto">
              Hungry and poor? We got you. Type in your city and get recipes based on real grocery deals near you.
            </p>
            <div className="max-w-xl mx-auto w-full">
              <PreferencesForm />
            </div>
          </div>
        </div>
      </main>
    </PageLayout>
  );
} 