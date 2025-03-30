'use client';

import { useState } from 'react';
import { useFavorites } from '@/lib/FavoritesContext';
import { RecipeCard } from '@/components/RecipeCard';
import { PageLayout } from '@/components/PageLayout';
import { Trash2 } from 'lucide-react';

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFavorites = searchTerm
    ? favorites.filter(recipe => 
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.storeName.toLowerCase().includes(searchTerm.toLowerCase()))
    : favorites;

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50 pb-10">
        <div className="container mx-auto max-w-4xl p-4">
          <header className="text-center my-6">
            <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">Your Favorite Recipes</h1>
            <p className="text-amber-800 mb-4">Recipes you've saved for later</p>
            
            <div className="max-w-md mx-auto mb-6">
              <input
                type="text"
                placeholder="Search your favorites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-full border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </header>

          {favorites.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 max-w-xl mx-auto text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Favorites Yet</h3>
              <p className="text-gray-600 mb-4">
                When you find recipes you love, click the heart icon to save them here!
              </p>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-6 max-w-xl mx-auto text-center">
              <h3 className="text-base font-semibold text-gray-800 mb-2">No Matching Recipes</h3>
              <p className="text-gray-600 mb-4 text-sm">
                We couldn't find any recipes matching your search term.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFavorites.map((recipe) => (
                <div key={recipe.id} className="relative">
                  <div className="mb-6">
                    <RecipeCard
                      title={recipe.title}
                      ingredients={recipe.ingredients}
                      savings={recipe.savings}
                      recipeUrl={recipe.recipeUrl}
                      imageUrl={recipe.imageUrl}
                      storeId={recipe.storeId}
                      storeName={recipe.storeName}
                    />
                  </div>
                  <button
                    onClick={() => removeFavorite(recipe.id)}
                    className="absolute bottom-2 right-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-full p-1 transition-colors duration-200"
                    title="Remove from favorites"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
} 