'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFunctions, useFirestore } from 'reactfire';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { RecipeCard } from '@/components/RecipeCard';
import { PageLayout } from '@/components/PageLayout';
import { getFunctions } from 'firebase/functions';
import { getApp } from 'firebase/app';

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
  const firestore = useFirestore();

  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    console.log('🔍 USER ID from localStorage:', userId);
    
    if (!userId) {
      console.warn('⚠️ No userId found in localStorage, redirecting to home page');
      router.push('/');
      return;
    }

    // Attempt to load the latest recipe matches from Firestore
    const fetchExistingRecipes = async () => {
      try {
        setIsLoading(true);
        console.log('📊 Checking for existing recipe matches for userId:', userId);

        const matchesRef = collection(firestore, 'recipe_matches');
        const q = query(
          matchesRef,
          where('user_id', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        console.log('📊 Found existing matches:', !snapshot.empty);

        if (!snapshot.empty) {
          // If there's a stored recipe match, use it
          const docData = snapshot.docs[0].data();
          console.log('📊 Retrieved recipe match document:', {
            id: snapshot.docs[0].id,
            timestamp: docData.timestamp,
            hasRecommendations: !!docData.recommendations,
            recommendationCount: docData.recommendations?.length || 0
          });
          
          if (docData.recommendations) {
            setRecipes(docData.recommendations);
          } else {
            setRecipes([]);
          }
          setIsLoading(false);
        } else {
          console.log('📊 No existing matches found, generating new recipes');
          // Otherwise, generate new recipes
          await generateNewRecipes(userId);
        }
      } catch (err: any) {
        console.error('❌ Error fetching existing matches:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchExistingRecipes();
  }, [router, firestore]);

  const generateNewRecipes = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Retrieve user preferences from localStorage
      const userPreferencesRaw = localStorage.getItem('userPreferences');
      console.log('🔍 RAW userPreferences from localStorage:', userPreferencesRaw);
      
      const userPreferences = JSON.parse(userPreferencesRaw || '[]');
      console.log('🔍 PARSED userPreferences:', userPreferences);

      // Get functions instance with region specified
      const app = getApp();
      console.log('🔧 Firebase app config:', app.options);
      
      const functions = getFunctions(app, 'us-central1');
      console.log('🔧 Using Firebase Functions region:', 'us-central1');
      
      // Set custom headers to allow unauthenticated access (for development)
      // @ts-ignore - TypeScript doesn't know about this property
      functions.customHeaders = {
        "Authorization": "Bearer owner" // This is a development-only approach
      };
      console.log('🔧 Set custom authorization header for unauthenticated access');
      
      const generateRecipeMatches = httpsCallable(
        functions, 
        'generateRecipeMatches'
      );
      
      // Prepare the payload
      const payload = {
        user_ref: userId,
        food_preferences: {
          preferences: userPreferences
        }
      };
      
      console.log('📤 Calling Firebase function with payload:', JSON.stringify(payload, null, 2));
      
      // Call the function with a promise-based approach for better error handling
      generateRecipeMatches(payload)
      .then((result) => {
        console.log('📥 Function call successful. Raw result:', result);
        
        const data = result.data as RecipeMatchResponse;
        console.log('📥 Parsed response data:', JSON.stringify(data, null, 2));
        
        if (data?.recommendations) {
          console.log('✅ Found recommendations, count:', data.recommendations.length);
          setRecipes(data.recommendations);
        } else {
          console.warn('⚠️ No recommendations in response');
          setRecipes([]);
        }
      })
      .catch((err) => {
        console.error('❌ Error calling function:', err);
        console.error('❌ Error details:', {
          code: err.code,
          message: err.message,
          details: err.details,
          stack: err.stack
        });
        setError(err.message || 'Failed to generate recipes');
      })
      .finally(() => {
        console.log('🏁 Function call completed');
        setIsLoading(false);
      });
    } catch (err: any) {
      console.error('❌ Unexpected error in generateNewRecipes:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleGenerateRecipesAgain = () => {
    const userId = localStorage.getItem('userId');
    console.log('🔄 Regenerating recipes for userId:', userId);
    if (userId) {
      generateNewRecipes(userId);
    } else {
      console.error('❌ Cannot regenerate recipes: No userId found');
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