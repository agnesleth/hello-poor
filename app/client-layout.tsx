'use client';

import { ReactNode, useState, useEffect } from 'react';
import { FirebaseAppProvider, FirestoreProvider, FunctionsProvider, useFirebaseApp } from 'reactfire';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from '@/lib/firebase';

// This component initializes Firebase services after the FirebaseApp is created
function FirebaseComponents({ children }: { children: ReactNode }) {
  const firebaseApp = useFirebaseApp();
  const firestore = getFirestore(firebaseApp);
  const functions = getFunctions(firebaseApp);

  return (
    <FirestoreProvider sdk={firestore}>
      <FunctionsProvider sdk={functions}>
        {children}
      </FunctionsProvider>
    </FirestoreProvider>
  );
}

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Prevent hydration errors by rendering conditionally in useEffect
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Return nothing on the server
  }

  return (
    <FirebaseAppProvider firebaseConfig={firebaseConfig}>
      <FirebaseComponents>
        {children}
      </FirebaseComponents>
    </FirebaseAppProvider>
  );
} 