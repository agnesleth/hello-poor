'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFunctions, useFirestore } from 'reactfire';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { RecipeCard } from '@/components/RecipeCard';
import { PageLayout } from '@/components/PageLayout';
import { getFunctions } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Define response type for Firebase function
interface SaleItem {
  name: string;
  price: string;
  discount_amount: string;
  discount_percentage: string;
}

interface SavingsInfo {
  ingredient: string;
  price: string;
  discount_amount: string;
  discount_percentage: string;
}

interface RecipeRecommendation {
  recipe_name: string;
  recipe_url?: string;
  recipe_img?: string;
  discounted_ingredients?: string[];
  savings_info?: SavingsInfo[];
}

interface StoreRecommendation {
  store_name: string;
  recommendations: RecipeRecommendation[];
  saleItems?: SaleItem[]; // Sale items for this store
}

interface RecipeMatchResponse {
  status?: string;
  store_recommendations?: Record<string, StoreRecommendation>;
  error?: string;
}

export default function RecipesPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const [storeRecommendations, setStoreRecommendations] = useState<Record<string, StoreRecommendation>>({});
  const [storeSaleItems, setStoreSaleItems] = useState<Record<string, SaleItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for scroll containers
  const scrollContainersRef = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Function to scroll left
  const scrollLeft = (storeId: string) => {
    const container = scrollContainersRef.current[storeId];
    if (container) {
      container.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };
  
  // Function to scroll right
  const scrollRight = (storeId: string) => {
    const container = scrollContainersRef.current[storeId];
    if (container) {
      container.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  // Function to fetch sale items for a store
  const fetchStoreSaleItems = async (storeId: string) => {
    try {
      const storeDoc = await getDoc(doc(firestore, 'articles', storeId));
      if (storeDoc.exists()) {
        const storeData = storeDoc.data();
        return storeData.articles || [];
      }
      return [];
    } catch (err) {
      console.error(`❌ Error fetching sale items for store ${storeId}:`, err);
      return [];
    }
  };

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
            hasStoreRecommendations: !!docData.store_recommendations,
            storeCount: docData.store_recommendations ? Object.keys(docData.store_recommendations).length : 0
          });
          
          if (docData.store_recommendations) {
            setStoreRecommendations(docData.store_recommendations);
            
            // Fetch sale items for each store
            const saleItemsMap: Record<string, SaleItem[]> = {};
            for (const storeId of Object.keys(docData.store_recommendations)) {
              const items = await fetchStoreSaleItems(storeId);
              saleItemsMap[storeId] = items;
            }
            setStoreSaleItems(saleItemsMap);
          } else {
            // Handle legacy data format where recommendations were not grouped by store
            if (docData.recommendations && docData.recommendations.length > 0) {
              // Convert to the new format
              const legacyStore: StoreRecommendation = {
                store_name: "Your Store",
                recommendations: docData.recommendations
              };
              setStoreRecommendations({ "legacy": legacyStore });
              console.log('📊 Converted legacy format to store-based format');
            } else {
              setStoreRecommendations({});
            }
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
      .then(async (result) => {
        console.log('📥 Function call successful. Raw result:', result);
        
        const data = result.data as RecipeMatchResponse;
        console.log('📥 Parsed response data:', JSON.stringify(data, null, 2));
        
        if (data?.store_recommendations) {
          console.log('✅ Found store recommendations, count:', Object.keys(data.store_recommendations).length);
          setStoreRecommendations(data.store_recommendations);
          
          // Fetch sale items for each store
          const saleItemsMap: Record<string, SaleItem[]> = {};
          for (const storeId of Object.keys(data.store_recommendations)) {
            const items = await fetchStoreSaleItems(storeId);
            saleItemsMap[storeId] = items;
          }
          setStoreSaleItems(saleItemsMap);
        } else {
          console.warn('⚠️ No store recommendations in response');
          setStoreRecommendations({});
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

  // Function to render sale items list
  const renderSaleItems = (storeId: string) => {
    const items = storeSaleItems[storeId];
    if (!items || items.length === 0) {
      return (
        <div style={{ 
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          No sale items found
        </div>
      );
    }

    return (
      <div style={{ 
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        <h3 style={{ 
          marginTop: 0,
          marginBottom: '16px',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          Items on Sale
        </h3>
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {items.slice(0, 15).map((item, idx) => (
            <div key={idx} style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: idx < items.length - 1 ? '1px solid #eee' : 'none',
              paddingBottom: '8px'
            }}>
              <div style={{ fontWeight: 'medium', fontSize: '14px' }}>
                {item.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                  {item.price}
                </div>
                {item.discount_percentage !== 'N/A' && (
                  <div style={{ 
                    color: '#e53935',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    Save {item.discount_percentage}
                  </div>
                )}
              </div>
            </div>
          ))}
          {items.length > 15 && (
            <div style={{ textAlign: 'center', fontSize: '14px', color: '#666' }}>
              + {items.length - 15} more items
            </div>
          )}
        </div>
      </div>
    );
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
  const calculateSavings = (recipe: RecipeRecommendation) => {
    let totalSavings = 0;
    if (Array.isArray(recipe.savings_info)) {
      recipe.savings_info.forEach((item) => {
        const discountAmount = parseFloat(item.discount_amount) || 0;
        totalSavings += discountAmount;
      });
    }
    return totalSavings;
  };

  // Convert each discounted ingredient into the shape expected by <RecipeCard />
  const formatIngredients = (recipe: RecipeRecommendation) => {
    console.log('Formatting ingredients for recipe:', recipe.recipe_name);
    
    if (!Array.isArray(recipe.savings_info)) {
      console.warn('No savings_info array found for recipe:', recipe.recipe_name);
      return [];
    }
    
    console.log('savings_info length:', recipe.savings_info.length);
    console.log('Raw savings_info:', recipe.savings_info);
    
    const formattedIngredients = recipe.savings_info.map((item) => {
      const currentPrice = parseFloat(item.price) || 0;
      const discountAmount = parseFloat(item.discount_amount) || 0;
      return {
        name: item.ingredient,
        price: currentPrice,
        originalPrice: currentPrice + discountAmount
      };
    });
    
    console.log('Formatted ingredients:', formattedIngredients);
    return formattedIngredients;
  };

  return (
    <PageLayout>
      <div className="container" style={{
        padding: '20px',
        maxWidth: '100%',
        margin: '0 auto',
        backgroundColor: '#f8d48a', 
        minHeight: '100vh'
      }}>
        <h1 className="page-title" style={{
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '28px',
          fontWeight: 'bold'
        }}>Your Recipe Matches</h1>
        
        {isLoading ? (
          <div className="loading" style={{ textAlign: 'center', padding: '40px' }}>
            Loading your recipes...
          </div>
        ) : error ? (
          <div className="error" style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <p style={{ marginBottom: '16px' }}>Oops, something went wrong: {error}</p>
            <button 
              className="button" 
              onClick={handleGenerateRecipesAgain}
              style={{
                backgroundColor: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try Again
            </button>
          </div>
        ) : Object.keys(storeRecommendations).length === 0 ? (
          <div className="no-recipes" style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <p style={{ marginBottom: '16px' }}>No recipes found. Click below to try generating new ones!</p>
            <button 
              className="button" 
              onClick={handleGenerateRecipesAgain}
              style={{
                backgroundColor: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Generate Recipes
            </button>
          </div>
        ) : (
          <>
            <div className="stores-container" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '40px',
              marginBottom: '32px'
            }}>
              {Object.entries(storeRecommendations).map(([storeId, storeData]) => (
                <div key={storeId} className="store-section" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {storeData.store_name && storeData.store_name.length > 8 
                      ? storeData.store_name.slice(0, -8).toUpperCase() 
                      : storeData.store_name.toUpperCase()}
                  </h2>
                  
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Left side: Sale items */}
                    <div style={{ 
                      width: '250px', 
                      flexShrink: 0
                    }}>
                      {renderSaleItems(storeId)}
                    </div>
                    
                    {/* Right side: Recipe recommendations */}
                    <div style={{ flex: 1 }}>
                      {/* Horizontal scrolling recipe container */}
                      <div className="horizontal-scroll-container" style={{
                        position: 'relative',
                        padding: '8px 0',
                      }}>
                        {/* Left scroll indicator */}
                        <div 
                          onClick={() => scrollLeft(storeId)}
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '40px',
                            height: '40px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 10,
                            userSelect: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          ‹
                        </div>
                      
                        <div 
                          ref={(el) => { scrollContainersRef.current[storeId] = el; }}
                          className="store-recipes-scroll" 
                          style={{
                            display: 'flex',
                            overflowX: 'auto',
                            paddingBottom: '12px',
                            gap: '16px',
                            scrollBehavior: 'smooth',
                            WebkitOverflowScrolling: 'touch',
                            padding: '4px 40px',
                            scrollPadding: '0 40px',
                            msOverflowStyle: 'none', /* IE and Edge */
                            scrollbarWidth: 'none'  /* Firefox */
                          }}
                        >
                          <style jsx>{`
                            .store-recipes-scroll::-webkit-scrollbar {
                              display: none; /* Chrome, Safari, Opera */
                            }
                          `}</style>
                          
                          {storeData.recommendations.map((recipe, index) => (
                            <div key={`${storeId}-${index}`} style={{
                              minWidth: '300px',
                              maxWidth: '350px',
                              flex: '0 0 auto'
                            }}>
                              <RecipeCard
                                title={recipe.recipe_name}
                                ingredients={formatIngredients(recipe)}
                                savings={calculateSavings(recipe)}
                                recipeUrl={recipe.recipe_url}
                                imageUrl={recipe.recipe_img}
                              />
                            </div>
                          ))}
                        </div>
                        
                        {/* Right scroll indicator */}
                        <div 
                          onClick={() => scrollRight(storeId)}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '40px',
                            height: '40px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '20px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 10,
                            userSelect: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          ›
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '24px', marginBottom: '40px' }}>
              <button 
                className="button refresh-button" 
                onClick={handleGenerateRecipesAgain}
                style={{
                  backgroundColor: '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '12px 28px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                Generate New Recipes
              </button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}