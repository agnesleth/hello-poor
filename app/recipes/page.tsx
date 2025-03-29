'use client';

import { useState } from 'react';
import { RecipeCard } from '@/components/RecipeCard';
import { Navbar } from '@/components/Navbar';
import { PageLayout } from '@/components/PageLayout';

const demoRecipes = [
  {
    title: 'Klassisk fläskfilé med ris',
    ingredients: [
      { name: 'Fläskfilé', price: 89.90, originalPrice: 129.90 },
      { name: 'Ris', price: 29.90, originalPrice: 39.90 }
    ],
    savings: 50.00
  },
  {
    title: 'Krämig kycklingpasta',
    ingredients: [
      { name: 'Kycklingfilé', price: 79.90, originalPrice: 109.90 },
      { name: 'Pasta', price: 15.90, originalPrice: 24.90 },
      { name: 'Grädde', price: 19.90, originalPrice: 29.90 }
    ],
    savings: 49.90
  },
  {
    title: 'Vegetarisk currygryta',
    ingredients: [
      { name: 'Kokosmjölk', price: 22.90, originalPrice: 32.90 },
      { name: 'Grönsaker', price: 35.90, originalPrice: 45.90 },
      { name: 'Ris', price: 29.90, originalPrice: 39.90 }
    ],
    savings: 30.90
  },
  {
    title: 'Lax med potatis och dill',
    ingredients: [
      { name: 'Laxfilé', price: 99.90, originalPrice: 139.90 },
      { name: 'Potatis', price: 19.90, originalPrice: 29.90 },
      { name: 'Dill', price: 15.90, originalPrice: 19.90 }
    ],
    savings: 55.00
  }
];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState(demoRecipes);

  const handleRegenerate = () => {
    // In a real app, this would fetch new recipes
    // For demo purposes, just shuffle the existing ones
    setRecipes([...recipes].sort(() => Math.random() - 0.5));
  };

  return (
    <PageLayout>
      <main>
        <Navbar />
        <div className="container">
          <h1 className="hero-text">HELLO POOR</h1>
          <p className="subtitle">
            Hungry and poor? We got you. Type in your city and get recipes based on real grocery deals near you.
          </p>

          <button onClick={handleRegenerate} className="regenerate-button">
            REGENERATE!
          </button>

          <div className="recipe-grid">
            {recipes.map((recipe, index) => (
              <RecipeCard
                key={index}
                title={recipe.title}
                ingredients={recipe.ingredients}
                savings={recipe.savings}
              />
            ))}
          </div>
        </div>
      </main>
    </PageLayout>
  );
} 