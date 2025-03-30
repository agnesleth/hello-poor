'use client';

import { ReactNode, useState, useEffect } from 'react';
import { FirebaseAppProvider, FirestoreProvider, FunctionsProvider, useFirebaseApp } from 'reactfire';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from '@/lib/firebase';
import { FavoritesProvider } from '@/lib/FavoritesContext';

// This component initializes Firebase services after the FirebaseApp is created
function FirebaseComponents({ children }: { children: ReactNode }) {
  const firebaseApp = useFirebaseApp();
  console.log('🔥 Firebase app initialized with config:', {
    projectId: firebaseApp.options.projectId,
    appId: firebaseApp.options.appId,
  });
  
  // Initialize Firestore
  const firestore = getFirestore(firebaseApp);
  console.log('📚 Firestore initialized');
  
  // Initialize Functions with region
  const functions = getFunctions(firebaseApp, 'us-central1');
  console.log('⚙️ Firebase Functions initialized with region: us-central1');

  return (
    <FirestoreProvider sdk={firestore}>
      <FunctionsProvider sdk={functions}>
        <FavoritesProvider>
          {children}
        </FavoritesProvider>
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
    console.log('🏁 Client-side rendering activated');
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Return nothing on the server
  }

  console.log('🔧 Firebase config being used:', {
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
  });
  
  return (
    <FirebaseAppProvider firebaseConfig={firebaseConfig}>
      <FirebaseComponents>
        {children}
      </FirebaseComponents>
    </FirebaseAppProvider>
  );
} 