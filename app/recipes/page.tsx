'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFunctions, useFirestore } from 'reactfire';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { RecipeCard } from '@/components/RecipeCard';
import { PageLayout } from '@/components/PageLayout';

// Define response type for Firebase function
interface RecipeMatchResponse {
  status?: string;
  recommendations?: Array<{
    recipe_name: string;
    recipe_url?: string;
    recipe_img?: string;
    discounted_ingredients?: string[];
    savings_info?: Array<{
      ingredient: string;
      price: string;
      discount_amount: string;
      discount_percentage: string;
    }>;
  }>;
  error?: string;
}

export default function RecipesPage() {
  const router = useRouter();
  const functions = useFunctions();
  const firestore = useFirestore();

  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.push('/');
      return;
    }

    // Attempt to load the latest recipe matches from Firestore
    const fetchExistingRecipes = async () => {
      try {
        setIsLoading(true);

        const matchesRef = collection(firestore, 'recipe_matches');
        const q = query(
          matchesRef,
          where('user_id', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // If there's a stored recipe match, use it
          const docData = snapshot.docs[0].data();
          if (docData.recommendations) {
            setRecipes(docData.recommendations);
          } else {
            setRecipes([]);
          }
          setIsLoading(false);
        } else {
          // Otherwise, generate new recipes
          await generateNewRecipes(userId);
        }
      } catch (err: any) {
        console.error('Error fetching existing matches:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchExistingRecipes();
  }, [router, firestore]);

  const generateNewRecipes = async (userId: string) => {
    try {
      setIsLoading(true);
      const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '[]');

      const generateRecipeMatches = httpsCallable<
        { user_ref: string; food_preferences: { preferences: string[] } },
        RecipeMatchResponse
      >(functions, 'generateRecipeMatches');
      
      const result = await generateRecipeMatches({
        user_ref: userId,
        food_preferences: {
          preferences: userPreferences
        }
      });

      if (result?.data?.recommendations) {
        setRecipes(result.data.recommendations);
      } else {
        setRecipes([]);
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error generating new recipes:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleGenerateRecipesAgain = () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      generateNewRecipes(userId);
    }
  };

  // Summation of discount amounts for a single recipe
  const calculateSavings = (recipe: any) => {
    let totalSavings = 0;
    if (Array.isArray(recipe.savings_info)) {
      recipe.savings_info.forEach((item: any) => {
        const discountAmount = parseFloat(item.discount_amount) || 0;
        totalSavings += discountAmount;
      });
    }
    return totalSavings;
  };

  // Convert each discounted ingredient into the shape expected by <RecipeCard />
  const formatIngredients = (recipe: any) => {
    if (!Array.isArray(recipe.savings_info)) {
      return [];
    }
    return recipe.savings_info.map((item: any) => {
      const currentPrice = parseFloat(item.price) || 0;
      const discountAmount = parseFloat(item.discount_amount) || 0;
      return {
        name: item.ingredient,
        price: currentPrice,
        originalPrice: currentPrice + discountAmount
      };
    });
  };

  return (
    <PageLayout>
      <div className="container">
        <h1 className="page-title">Your Recipe Matches</h1>
        {isLoading ? (
          <div className="loading">Loading your recipes...</div>
        ) : error ? (
          <div className="error">
            <p>Oops, something went wrong: {error}</p>
            <button className="button" onClick={handleGenerateRecipesAgain}>
              Try Again
            </button>
          </div>
        ) : recipes.length === 0 ? (
          <div className="no-recipes">
            <p>No recipes found. Click below to try generating new ones!</p>
            <button className="button" onClick={handleGenerateRecipesAgain}>
              Generate Recipes
            </button>
          </div>
        ) : (
          <>
            <div className="recipes-grid">
              {recipes.map((recipe: any, index: number) => (
                <RecipeCard
                  key={index}
                  title={recipe.recipe_name}
                  ingredients={formatIngredients(recipe)}
                  savings={calculateSavings(recipe)}
                  recipeUrl={recipe.recipe_url}
                />
              ))}
            </div>
            <button className="button refresh-button" onClick={handleGenerateRecipesAgain}>
              Generate New Recipes
            </button>
          </>
        )}
      </div>
    </PageLayout>
  );
}