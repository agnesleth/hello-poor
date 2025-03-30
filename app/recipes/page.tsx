"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useFirestore } from "reactfire"
import { httpsCallable } from "firebase/functions"
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore"
import { RecipeCard } from "@/components/RecipeCard"
import { PageLayout } from "@/components/PageLayout"
import { getFunctions } from "firebase/functions"
import { getApp } from "firebase/app"
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from "lucide-react"

// Define response type for Firebase function
interface SaleItem {
  name: string
  price: string
  discount_amount: string
  discount_percentage: string
}

interface SavingsInfo {
  ingredient: string
  price: string
  discount_amount: string
  discount_percentage: string
}

interface RecipeRecommendation {
  recipe_name: string
  recipe_url?: string
  recipe_img?: string
  discounted_ingredients?: string[]
  savings_info?: SavingsInfo[]
}

interface StoreRecommendation {
  store_name: string
  recommendations: RecipeRecommendation[]
  saleItems?: SaleItem[] // Sale items for this store
}

interface RecipeMatchResponse {
  status?: string
  store_recommendations?: Record<string, StoreRecommendation>
  error?: string
}

export default function RecipesPage() {
  const router = useRouter()
  const firestore = useFirestore()

  const [storeRecommendations, setStoreRecommendations] = useState<Record<string, StoreRecommendation>>({})
  const [storeSaleItems, setStoreSaleItems] = useState<Record<string, SaleItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs for scroll containers
  const scrollContainersRef = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Function to scroll left
  const scrollLeft = (storeId: string) => {
    const container = scrollContainersRef.current[storeId]
    if (container) {
      container.scrollBy({
        left: -300,
        behavior: "smooth",
      })
    }
  }

  // Function to scroll right
  const scrollRight = (storeId: string) => {
    const container = scrollContainersRef.current[storeId]
    if (container) {
      container.scrollBy({
        left: 300,
        behavior: "smooth",
      })
    }
  }

  // Function to fetch sale items for a store
  const fetchStoreSaleItems = async (storeId: string) => {
    try {
      const storeDoc = await getDoc(doc(firestore, "articles", storeId))
      if (storeDoc.exists()) {
        const storeData = storeDoc.data()
        return storeData.articles || []
      }
      return []
    } catch (err) {
      console.error(`❌ Error fetching sale items for store ${storeId}:`, err)
      return []
    }
  }

  useEffect(() => {
    const userId = localStorage.getItem("userId")
    console.log("🔍 USER ID from localStorage:", userId)

    if (!userId) {
      console.warn("⚠️ No userId found in localStorage, redirecting to home page")
      router.push("/")
      return
    }

    // Attempt to load the latest recipe matches from Firestore
    const fetchExistingRecipes = async () => {
      try {
        setIsLoading(true)
        console.log("📊 Checking for existing recipe matches for userId:", userId)

        const matchesRef = collection(firestore, "recipe_matches")
        const q = query(matchesRef, where("user_id", "==", userId), orderBy("timestamp", "desc"), limit(1))
        const snapshot = await getDocs(q)
        console.log("📊 Found existing matches:", !snapshot.empty)

        if (!snapshot.empty) {
          // If there's a stored recipe match, use it
          const docData = snapshot.docs[0].data()
          console.log("📊 Retrieved recipe match document:", {
            id: snapshot.docs[0].id,
            timestamp: docData.timestamp,
            hasStoreRecommendations: !!docData.store_recommendations,
            storeCount: docData.store_recommendations ? Object.keys(docData.store_recommendations).length : 0,
          })

          if (docData.store_recommendations) {
            setStoreRecommendations(docData.store_recommendations)

            // Fetch sale items for each store
            const saleItemsMap: Record<string, SaleItem[]> = {}
            for (const storeId of Object.keys(docData.store_recommendations)) {
              const items = await fetchStoreSaleItems(storeId)
              saleItemsMap[storeId] = items
            }
            setStoreSaleItems(saleItemsMap)
          } else {
            // Handle legacy data format where recommendations were not grouped by store
            if (docData.recommendations && docData.recommendations.length > 0) {
              // Convert to the new format
              const legacyStore: StoreRecommendation = {
                store_name: "Your Store",
                recommendations: docData.recommendations,
              }
              setStoreRecommendations({ legacy: legacyStore })
              console.log("📊 Converted legacy format to store-based format")
            } else {
              setStoreRecommendations({})
            }
          }
          setIsLoading(false)
        } else {
          console.log("📊 No existing matches found, generating new recipes")
          // Otherwise, generate new recipes
          await generateNewRecipes(userId)
        }
      } catch (err: any) {
        console.error("❌ Error fetching existing matches:", err)
        setError(err.message)
        setIsLoading(false)
      }
    }

    fetchExistingRecipes()
  }, [router, firestore])

  const generateNewRecipes = async (userId: string) => {
    try {
      setIsLoading(true)

      // Retrieve user preferences from localStorage
      const userPreferencesRaw = localStorage.getItem("userPreferences")
      console.log("🔍 RAW userPreferences from localStorage:", userPreferencesRaw)

      const userPreferences = JSON.parse(userPreferencesRaw || "[]")
      console.log("🔍 PARSED userPreferences:", userPreferences)

      // Get functions instance with region specified
      const app = getApp()
      console.log("🔧 Firebase app config:", app.options)

      const functions = getFunctions(app, "us-central1")
      console.log("🔧 Using Firebase Functions region:", "us-central1")

      // Set custom headers to allow unauthenticated access (for development)
      // @ts-ignore - TypeScript doesn't know about this property
      functions.customHeaders = {
        Authorization: "Bearer owner", // This is a development-only approach
      }
      console.log("🔧 Set custom authorization header for unauthenticated access")

      const generateRecipeMatches = httpsCallable(functions, "generateRecipeMatches")

      // Prepare the payload
      const payload = {
        user_ref: userId,
        food_preferences: {
          preferences: userPreferences,
        },
      }

      console.log("📤 Calling Firebase function with payload:", JSON.stringify(payload, null, 2))

      // Call the function with a promise-based approach for better error handling
      generateRecipeMatches(payload)
        .then(async (result) => {
          console.log("📥 Function call successful. Raw result:", result)

          const data = result.data as RecipeMatchResponse
          console.log("📥 Parsed response data:", JSON.stringify(data, null, 2))

          if (data?.store_recommendations) {
            console.log("✅ Found store recommendations, count:", Object.keys(data.store_recommendations).length)
            setStoreRecommendations(data.store_recommendations)

            // Fetch sale items for each store
            const saleItemsMap: Record<string, SaleItem[]> = {}
            for (const storeId of Object.keys(data.store_recommendations)) {
              const items = await fetchStoreSaleItems(storeId)
              saleItemsMap[storeId] = items
            }
            setStoreSaleItems(saleItemsMap)
          } else {
            console.warn("⚠️ No store recommendations in response")
            setStoreRecommendations({})
          }
        })
        .catch((err) => {
          console.error("❌ Error calling function:", err)
          console.error("❌ Error details:", {
            code: err.code,
            message: err.message,
            details: err.details,
            stack: err.stack,
          })
          setError(err.message || "Failed to generate recipes")
        })
        .finally(() => {
          console.log("🏁 Function call completed")
          setIsLoading(false)
        })
    } catch (err: any) {
      console.error("❌ Unexpected error in generateNewRecipes:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  // Function to render sale items list
  const renderSaleItems = (storeId: string) => {
    const items = storeSaleItems[storeId]
    if (!items || items.length === 0) {
      return (
        <div className="flex items-center justify-center p-6 bg-gray-100 rounded-lg text-gray-500">
          No sale items found
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-4 max-h-[500px] overflow-y-auto">
        <h3 className="text-lg font-semibold text-center mb-4 border-b pb-2">Items on Sale</h3>
        <div className="space-y-3">
          {items.slice(0, 15).map((item, idx) => (
            <div key={idx} className="flex justify-between items-center pb-2 border-b border-gray-100 last:border-0">
              <div className="text-sm font-medium text-gray-800 pr-2">{item.name}</div>
              <div className="flex flex-col items-end">
                <div className="font-bold text-sm">{item.price}</div>
                {item.discount_percentage !== "N/A" && (
                  <div className="text-red-600 text-xs font-bold">Save {item.discount_percentage}</div>
                )}
              </div>
            </div>
          ))}
          {items.length > 15 && (
            <div className="text-center text-sm text-gray-500 pt-2">+ {items.length - 15} more items</div>
          )}
        </div>
      </div>
    )
  }

  const handleGenerateRecipesAgain = () => {
    const userId = localStorage.getItem("userId")
    console.log("🔄 Regenerating recipes for userId:", userId)
    if (userId) {
      generateNewRecipes(userId)
    } else {
      console.error("❌ Cannot regenerate recipes: No userId found")
    }
  }

  // Summation of discount amounts for a single recipe
  const calculateSavings = (recipe: RecipeRecommendation) => {
    let totalSavings = 0
    if (Array.isArray(recipe.savings_info)) {
      recipe.savings_info.forEach((item) => {
        const discountAmount = Number.parseFloat(item.discount_amount) || 0
        totalSavings += discountAmount
      })
    }
    return totalSavings
  }

  // Convert each discounted ingredient into the shape expected by <RecipeCard />
  const formatIngredients = (recipe: RecipeRecommendation) => {
    console.log("Formatting ingredients for recipe:", recipe.recipe_name)

    if (!Array.isArray(recipe.savings_info)) {
      console.warn("No savings_info array found for recipe:", recipe.recipe_name)
      return []
    }

    console.log("savings_info length:", recipe.savings_info.length)
    console.log("Raw savings_info:", recipe.savings_info)

    const formattedIngredients = recipe.savings_info.map((item) => {
      const currentPrice = Number.parseFloat(item.price) || 0
      const discountAmount = Number.parseFloat(item.discount_amount) || 0
      return {
        name: item.ingredient,
        price: currentPrice,
        originalPrice: currentPrice + discountAmount,
      }
    })

    console.log("Formatted ingredients:", formattedIngredients)
    return formattedIngredients
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-center text-amber-900">Your Recipe Matches</h1>
            <p className="text-center text-amber-800 mt-2 max-w-2xl mx-auto">
              Discover delicious recipes based on items currently on sale at your favorite stores
            </p>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-amber-800 font-medium">Finding your perfect recipe matches...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={handleGenerateRecipesAgain}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-full transition-colors duration-200 inline-flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            </div>
          ) : Object.keys(storeRecommendations).length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 max-w-2xl mx-auto text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">No Recipes Found</h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any recipe matches. Let's try generating some new ones!
              </p>
              <button
                onClick={handleGenerateRecipesAgain}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-8 rounded-full transition-colors duration-200 inline-flex items-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Generate Recipes
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-12">
                {Object.entries(storeRecommendations).map(([storeId, storeData]) => (
                  <div key={storeId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-amber-600 text-white py-3 px-6">
                      <h2 className="text-xl md:text-2xl font-bold text-center">
                        {storeData.store_name && storeData.store_name.length > 8
                          ? storeData.store_name.slice(0, -8).toUpperCase()
                          : storeData.store_name.toUpperCase()}
                      </h2>
                    </div>

                    <div className="p-4 md:p-6 grid md:grid-cols-[280px_1fr] gap-6">
                      {/* Left side: Sale items */}
                      <div className="md:border-r md:pr-4">{renderSaleItems(storeId)}</div>

                      {/* Right side: Recipe recommendations */}
                      <div className="relative">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 pl-2">Recommended Recipes</h3>

                        {/* Horizontal scrolling recipe container */}
                        <div className="relative">
                          {/* Left scroll button */}
                          <button
                            onClick={() => scrollLeft(storeId)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-amber-800 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-200 border border-amber-200"
                            aria-label="Scroll left"
                          >
                            <ChevronLeft className="w-6 h-6" />
                          </button>

                          <div
                            ref={(el) => {
                              scrollContainersRef.current[storeId] = el
                            }}
                            className="flex overflow-x-auto gap-6 pb-4 px-12 scrollbar-hide scroll-smooth"
                          >
                            <style jsx>{`
                              .scrollbar-hide::-webkit-scrollbar {
                                display: none;
                              }
                              .scrollbar-hide {
                                -ms-overflow-style: none;
                                scrollbar-width: none;
                              }
                            `}</style>

                            {storeData.recommendations.map((recipe, index) => (
                              <div key={`${storeId}-${index}`} className="min-w-[280px] max-w-[320px] flex-none">
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

                          {/* Right scroll button */}
                          <button
                            onClick={() => scrollRight(storeId)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-amber-800 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-200 border border-amber-200"
                            aria-label="Scroll right"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 mb-8 text-center">
                <button
                  onClick={handleGenerateRecipesAgain}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 inline-flex items-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Generate New Recipes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

