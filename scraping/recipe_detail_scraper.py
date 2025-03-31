import json
import requests
import os
from bs4 import BeautifulSoup
import time
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_main_ingredients(ingredients_text):
    """
    Use OpenAI API to extract the top 3 main ingredients from a recipe
    """
    try:
        prompt = f"""BELOW YOU WILL BE GIVEN A LIST OF INGREDIENTS CORRESPONDING TO A RECIPE. 
REPLY WITH THE TOP 5 MOST IMPORTANT INGREDIENTS, INCLUDE NOTHING ELSE IN THE OUTPUT. 
PRIORITIZE INGREDIENTS THE MOST EXPENSIVE INGREDIENTS USED AS PRIMARY INGREDIENTS IN THE RECIPE..
PRIORITIZE PRIMARY INGREDIENTS LIKE PROTEINS AND CARB SOURCES. LIKE MEAT, FISH, HALLOUMI, ETC.
EXAMPLE: INPUT, USER: INGREDIENTS LIST, -> OUTPUT: INGREDIENT1, INGREDIENT2, INGREDIENT3.

INGREDIENTS LIST:
{ingredients_text}"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a culinary expert that identifies the main ingredients in recipes."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=50,
            temperature=0
        )
        
        # Extract and clean up the response
        main_ingredients = response.choices[0].message.content.strip()
        # Split by comma and strip whitespace
        ingredients_list = [ingredient.strip() for ingredient in main_ingredients.split(',')]
        print(f"Extracted main ingredients: {ingredients_list}")
        return ingredients_list
    except Exception as e:
        print(f"Error extracting main ingredients: {e}")
        return []

def scrape_recipe_details(recipe_url):
    """
    Scrape detailed information from a recipe page
    """
    print(f"Scraping details for: {recipe_url}")
    
    try:
        response = requests.get(recipe_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract recipe name
        recipe_name = ""
        title_element = soup.find("h1")
        if title_element:
            recipe_name = title_element.text.strip()
        
        # Extract recipe image URL - look for the second image which should be the recipe image
        image_url = ""
        images = soup.find_all("img")
        image_index = 0
        
        for img in images:
            if "Image 2" in str(img) or (image_index == 1 and img.get('src') and 'imagevaultfiles' in img.get('src')):
                image_url = img.get('src')
                break
            image_index += 1
        
        # Extract ingredients
        ingredients_section = soup.find("section", {"class": lambda c: c and "ingredients" in c.lower()}) or soup.find("div", {"class": lambda c: c and "ingredients" in c.lower()})
        ingredients_text = ""
        
        if ingredients_section:
            ingredients_text = ingredients_section.get_text(" ", strip=True)
        else:
            # Alternative approach
            ingredients_elements = soup.find_all("h2", string=lambda s: s and "Ingredienser" in s)
            if ingredients_elements:
                for element in ingredients_elements:
                    section = element.find_next("section") or element.find_next("div")
                    if section:
                        ingredients_text = section.get_text(" ", strip=True)
                        break
        
        # Extract main ingredients using OpenAI API
        main_ingredients = []
        if ingredients_text:
            main_ingredients = extract_main_ingredients(ingredients_text)
        
        # Create recipe dictionary
        recipe_data = {
            "recipe_name": recipe_name,
            "recipe_url": recipe_url,
            "main_ingredients": main_ingredients,
            "recipe_img": image_url
        }
        
        return recipe_data
    
    except Exception as e:
        print(f"Error scraping recipe details for {recipe_url}: {e}")
        return {
            "recipe_name": "",
            "recipe_url": recipe_url,
            "main_ingredients": [],
            "recipe_img": ""
        }

def load_recipe_urls():
    """
    Load recipe URLs from recipe_urls.txt
    """
    try:
        with open('recipe_urls.txt', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading recipe URLs: {e}")
        return {}

def save_results(results):
    """
    Save results to recipes.txt
    """
    with open('recipes.txt', 'w', encoding='utf-8') as f:
        f.write(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"Results saved to recipes.txt")

if __name__ == "__main__":
    # Load recipe URLs
    recipe_urls_by_product = load_recipe_urls()
    
    # Dictionary to store detailed recipe data
    recipes_data = {}
    
    # Number of recipes to process per product (limit for testing)
    recipes_per_product = 20 # Adjust as needed
    
    # Process each product
    for product, urls in recipe_urls_by_product.items():
        print(f"\nProcessing {product} recipes...")
        recipes_data[product] = []
        
        # Process limited number of recipes per product to avoid long processing times
        for url in urls[:recipes_per_product]:
            recipe_data = scrape_recipe_details(url)
            if recipe_data["recipe_name"]:  # Only add if we got a valid recipe name
                recipes_data[product].append(recipe_data)
            
            # Add delay to avoid overloading server and API rate limits
            time.sleep(2)
    
    # Save results
    save_results(recipes_data)
    print("\nRecipe detail scraping completed successfully") 