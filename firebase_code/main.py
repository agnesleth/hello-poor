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

# Initialize Firebase app - ONLY when running locally, not in Cloud Functions
if os.getenv('FUNCTION_TARGET') is None:
    cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
    initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})

# In Cloud Functions environment, the app is initialized automatically

@https_fn.on_call(timeout_sec=600, memory=options.MemoryOption.GB_2)
def generateRecipeMatches(request: https_fn.CallableRequest) -> Dict:
    """
    Firebase callable function that generates recipe recommendations
    based on user preferences and sale items at allowed stores.
    Lets see if it works
    Args:
        request: Contains user_ref (user ID) and food_preferences (dict)
    
    Returns:
        Dictionary with recommended recipes
    """
    # Get Firestore client
    db = firestore.client()
    
    # Extract request data
    data = request.data
    user_ref = data.get("user_ref")
    food_preferences = data.get("food_preferences", {})
    
    # Initialize OpenAI client
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OpenAI API key not found in environment variables"}
    
    client = OpenAI(api_key=api_key)
    
    # Get user data from Firestore
    user_doc = db.collection("users").document(user_ref).get()
    if not user_doc.exists:
        return {"error": f"User {user_ref} not found"}
    
    user_data = user_doc.to_dict()
    allowed_stores = user_data.get("allowed_stores", [])
    user_preferences = food_preferences.get("preferences", [])
    
    # Get articles on sale from Firestore
    articles_on_sale = {}
    stores_ref = db.collection("stores")
    stores_query = stores_ref.where(filter=FieldFilter("store_id", "in", allowed_stores)).stream()
    
    for store_doc in stores_query:
        store_data = store_doc.to_dict()
        store_id = store_data.get("store_id")
        articles = store_data.get("articles", [])
        if store_id and articles:
            articles_on_sale[store_id] = articles
    
    # Get recipes from Firestore
    recipes_data = {}
    recipes_ref = db.collection("recipes")
    recipes_query = recipes_ref.stream()
    
    for recipe_doc in recipes_query:
        recipe_data = recipe_doc.to_dict()
        category = recipe_data.get("category", "uncategorized")
        if category not in recipes_data:
            recipes_data[category] = []
        recipes_data[category].append(recipe_data)
    
    # Generate recommendations
    recommendations, discount_info, normalized_to_original = get_recipe_recommendations(
        articles_on_sale, 
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
    
    # Save results to Firestore
    result_data = {
        "user_id": user_ref,
        "recommendations": formatted_recommendations,
        "timestamp": firestore.SERVER_TIMESTAMP
    }
    
    db.collection("recipe_matches").add(result_data)
    
    return {"status": "success", "recommendations": formatted_recommendations}

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
    
    for store_id, articles in user_articles_on_sale.items():
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
    
    # Prepare the recipes data for the OpenAI prompt
    recipes_info = []
    for category, recipe_list in recipes_data.items():
        for recipe in recipe_list:
            recipes_info.append({
                "recipe_name": recipe.get("recipe_name", ""),
                "main_ingredients": recipe.get("main_ingredients", [])
            })

    # Create the prompt for OpenAI with discount information
    prompt = f"""
Given the following information, recommend 5 recipes that best match the user's preferences 
and utilize ingredients that are on sale in their allowed stores.

User Preferences: {user_preferences}

Items on Sale with Discount Information:
{json.dumps(sale_items, indent=2, ensure_ascii=False)}

Available Recipes:
{json.dumps(recipes_info[:100], indent=2, ensure_ascii=False)}

For each recipe, identify which ingredients in the recipe are on sale items.
Make sure to EXACTLY match the ingredient names to the sale items.

Return your answer as a JSON object containing exactly 5 recipe names with a list of discounted ingredients:
{{
  "recommendations": [
    {{
      "recipe_name": "Recipe Name 1",
      "discounted_ingredients": ["EXACTLY Item 1 from sale items", "EXACTLY Item 2 from sale items", ...]
    }},
    // ... repeat for all 5 recipes
  ]
}}
"""

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",  # Using a more widely available model
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You are a culinary expert that recommends recipes based on user preferences and available ingredients. Return results in JSON format."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    
    # Parse the JSON response
    try:
        return json.loads(response.choices[0].message.content), discount_info, normalized_to_original
    except Exception as e:
        print(f"Error parsing OpenAI response: {e}")
        return {"recommendations": []}, discount_info, normalized_to_original

def find_recipe_details(recipe_name, recipes_data):
    """Find full recipe details by name"""
    for category, recipe_list in recipes_data.items():
        for recipe in recipe_list:
            if recipe.get("recipe_name", "") == recipe_name:
                return recipe
    return None

def find_matching_sale_item(ingredient, discount_info, normalized_to_original):
    """Find best matching sale item for an ingredient"""
    normalized_ingredient = normalize_text(ingredient)
    
    # Try exact match first
    if ingredient in discount_info:
        return ingredient
        
    # Try normalized match
    for product_name, info in discount_info.items():
        normalized_product = info.get("normalized_name", "")
        if normalized_product and (normalized_ingredient in normalized_product or normalized_product in normalized_ingredient):
            return product_name
            
    # Try partial match
    for normalized_name, original_name in normalized_to_original.items():
        if normalized_ingredient in normalized_name or normalized_name in normalized_ingredient:
            return original_name
            
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
   