import { UserRegistrationForm } from '@/components/UserRegistrationForm';
import Image from 'next/image';
import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50">
      <div className="logo-container">
        <Link href="/">
          <Image 
            src="/logo.svg" 
            alt="94 Logo" 
            width={64} 
            height={64} 
            className="logo"
            priority
          />
        </Link>
      </div>
      
      <div className="top-nav">
        <Link href="/#how-it-works" className="nav-link">How It Works</Link>
        <Link href="/#about" className="nav-link">About</Link>
      </div>
      
      <main className="container">
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="hero-text text-amber-900">HELLO POOR</h1>
          <p className="subtitle text-amber-800 w-full max-w-4xl mx-auto">
            Hungry and poor? We got you. Type in your city and get recipes based on real grocery deals near you.
          </p>
          <div className="max-w-xl mx-auto w-full">
            <UserRegistrationForm />
          </div>
        </div>
      </main>
    </div>
  );
} 