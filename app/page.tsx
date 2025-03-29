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
      <main>
        <div className="top-nav">
          <a className="nav-link" onClick={() => scrollToSection(howItWorksRef)}>How It Works</a>
          <a className="nav-link" onClick={() => scrollToSection(aboutRef)}>About</a>
        </div>

        <div className="container" style={{ paddingBottom: '0', minHeight: 'auto' }}>
          <h1 className="hero-text">HELLO POOR</h1>
          
          <p className="subtitle">
            Hungry and poor? We got you. Type in your city and get recipes based on real
            grocery deals near you.
          </p>

          <Link href="/onboarding" className="button" style={{ marginBottom: '2rem' }}>
            GET STARTED!
          </Link>
        </div>

        <div id="how-it-works" ref={howItWorksRef} className="section" style={{ paddingTop: '1rem' }}>
          <h2 className="section-title">How It Works</h2>
          <p className="section-content">
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
              <h3 className="text-xl font-bold mb-2">Find Deals</h3>
              <p>Discover discounted ingredients at local stores in your neighborhood.</p>
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
              <h3 className="text-xl font-bold mb-2">Get Recipes</h3>
              <p>See delicious recipes that use those discounted ingredients from local stores.</p>
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
              <h3 className="text-xl font-bold mb-2">Save Money</h3>
              <p>Cook delicious meals while staying on budget and saving money every week.</p>
            </div>
          </div>
        </div>

        <div id="about" ref={aboutRef} className="section" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          <h2 className="section-title">About</h2>
          <div className="section-content">
            <p className="mb-4">
              Hello Poor was created to help people eat well without breaking the bank. Our mission is to make 
              nutritious, delicious meals accessible to everyone, regardless of budget constraints.
            </p>
            <p>
              We partner with local grocery stores to get real-time deal information and generate recipes 
              specifically tailored to use those discounted ingredients, helping you save money while enjoying 
              great food.
            </p>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
