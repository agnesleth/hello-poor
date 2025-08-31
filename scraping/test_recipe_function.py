import os
import json
import re
from dotenv import load_dotenv
from firebase_admin import initialize_app, firestore, credentials
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize Firebase
cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
try:
    initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
except ValueError:
    # App already initialized
    pass

# Get Firestore client
db = firestore.client()

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

def test_recipe_matcher():
    """
    Test the recipe matcher function locally
    """
    print("\n=== Testing Recipe Matcher Function Locally ===\n")
    
    # Sample user ID from your Firestore collection
    sample_user_id = "19XTNu63kDbQG6Meu8ru"  # Replace with a real user ID
    
    # Sample food preferences
    sample_preferences = ["vegetarian"]
    
    print(f"Testing with user_id: {sample_user_id}")
    print(f"Food preferences: {sample_preferences}")
    
    # Initialize OpenAI client
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OpenAI API key not found in environment variables")
        return
    
    client = OpenAI(api_key=api_key)
    
    # Get user data from Firestore
    user_doc = db.collection("users").document(sample_user_id).get()
    if not user_doc.exists:
        print(f"Error: User {sample_user_id} not found")
        return
    
    user_data = user_doc.to_dict()
    allowed_stores = user_data.get("allowed_stores", [])
    # Combine user preferences from Firestore and the provided sample preferences
    user_preferences = user_data.get("preferences", []) + sample_preferences
    
    print(f"User allowed stores: {allowed_stores}")
    
    # Get articles on sale from Firestore
    articles_on_sale = {}
    
    # If no specific filter for store_id is available, try to get all stores
    stores_ref = db.collection("stores")
    if allowed_stores:
        print("Getting articles for allowed stores...")
        for store_id in allowed_stores:
            store_query = stores_ref.where("store_id", "==", store_id).limit(1).stream()
            for store_doc in store_query:
                store_data = store_doc.to_dict()
                articles = store_data.get("articles", [])
                if articles:
                    articles_on_sale[store_id] = articles
                    print(f"Found {len(articles)} articles for store {store_id}")
    else:
        print("No allowed stores found, getting all stores...")
        stores_query = stores_ref.limit(5).stream()
        for store_doc in stores_query:
            store_data = store_doc.to_dict()
            store_id = store_data.get("store_id")
            articles = store_data.get("articles", [])
            if store_id and articles:
                articles_on_sale[store_id] = articles
                print(f"Found {len(articles)} articles for store {store_id}")
    
    # If no articles found, create some dummy data
    if not articles_on_sale:
        print("No store articles found, creating sample data...")
        articles_on_sale = {
            "sample-store-1": [
                ["Halloumi", "59 kr", "20.00 kr", "25%"],
                ["Färska grönsaker", "25 kr", "10.00 kr", "28%"],
                ["Potatis", "15 kr", "5.00 kr", "25%"],
                ["Tomater", "29 kr", "10.00 kr", "25%"]
            ]
        }
    
    # Get recipes from Firestore
    recipes_data = {}
    recipes_ref = db.collection("recipes").limit(20)
    recipes_query = recipes_ref.stream()
    
    recipe_count = 0
    for recipe_doc in recipes_query:
        recipe_data = recipe_doc.to_dict()
        recipe_count += 1
        category = recipe_data.get("category", "uncategorized")
        if category not in recipes_data:
            recipes_data[category] = []
        recipes_data[category].append(recipe_data)
    
    print(f"Found {recipe_count} recipes in {len(recipes_data)} categories")
    
    # If no recipes found, create some dummy data
    if not recipes_data:
        print("No recipes found, creating sample data...")
        recipes_data = {
            "vegetarian": [
                {
                    "recipe_name": "Halloumipytt med örtsmör",
                    "recipe_url": "https://www.ica.se/recept/halloumipytt-med-ortsmor-och-senapskram-724205/",
                    "recipe_img": "https://assets.icanet.se/e_sharpen:80,q_auto,dpr_1.25,w_718,h_718,c_lfill/imagevaultfiles/id_184674/cf_259/halloumipytt_med_ortsmor_och_senapskram.jpg",
                    "main_ingredients": ["Halloumi", "Potatis", "Lök"]
                },
                {
                    "recipe_name": "Vegetarisk lasagne",
                    "recipe_url": "https://www.ica.se/recept/vegetarisk-lasagne-723792/",
                    "recipe_img": "https://assets.icanet.se/e_sharpen:80,q_auto,dpr_1.25,w_718,h_718,c_lfill/imagevaultfiles/id_180295/cf_259/vegetarisk_lasagne.jpg",
                    "main_ingredients": ["Zucchini", "Morot", "Lök", "Vitlök", "Krossade tomater"]
                }
            ]
        }
    
    # Generate recommendations
    print("\nGenerating recommendations...")
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
    
    # Print results
    print("\n=== Results ===\n")
    
    if formatted_recommendations:
        print(f"Found {len(formatted_recommendations)} recommended recipes:")
        for i, rec in enumerate(formatted_recommendations, 1):
            print(f"\n{i}. {rec.get('recipe_name', 'Unknown recipe')}")
            print(f"   URL: {rec.get('recipe_url', 'No URL')}")
            print(f"   Discounted ingredients: {', '.join(rec.get('discounted_ingredients', []))}")
            
            # Print savings info
            savings = rec.get('savings_info', [])
            if savings:
                print(f"   Savings information:")
                for item in savings:
                    print(f"     - {item.get('ingredient')}: "
                          f"Price {item.get('price')}, "
                          f"Discount {item.get('discount_amount')}, "
                          f"{item.get('discount_percentage')} off")
    else:
        print("No recommendations found.")
    
    # Return the formatted recommendations (could be stored or used elsewhere)
    return formatted_recommendations

if __name__ == "__main__":
    test_recipe_matcher() 