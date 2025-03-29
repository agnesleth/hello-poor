import { PreferencesForm } from '@/components/PreferencesForm';
import { Navbar } from '@/components/Navbar';
import { PageLayout } from '@/components/PageLayout';

export default function PreferencesPage() {
  return (
    <PageLayout>
      <main>
        <Navbar />
        <div className="container">
          <h1 className="hero-text">HELLO POOR</h1>
          <p className="subtitle">
            Hungry and poor? We got you. Type in your city and get recipes based on real grocery deals near you.
          </p>
          <PreferencesForm />
        </div>
      </main>
    </PageLayout>
  );
} 