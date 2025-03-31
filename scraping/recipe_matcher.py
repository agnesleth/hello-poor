import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def load_data(file_path):
    """Load data from a JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def filter_articles_for_user(articles_on_sale, allowed_stores):
    """Filter articles on sale for the user's allowed stores"""
    user_articles_on_sale = {}
    
    for store_id, articles in articles_on_sale.items():
        if store_id in allowed_stores:
            user_articles_on_sale[store_id] = articles
    
    return user_articles_on_sale

def normalize_text(text):
    """Normalize text for better matching (lowercase, remove special chars)"""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)  # Remove special characters
    return text.strip()

def get_recipe_recommendations(user_articles_on_sale, user_preferences, recipes_data):
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
                "recipe_name": recipe["recipe_name"],
                "main_ingredients": recipe["main_ingredients"]
            })

    # Create the prompt for OpenAI with discount information
    prompt = f"""
Given the following information, recommend 5 recipes that best match the user's preferences 
and utilize ingredients that are on sale in their allowed stores.

User Preferences: {user_preferences}

Items on Sale with Discount Information:
{json.dumps(sale_items, indent=2, ensure_ascii=False)}

Available Recipes:
{json.dumps(recipes_info, indent=2, ensure_ascii=False)}

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
        model="gpt-4o",
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
            if recipe["recipe_name"] == recipe_name:
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
        if normalized_product and normalized_ingredient in normalized_product or normalized_product in normalized_ingredient:
            return product_name
            
    # Try partial match
    for normalized_name, original_name in normalized_to_original.items():
        if normalized_ingredient in normalized_name or normalized_name in normalized_ingredient:
            return original_name
            
    return None

def process_user(user, articles_on_sale, recipes_data):
    """Process a single user and return recommendations in the specified format"""
    print(f"\n{'='*40}")
    print(f"Processing recommendations for {user['name']}")
    print(f"{'='*40}")
    
    # Filter articles on sale for the user
    user_articles_on_sale = filter_articles_for_user(articles_on_sale, user.get("allowed_stores", []))
    
    # Print sale items for debugging
    print("Sale items for this user:")
    for store_id, articles in user_articles_on_sale.items():
        for article in articles:
            print(f"  - {article[0]}")
    
    # Get recipe recommendations and discount info
    recommendations, discount_info, normalized_to_original = get_recipe_recommendations(
        user_articles_on_sale, 
        user.get("preferences", []), 
        recipes_data
    )
    
    # Process and collect recommendations in the exact requested format
    formatted_recommendations = []
    
    for rec in recommendations.get("recommendations", []):
        recipe_name = rec.get("recipe_name", "")
        discounted_ingredients = rec.get("discounted_ingredients", [])
        
        # Find full recipe details
        recipe_details = find_recipe_details(recipe_name, recipes_data)
        
        if recipe_details:
            # Map ingredients to their actual sale items
            mapped_ingredients = []
            savings_info = []  # Initialize here
            
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
            
            # Calculate total discount percentage
            total_discount_percent = 0
            for item in savings_info:
                try:
                    if isinstance(item["discount_percentage"], str) and "%" in item["discount_percentage"]:
                        percent = float(item["discount_percentage"].replace("%", ""))
                        total_discount_percent += percent
                except (ValueError, TypeError):
                    pass
            
            formatted_rec = [
                recipe_name,
                recipe_details.get("recipe_url", ""),
                recipe_details.get("recipe_img", ""),
                mapped_ingredients,
                savings_info  # Add the savings information
            ]
            formatted_recommendations.append(formatted_rec)
            
            # Print details to console
            print(f"\n- {recipe_name}")
            print(f"  URL: {recipe_details.get('recipe_url', '')}")
            print(f"  Discounted ingredients: {', '.join(mapped_ingredients)} ({len(mapped_ingredients)} items on sale)")
            print(f"  Savings information:")
            for item in savings_info:
                print(f"    - {item['ingredient']}: Price {item['price']}, Discount {item['discount_amount']}, {item['discount_percentage']} off")
            if total_discount_percent > 0:
                print(f"  Total potential discount percentage: {total_discount_percent:.1f}%")
    
    return formatted_recommendations

def main():
    # Load data
    articles_on_sale = load_data('articles_on_sale.txt')
    recipes_data = load_data('recipes.txt')
    
    # Define users
    users = [
        {
            "name": "Axel",
            "allowed_stores": ["ica-nara-rosendal-1004328", "ica-nara-stabby-1003386"],
            "preferences": ["High in protein"]
        },
        {
            "name": "Agnes",
            "allowed_stores": ["ica-nara-hornan-1003672", "ica-kvantum-gottsunda-1004218"],
            "preferences": ["Vegetarian"]
        }
    ]
    
    # Process each user and collect results
    all_results = {}
    for user in users:
        formatted_recs = process_user(user, articles_on_sale, recipes_data)
        all_results[user["name"]] = formatted_recs
    
    # Write structured output to file
    with open('user_matches.txt', 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    
    print(f"\nAll recommendations have been saved to user_matches.txt")
    
    # Return the formatted recommendations
    return all_results

if __name__ == "__main__":
    main() 