import { UserRegistrationForm } from '@/components/UserRegistrationForm';

export default function OnboardingPage() {
  return (
    <main className="container">
      <div className="max-w-xl mx-auto">
        <h1 className="hero-text">HELLO POOR</h1>
        <p className="subtitle">
          Hungry and poor? We got you. Type in your city and get recipes based on real
          grocery deals near you.
        </p>
        <UserRegistrationForm />
      </div>
    </main>
  );
} 