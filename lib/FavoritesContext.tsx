'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  recipeUrl?: string;
  ingredients: {
    name: string;
    price: number;
    originalPrice: number;
  }[];
  savings: number;
  storeId: string;
  storeName: string;
}

interface FavoritesContextType {
  favorites: Recipe[];
  addFavorite: (recipe: Recipe) => void;
  removeFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Recipe[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (error) {
        console.error('Failed to parse favorites from localStorage:', error);
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (recipe: Recipe) => {
    setFavorites((prevFavorites) => {
      // Check if recipe already exists to avoid duplicates
      if (prevFavorites.some(fav => fav.id === recipe.id)) {
        return prevFavorites;
      }
      return [...prevFavorites, recipe];
    });
  };

  const removeFavorite = (recipeId: string) => {
    setFavorites((prevFavorites) => 
      prevFavorites.filter(recipe => recipe.id !== recipeId)
    );
  };

  const isFavorite = (recipeId: string) => {
    return favorites.some(recipe => recipe.id === recipeId);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
} 