import os
import json
import dotenv
import requests
from bs4 import BeautifulSoup
import re
from jinaai import JinaAI

# Load environment variables
dotenv.load_dotenv()
JINA_API_KEY = os.getenv("JINA_API_KEY")

# Define cities list directly
cities = ['umea', 'lulea','malmo','lund','goteborg']

def scrape_ica_stores():
    # Initialize Jina client
    jina_client = JinaAI(
        secrets={
            'jinachat-secret': JINA_API_KEY
        }
    )
    
    # Dictionary to store results: {city: [store1, store2, ...]}
    results = {}
    
    for city in cities:
        print(f"Scraping stores for {city}...")
        url = f"https://www.ica.se/butiker/{city}"
        
        # Get HTML content using requests
        try:
            response = requests.get(url)
            html_content = response.text
        except Exception as e:
            print(f"Error fetching URL with requests: {e}")
            results[city] = []
            continue
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find store IDs - looking for "Gå till butikssidan" links
        store_ids = []
        
        # Find all elements with "Gå till butikssidan" text
        store_links = soup.find_all('a', string=lambda text: text and 'Gå till butikssidan' in text)
        
        for link in store_links:
            href = link.get('href')
            if href:
                # Extract store ID from the URL
                # URLs are like: https://www.ica.se/butiker/nara/uppsala/ica-nara-stabby-1003386/
                match = re.search(r'/(ica-[^/]+)-(\d+)/?$', href)
                if match:
                    store_id = f"{match.group(1)}-{match.group(2)}"
                    if store_id and store_id not in store_ids:
                        store_ids.append(store_id)
        
        # If no store IDs found with the above method, try another approach
        if not store_ids:
            # Look for store links in the entire HTML content
            store_url_matches = re.findall(r'href="https://www\.ica\.se/butiker/[^"]+/(ica-[^/]+)-(\d+)/?[^"]*"', html_content)
            for match in store_url_matches:
                store_id = f"{match[0]}-{match[1]}"
                if store_id not in store_ids:
                    store_ids.append(store_id)
        
        results[city] = store_ids
        print(f"Found {len(store_ids)} store IDs in {city}")
    
    return results

def save_results(results):
    # Save results to results.txt
    with open('results.txt', 'w') as f:
        f.write(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"Results saved to results.txt")

if __name__ == "__main__":
    results = scrape_ica_stores()
    save_results(results)
    print("Scraping completed successfully") 