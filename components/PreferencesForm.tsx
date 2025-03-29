'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const PREFERENCES = [
  'High Protein',
  'Vegetarian',
  'Swedish',
  'Italian',
  'Chicken',
  'Asian',
  'Gluten-free'
];

export function PreferencesForm() {
  const router = useRouter();
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userId = localStorage.getItem('userId');
    if (!userId) {
      // Redirect to registration if no user ID
      router.push('/');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        preferences: selectedPrefs
      });

      router.push('/recipes');
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const togglePreference = (pref: string) => {
    if (selectedPrefs.includes(pref)) {
      setSelectedPrefs(selectedPrefs.filter(p => p !== pref));
    } else {
      setSelectedPrefs([...selectedPrefs, pref]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="preference-list">
        {PREFERENCES.map((pref) => (
          <label key={pref} className="preference-option">
            <input
              type="checkbox"
              value={pref}
              checked={selectedPrefs.includes(pref)}
              onChange={() => togglePreference(pref)}
            />
            <span>{pref.toUpperCase()}</span>
          </label>
        ))}
      </div>

      <button type="submit" className="button">
        GET MY RECIPES!
      </button>
    </form>
  );
} 