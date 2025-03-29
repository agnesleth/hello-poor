'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface City {
  id: string;
  name: string;
  stores: string[];
}

function formatStoreName(storeName: string): string {
  return storeName
    .split('-')
    .slice(0, -1) // Remove the ID part
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
    .join(' ');
}

export function UserRegistrationForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [stores, setStores] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesCollection = collection(db, 'cities');
        const citiesSnapshot = await getDocs(citiesCollection);
        const citiesData = citiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name,
          stores: doc.data().stores || []
        })) as City[];
        setCities(citiesData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching cities:', error);
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      const city = cities.find(c => c.id === selectedCity);
      setStores(city?.stores || []);
      setSelectedStores([]); // Reset selected stores when city changes
    }
  }, [selectedCity, cities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userRef = await addDoc(collection(db, 'users'), {
        name,
        email,
        allowed_stores: selectedStores
      });

      localStorage.setItem('userId', userRef.id);
      router.push('/preferences');
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-field">
        <input
          type="text"
          placeholder="ENTER YOUR NAME HERE."
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="form-field">
        <input
          type="email"
          placeholder="ENTER YOUR EMAIL HERE."
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <select
          className="input"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          required
        >
          <option value="">ENTER YOUR TOWN HERE.</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {stores.length > 0 && (
        <div className="store-list">
          {stores.map((store) => (
            <label key={store} className="store-option">
              <input
                type="checkbox"
                value={store}
                checked={selectedStores.includes(store)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStores([...selectedStores, store]);
                  } else {
                    setSelectedStores(selectedStores.filter(s => s !== store));
                  }
                }}
              />
              <span>{formatStoreName(store).toUpperCase()}</span>
            </label>
          ))}
        </div>
      )}

      <button type="submit" className="button">
        CONTINUE
      </button>
    </form>
  );
} 