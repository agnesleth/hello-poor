from google.cloud.firestore_v1.base_query import FieldFilter
from firebase_admin import initialize_app, firestore
from firebase_functions import https_fn, options
from firebase_functions import scheduler_fn
from firebase_admin import credentials
from firebase_admin import storage
import google.cloud.firestore
import json
import os
import re
from typing import Any, Dict, List
from openai import OpenAI
from dotenv import load_dotenv

# Load .env file if it exists (for local development)
load_dotenv()

# Initialize Firebase app - ONLY when running locally, not in Cloud Functions
if os.getenv('FUNCTION_TARGET') is None:
    cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
    initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
else:
    # In Cloud Functions environment, manually initialize with default configuration
    # This ensures the app is initialized even in the Cloud Functions environment
    try:
        initialize_app()
    except ValueError:
        # App already initialized - this is fine
        pass

@https_fn.on_call(timeout_sec=600, memory=options.MemoryOption.GB_2)
def generateRecipeMatches(request: https_fn.CallableRequest) -> Dict:
    """
    Firebase callable function that generates recipe recommendations
    based on user preferences and sale items at allowed stores.
    
    Args:
        request: Contains user_ref (user ID) and food_preferences (dict)
    
    Returns:
        Dictionary with recommended recipes grouped by store
    """
    # Get Firestore client
    db = firestore.client()
    
    # Extract request data
    data = request.data
    user_ref = data.get("user_ref")
    food_preferences = data.get("food_preferences", {})
    
    # Get OpenAI API key directly from environment variables
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        print("Using OpenAI API key from environment variable")
    else:
        print("ERROR: OpenAI API key not found")
        return {"error": "OpenAI API key not found in environment variables"}
    
    client = OpenAI(api_key=api_key)
    print("OpenAI client initialized successfully")
    
    # Get user data from Firestore
    user_doc = db.collection("users").document(user_ref).get()
    if not user_doc.exists:
        print(f"ERROR: User {user_ref} not found")
        return {"error": f"User {user_ref} not found"}
    
    print(f"Found user {user_ref}")
    user_data = user_doc.to_dict()
    allowed_stores = user_data.get("allowed_stores", [])
    user_preferences = food_preferences.get("preferences", [])
    
    print(f"User preferences: {user_preferences}")
    print(f"Allowed stores: {allowed_stores}")
    
    # Get articles on sale from Firestore - grouped by store
    articles_by_store = {}
    store_names = {}  # Store store_id -> store_name mapping
    articles_ref = db.collection("articles")
    
    # First, print all available stores for debugging
    all_articles_query = articles_ref.stream()
    all_stores = []
    for article_doc in all_articles_query:
        article_data = article_doc.to_dict()
        store_id = article_data.get("store_id", "unknown")
        if store_id not in all_stores:
            all_stores.append(store_id)
    
    print(f"Available stores in database: {all_stores}")
    
    # Then try to find the matching stores
    if allowed_stores:
        try:
            # Query the articles collection where store_id matches any of the allowed stores
            articles_query = articles_ref.where(filter=FieldFilter("store_id", "in", allowed_stores)).stream()
            
            store_count = 0
            processed_stores = set()
            
            for article_doc in articles_query:
                article_data = article_doc.to_dict()
                store_id = article_data.get("store_id")
                store_name = article_data.get("store_name", store_id)  # Use store_id as fallback
                
                if store_id not in processed_stores:
                    store_count += 1
                    processed_stores.add(store_id)
                    store_names[store_id] = store_name
                
                article_items = article_data.get("articles", [])
                print(f"Store {store_id} ({store_name}) has {len(article_items)} articles")
                
                # Format the article data to match the expected format for processing
                if store_id and article_items:
                    formatted_articles = []
                    for item in article_items:
                        # Format: [name, price, discount_amount, discount_percentage]
                        formatted_article = [
                            item.get("name", "Unknown Item"),
                            item.get("price", "0 kr").replace(" kr", ""),
                            item.get("discount_amount", "0 kr").replace(" kr", ""),
                            item.get("discount_percentage", "0%")
                        ]
                        formatted_articles.append(formatted_article)
                    
                    # Add to articles_by_store
                    articles_by_store[store_id] = {
                        "store_name": store_name,
                        "articles": formatted_articles
                    }
            
            print(f"Found {store_count} matching stores with articles on sale")
            for store_id, store_data in articles_by_store.items():
                print(f"  - Store {store_id} ({store_data['store_name']}): {len(store_data['articles'])} formatted article items")
                
        except Exception as e:
            print(f"Error querying articles: {e}")
    else:
        print("Warning: No allowed stores specified for the user")
    
    # If no articles found, use sample data for testing
    if not articles_by_store:
        print("Using sample sale data for testing since no articles were found")
        articles_by_store = {
            "sample-store": {
                "store_name": "Sample Store",
                "articles": [
                    ["Ground Beef", "89.90", "20.00", "22%"],
                    ["Pasta", "15.90", "5.00", "31%"],
                    ["Tomato Sauce", "22.90", "7.00", "30%"],
                    ["Chicken Breasts", "109.90", "30.00", "27%"],
                    ["Rice", "29.90", "10.00", "33%"],
                    ["Broccoli", "19.90", "5.00", "25%"],
                    ["Cheese", "59.90", "15.00", "25%"],
                    ["Potatoes", "25.90", "8.00", "31%"]
                ]
            }
        }
    
    # Get recipes from Firestore
    recipes_data = {}
    recipes_ref = db.collection("recipes")
    recipes_query = recipes_ref.stream()
    
    recipe_count = 0
    total_recipes = 0
    
    # Process each document in the recipes collection
    for recipe_doc in recipes_query:
        recipe_data = recipe_doc.to_dict()
        category = recipe_data.get("category", "uncategorized")
        
        # The document contains a "recipes" array with multiple recipes
        recipes_array = recipe_data.get("recipes", [])
        
        if recipes_array and len(recipes_array) > 0:
            if category not in recipes_data:
                recipes_data[category] = []
                
            # Add each recipe from the array to our recipes_data structure
            for recipe_item in recipes_array:
                recipe_count += 1
                recipes_data[category].append({
                    "recipe_name": recipe_item.get("recipe_name", ""),
                    "recipe_url": recipe_item.get("recipe_url", ""),
                    "recipe_img": recipe_item.get("recipe_img", ""),
                    "main_ingredients": recipe_item.get("main_ingredients", []),
                    "category": category
                })
                
        total_recipes += len(recipes_array)
    
    print(f"Found {recipe_count} recipes across {len(recipes_data)} categories")
    print(f"Recipe categories: {list(recipes_data.keys())}")
    
    # If we have no recipes, return error
    if recipe_count == 0:
        print("ERROR: No recipes found in the database")
        return {"error": "No recipes found in the database"}
    
    # Process each store separately and get recommendations
    store_recommendations = {}
    
    for store_id, store_data in articles_by_store.items():
        store_name = store_data["store_name"]
        store_articles = store_data["articles"]
        
        print(f"\nProcessing recommendations for store: {store_id} ({store_name})")
        print(f"Store has {len(store_articles)} articles on sale")
        
        # Create a store-specific articles_on_sale structure
        store_articles_on_sale = {store_id: store_articles}
        
        # Generate recommendations for this store
        recommendations, discount_info, normalized_to_original = get_recipe_recommendations(
            store_articles_on_sale,
            user_preferences,
            recipes_data,
            client
        )
        
        # Process and format recommendations
        formatted_recommendations = format_recommendations(
            recommendations,
            discount_info,
            normalized_to_original,
            recipes_data
        )
        
        print(f"Generated {len(formatted_recommendations)} formatted recommendations for {store_name}")
        
        # If no recommendations were generated, try again with default preferences
        if len(formatted_recommendations) == 0:
            print(f"No recommendations with user preferences for {store_name}, trying with default preferences")
            default_preferences = ["Easy", "Budget-friendly"]
            recommendations, discount_info, normalized_to_original = get_recipe_recommendations(
                store_articles_on_sale,
                default_preferences,
                recipes_data,
                client
            )
            
            formatted_recommendations = format_recommendations(
                recommendations,
                discount_info,
                normalized_to_original,
                recipes_data
            )
            print(f"Generated {len(formatted_recommendations)} recommendations with default preferences for {store_name}")
        
        # Limit to 5 recommendations per store
        if len(formatted_recommendations) > 5:
            formatted_recommendations = formatted_recommendations[:5]
            print(f"Limited to 5 recommendations for {store_name}")
        
        # Store the recommendations for this store
        if len(formatted_recommendations) > 0:
            store_recommendations[store_id] = {
                "store_name": store_name,
                "recommendations": formatted_recommendations
            }
    
    # Prepare the combined results
    result_data = {
        "user_id": user_ref,
        "store_recommendations": store_recommendations,
        "timestamp": firestore.SERVER_TIMESTAMP
    }
    
    # Save results to Firestore
    db.collection("recipe_matches").add(result_data)
    print("Saved recommendations to Firestore")
    
    return {
        "status": "success", 
        "store_recommendations": store_recommendations
    }

def normalize_text(text):
    """Normalize text for better matching (lowercase, remove special chars)"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)  # Remove special characters
    return text.strip()

def get_recipe_recommendations(user_articles_on_sale, user_preferences, recipes_data, client):
    """Use OpenAI to recommend recipes based on user preferences and sale items"""
    # Extract article names and their discount information
    sale_items = []
    discount_info = {}
    normalized_to_original = {}  # Map normalized names to original names
    
    print("Processing sale items:")
    for store_id, articles in user_articles_on_sale.items():
        print(f"Store {store_id} has {len(articles)} articles")
        for article in articles:
            # The first item is the product name
            product_name = article[0]
            normalized_name = normalize_text(product_name)
            
            # Skip empty names
            if not normalized_name:
                continue
                
            # Store mapping
            normalized_to_original[normalized_name] = product_name
            
            # Check if we already have this product
            if product_name not in discount_info:
                # Extract discount information (price, amount off, percentage)
                price = article[1] if len(article) > 1 else "N/A"
                discount_amount = article[2] if len(article) > 2 else "N/A"
                discount_percentage = article[3] if len(article) > 3 else "N/A"
                
                # Store the discount information
                discount_info[product_name] = {
                    "price": price,
                    "discount_amount": discount_amount,
                    "discount_percentage": discount_percentage,
                    "normalized_name": normalized_name
                }
                
                # Add to the sale items list
                sale_items.append(product_name)
                print(f"  - Sale item: {product_name} (normalized: {normalized_name})")
    
    # Print ingredients to help with debugging
    print(f"Found {len(sale_items)} unique items on sale")
    
    # Prepare the recipes data for the OpenAI prompt
    recipes_info = []
    recipe_count = 0
    
    for category, recipe_list in recipes_data.items():
        print(f"Category '{category}' has {len(recipe_list)} recipes")
        for recipe in recipe_list:
            recipe_name = recipe.get("recipe_name", "")
            main_ingredients = recipe.get("main_ingredients", [])
            
            recipes_info.append({
                "recipe_name": recipe_name,
                "main_ingredients": main_ingredients
            })
            recipe_count += 1
            
            # Limit to 100 recipes to prevent token limit issues with OpenAI
    
    print(f"Sending {len(recipes_info)} recipes to OpenAI for matching")
    
    # Create the prompt for OpenAI with discount information
    prompt = f"""
Given the following information, recommend exactly 5 recipes that best match the user's preferences 
and utilize ingredients that are on sale in the store.

User Preferences: {user_preferences}

Items on Sale with Discount Information:
{json.dumps(sale_items, indent=2, ensure_ascii=False)}

Available Recipes:
{json.dumps(recipes_info, indent=2, ensure_ascii=False)}

Important: For matching ingredients to sale items, look for common words and partial matches. For example:
- "Ground Beef" should match "Beef", "Minced Beef", etc.
- "Tomato Sauce" should match "Tomato", "Krossade Tomater", etc.
- "Pasta" should match "Spaghetti", "Penne", etc.

Make sure to be flexible when matching ingredient names to sale items.

Return your answer as a JSON object containing exactly 5 recipe names with a list of discounted ingredients:
{{
  "recommendations": [
    {{
      "recipe_name": "Recipe Name 1",
      "discounted_ingredients": ["Item 1 from sale items", "Item 2 from sale items", ...]
    }},
    // ... repeat for all 5 recipes
  ]
}}

"""

    print("Calling OpenAI API...")
    response = client.chat.completions.create(
        model="gpt-4o",  # Using a more widely available model
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You are a culinary expert that recommends recipes based on user preferences and available ingredients. Return results in JSON format."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    
    # Parse the JSON response
    try:
        result = json.loads(response.choices[0].message.content)
        recommendations = result.get("recommendations", [])
        print(f"OpenAI returned {len(recommendations)} recommendations")
        for i, rec in enumerate(recommendations):
            print(f"Recipe {i+1}: {rec.get('recipe_name')} with {len(rec.get('discounted_ingredients', []))} discounted ingredients")
        
        return result, discount_info, normalized_to_original
    except Exception as e:
        print(f"Error parsing OpenAI response: {e}")
        print("Raw response content:", response.choices[0].message.content)
        return {"recommendations": []}, discount_info, normalized_to_original

def find_recipe_details(recipe_name, recipes_data):
    """Find full recipe details by name"""
    for category, recipe_list in recipes_data.items():
        for recipe in recipe_list:
            if recipe.get("recipe_name", "") == recipe_name:
                return recipe
    return None

def find_matching_sale_item(ingredient, discount_info, normalized_to_original):
    """Find best matching sale item for an ingredient using fuzzy matching"""
    normalized_ingredient = normalize_text(ingredient)
    
    print(f"Finding matches for ingredient: '{ingredient}' (normalized: '{normalized_ingredient}')")
    
    # Try exact match first
    if ingredient in discount_info:
        print(f"  - Exact match found: '{ingredient}'")
        return ingredient
    
    best_match = None
    best_match_score = 0
        
    # Try normalized matches with different strategies
    for product_name, info in discount_info.items():
        normalized_product = info.get("normalized_name", "")
        
        # Skip empty product names
        if not normalized_product:
            continue
            
        # Strategy 1: Direct containment
        # Check if one string contains the other
        if normalized_ingredient in normalized_product:
            score = len(normalized_ingredient) / len(normalized_product) * 100
            print(f"  - Potential match (containment): '{product_name}' with score {score:.1f}")
            if score > best_match_score:
                best_match = product_name
                best_match_score = score
                
        elif normalized_product in normalized_ingredient:
            score = len(normalized_product) / len(normalized_ingredient) * 100
            print(f"  - Potential match (contained in): '{product_name}' with score {score:.1f}")
            if score > best_match_score:
                best_match = product_name
                best_match_score = score
        
        # Strategy 2: Word-level matching
        # Check if individual words match
        ingredient_words = set(normalized_ingredient.split())
        product_words = set(normalized_product.split())
        common_words = ingredient_words.intersection(product_words)
        
        if common_words:
            # Calculate score based on shared words
            score = len(common_words) / max(len(ingredient_words), len(product_words)) * 90
            print(f"  - Potential match (word overlap): '{product_name}' with score {score:.1f}")
            if score > best_match_score:
                best_match = product_name
                best_match_score = score
    
    # Only return match if score is good enough
    if best_match_score > 50:
        print(f"  => Best match: '{best_match}' with score {best_match_score:.1f}")
        return best_match
    else:
        print("  => No good match found")
        return None

def format_recommendations(recommendations, discount_info, normalized_to_original, recipes_data):
    """Process recommendations into a structured format"""
    formatted_recommendations = []
    
    for rec in recommendations.get("recommendations", []):
        recipe_name = rec.get("recipe_name", "")
        discounted_ingredients = rec.get("discounted_ingredients", [])
        
        # Find full recipe details
        recipe_details = find_recipe_details(recipe_name, recipes_data)
        
        if recipe_details:
            # Map ingredients to their actual sale items
            mapped_ingredients = []
            savings_info = []
            
            for ingredient in discounted_ingredients:
                matching_item = find_matching_sale_item(ingredient, discount_info, normalized_to_original)
                if matching_item:
                    mapped_ingredients.append(matching_item)
                    
                    # Add discount information for this matched ingredient
                    if matching_item in discount_info:
                        info = discount_info[matching_item]
                        savings_info.append({
                            "ingredient": matching_item,
                            "price": info["price"],
                            "discount_amount": info["discount_amount"],
                            "discount_percentage": info["discount_percentage"]
                        })
                else:
                    mapped_ingredients.append(ingredient)
            
            # Create formatted recommendation
            formatted_recommendation = {
                "recipe_name": recipe_name,
                "recipe_url": recipe_details.get("recipe_url", ""),
                "recipe_img": recipe_details.get("recipe_img", ""),
                "discounted_ingredients": mapped_ingredients,
                "savings_info": savings_info
            }
            
            formatted_recommendations.append(formatted_recommendation)
    
    return formatted_recommendations
   