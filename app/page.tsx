'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PageLayout } from '@/components/PageLayout';

export default function Home() {
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <PageLayout>
      <main className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50">
        <div className="top-nav">
          <a className="nav-link" onClick={() => scrollToSection(howItWorksRef)}>How It Works</a>
          <a className="nav-link" onClick={() => scrollToSection(aboutRef)}>About</a>
        </div>

        <div className="container" style={{ paddingBottom: '0', minHeight: 'auto' }}>
          <h1 className="hero-text text-amber-900">HELLO POOR</h1>
          
          <p className="subtitle text-amber-800">
            Hungry and poor? We got you. Type in your city and get recipes based on real
            grocery deals near you.
          </p>

          <Link href="/onboarding" className="button">
            GET STARTED!
          </Link>
        </div>

        <div id="how-it-works" ref={howItWorksRef} className="section" style={{ paddingTop: '1rem' }}>
          <h2 className="section-title text-amber-900">How It Works</h2>
          <p className="section-content text-amber-800">
            Our app makes it easy to eat well on a budget by connecting you with recipes that use
            ingredients on sale near you.
          </p>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Image
                  src="/shopping-bag.svg"
                  alt="Find Deals"
                  width={32}
                  height={32}
                />
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-900">Find Deals</h3>
              <p className="text-amber-700">Discover discounted ingredients at local stores in your neighborhood.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Image
                  src="/recipe.svg"
                  alt="Get Recipes"
                  width={32}
                  height={32}
                />
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-900">Get Recipes</h3>
              <p className="text-amber-700">See delicious recipes that use those discounted ingredients from local stores.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Image
                  src="/piggy-bank.svg"
                  alt="Save Money"
                  width={32}
                  height={32}
                />
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-900">Save Money</h3>
              <p className="text-amber-700">Cook delicious meals while staying on budget and saving money every week.</p>
            </div>
          </div>
        </div>

        <div id="about" ref={aboutRef} className="section bg-amber-100/50" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          <h2 className="section-title text-amber-900">About</h2>
          <div className="section-content">
            <p className="mb-4 text-amber-800">
              Hello Poor was created to help people eat well without breaking the bank. Our mission is to make 
              nutritious, delicious meals accessible to everyone, regardless of budget constraints.
            </p>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
