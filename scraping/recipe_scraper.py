import json
import requests
from bs4 import BeautifulSoup
import time

def scrape_recipe_urls(product):
    """
    Scrape top-rated recipe URLs for a specific product from ICA website
    """
    url = f"https://www.ica.se/recept/{product}/?sort=rating"
    print(f"Scraping recipes for {product}...")
    
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find recipe cards or containers
        recipe_elements = soup.find_all(class_=lambda c: c and "recipe" in c.lower())
        
        if not recipe_elements:
            # Alternative approach if the above fails
            recipe_elements = soup.find_all("a", href=lambda h: h and "/recept/" in h and not h.endswith("/recept/"))
        
        # Extract URLs from recipe elements
        recipe_urls = []
        seen_urls = set()
        
        for element in recipe_elements:
            # If the element is already an anchor tag
            if element.name == 'a' and 'href' in element.attrs:
                url = element['href']
            # Otherwise, look for anchor tags within the element
            else:
                link = element.find('a', href=lambda h: h and "/recept/" in h and not h.endswith("/recept/"))
                if not link:
                    continue
                url = link['href']
            
            # Make sure URL is absolute
            if url.startswith('/'):
                url = f"https://www.ica.se{url}"
                
            # Avoid duplicates and ensure it's a recipe URL
            if url not in seen_urls and "/recept/" in url:
                seen_urls.add(url)
                recipe_urls.append(url)
        
        print(f"Found {len(recipe_urls)} recipes for {product}")
        return recipe_urls
        
    except Exception as e:
        print(f"Error scraping recipes for {product}: {e}")
        return []

def save_results(results):
    """Save results to a file"""
    with open('recipe_urls.txt', 'w', encoding='utf-8') as f:
        f.write(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"Results saved to recipe_urls.txt")

if __name__ == "__main__":
    # List of products to search for
    products = ["halloumi", "lax", "kyckling", "kott", "vegetarisk", "flask", "tofu", "svamp"]
    
    # Dictionary to store results
    results = {}
    
    # Scrape recipes for each product
    for product in products:
        recipe_urls = scrape_recipe_urls(product)
        results[product] = recipe_urls
        
        # Add delay to avoid overloading the server
        time.sleep(1)
    
    # Save results
    save_results(results)
    print("Recipe scraping completed successfully") 