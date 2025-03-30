'use client';

import { UserRegistrationForm } from '@/components/UserRegistrationForm';
import { PageLayout } from '@/components/PageLayout';

export default function OnboardingPage() {
  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50">
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
    </PageLayout>
  );
} 