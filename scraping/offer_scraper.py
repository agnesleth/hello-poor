import os
import json
import re
import requests
from bs4 import BeautifulSoup
import json
from scraping.scraper import scrape_ica_stores

def parse_price(price_text, description=""):
    """Extract price information from text"""
    price = None
    discount = None
    discount_percentage = None
    unit_price = None
    
    if not price_text:
        return "N/A", discount, discount_percentage, unit_price
    
    # Combine price_text and description for better parsing
    full_text = f"{price_text} {description}".lower()
    
    # Clean up text
    full_text = re.sub(r'\s+', ' ', full_text)
    
    # Clean up price text (remove duplications like "2 för 59 kr2 för59:-")
    # First format: "2 för 59 kr2 för59:-"
    price_text = re.sub(r'(\d+\s+för\s+\d+\s*kr).*?$', r'\1', price_text)
    # Second format: "119 kr/kg119:-/kg"
    price_text = re.sub(r'(\d+\s*kr/(?:kg|st)).*?$', r'\1', price_text)
    # Plain price with duplication: "99 kr99:-"
    price_text = re.sub(r'(\d+\s*kr).*?$', r'\1', price_text)
    
    # Try to extract numerical values
    numbers = re.findall(r'\d+(?:[\.,]\d+)?', price_text) if price_text else []
    
    # First check if there's an original price in the description
    orig_price = None
    orig_price_match = re.search(r'ord\.?pris\s*(\d+[\.,]?\d*(?:-\d+[\.,]?\d*)?)', full_text)
    if orig_price_match:
        # Handle range like "139:00-167:00"
        price_range = orig_price_match.group(1).split('-')
        if len(price_range) > 1:
            # Take average of price range
            orig_price = (float(price_range[0].replace(',', '.').replace(':', '.')) + 
                          float(price_range[1].replace(',', '.').replace(':', '.'))) / 2
        else:
            orig_price = float(price_range[0].replace(',', '.').replace(':', '.'))
    
    # Check for common price patterns
    if 'för' in price_text:
        # Format like "3 för 110 kr"
        try:
            quantity = int(re.search(r'(\d+)\s+för', price_text).group(1))
            if numbers and len(numbers) >= 2:
                total_price = float(numbers[1].replace(',', '.'))
                price = f"{quantity} för {total_price} kr"
                unit_price = total_price / quantity
                
                if orig_price:
                    if orig_price > unit_price:
                        discount = f"{orig_price - unit_price:.2f} kr"
                        discount_percentage = f"{((orig_price - unit_price) / orig_price) * 100:.0f}%"
        except:
            price = price_text.strip()
    
    elif '/kg' in price_text:
        # Format like "119 kr/kg"
        try:
            price = re.search(r'(\d+(?:[\.,]\d+)?\s*kr/kg)', price_text).group(1)
            
            if orig_price:
                current_price = float(re.search(r'(\d+(?:[\.,]\d+)?)', price).group(1).replace(',', '.'))
                if orig_price > current_price:
                    discount = f"{orig_price - current_price:.2f} kr"
                    discount_percentage = f"{((orig_price - current_price) / orig_price) * 100:.0f}%"
        except:
            price = price_text.strip()
    
    elif '/st' in price_text:
        # Format like "75 kr/st"
        try:
            price = re.search(r'(\d+(?:[\.,]\d+)?\s*kr/st)', price_text).group(1)
            
            if orig_price:
                current_price = float(re.search(r'(\d+(?:[\.,]\d+)?)', price).group(1).replace(',', '.'))
                if orig_price > current_price:
                    discount = f"{orig_price - current_price:.2f} kr"
                    discount_percentage = f"{((orig_price - current_price) / orig_price) * 100:.0f}%"
        except:
            price = price_text.strip()
    
    elif 'kr' in price_text:
        # Plain price like "99 kr"
        try:
            price = re.search(r'(\d+(?:[\.,]\d+)?\s*kr)', price_text).group(1)
            
            if orig_price:
                current_price = float(re.search(r'(\d+(?:[\.,]\d+)?)', price).group(1).replace(',', '.'))
                if orig_price > current_price:
                    discount = f"{orig_price - current_price:.2f} kr"
                    discount_percentage = f"{((orig_price - current_price) / orig_price) * 100:.0f}%"
        except:
            price = price_text.strip()
    
    # Check for price in :- format
    elif ':-' in price_text:
        try:
            match = re.search(r'(\d+):-', price_text)
            if match:
                price = f"{match.group(1)} kr"
                
                if orig_price:
                    current_price = float(match.group(1))
                    if orig_price > current_price:
                        discount = f"{orig_price - current_price:.2f} kr"
                        discount_percentage = f"{((orig_price - current_price) / orig_price) * 100:.0f}%"
        except:
            price = price_text.strip()
    
    else:
        # Just use the text as is
        price = price_text.strip() if price_text else "N/A"
    
    return price, discount, discount_percentage, unit_price

def is_price_format(text):
    """Check if text is just a price format without product information"""
    if not text:
        return False
    
    price_patterns = [
        r'^\d+\s+för\s+\d+(?:[\.,]\d+)?\s*kr',
        r'^\d+(?:[\.,]\d+)?\s*kr/(?:st|kg)',
        r'^\d+(?:[\.,]\d+)?\s*kr(?!\S)',
        r'^\d+:-',
        r'^\d+:-/(?:st|kg)',
        r'^\d+\s+för\d+:-'
    ]
    
    text_lower = text.lower()
    return any(re.match(pattern, text_lower) for pattern in price_patterns)

def clean_product_name(name, description=""):
    """Clean up product name"""
    # Remove common non-product elements
    non_product_phrases = [
        "lägg i inköpslista", "erbjudanden", "logga in", 
        "vill du få", "reklamfilmer", "bildspel", "partnererbjudanden",
        "visa veckans", "veckanstamis pris", "veckans bästa klip", "veckans grönt",
        "superklip", "klipp", "först in", "först ut", "topperbjudanden"
    ]
    
    if not name:
        return ""
    
    # Skip if this is just a price format without product name
    if is_price_format(name):
        return ""
    
    # Convert to lowercase for comparison
    name_lower = name.lower()
    
    # Check if the name contains any non-product phrases
    for phrase in non_product_phrases:
        if phrase in name_lower:
            return ""
    
    # Fix common misspellings based on what we've seen in the data
    name = name.replace("Hergård", "Herrgård")
    name = name.replace("moröter", "morötter")
    name = name.replace("grilad", "grillad")
    name = name.replace("Toaletpaper", "Toalettpapper")
    name = name.replace("Tortilabröd", "Tortillabröd")
    name = name.replace("Haloumi", "Halloumi")
    
    # Remove duplicate product info
    name = re.sub(r'([A-Za-z]+)\1+', r'\1', name)
    
    # Clean up multiple spaces
    name = re.sub(r'\s+', ' ', name)
    
    # Extract brand from description if possible
    if description:
        # Try to find brand name between product and description
        brand_match = re.search(r'([A-Z][a-zA-Z0-9]+®?(?:\s*,\s*[A-Z][a-zA-Z0-9]+®?)*)\.\s', description)
        if brand_match:
            brand = brand_match.group(1)
            if brand and brand.lower() not in name.lower():
                name = f"{name} {brand}"
    
    # Remove ICA prefix if it's just a brand indicator, not part of product name
    if name.startswith("ICA ") and len(name.split()) > 2:
        name = name[4:]
    
    return name.strip()

def extract_product_info(section):
    """Extract product information from a section"""
    # Get all text content
    full_text = section.get_text(strip=True)
    
    # Try to extract the product description (contains jmfpris, etc.)
    description = ""
    desc_match = re.search(r'((?:Jmfpris|Max|Ord\.pris).*?)(?:Lägg i inköpslista|$)', full_text, re.IGNORECASE)
    if desc_match:
        description = desc_match.group(1).strip()
    
    # Try to find product name
    product_name = ""
    product_name_elem = section.find(['h2', 'h3', 'h4', 'strong']) or section.find(class_=lambda c: c and ('name' in c.lower() or 'title' in c.lower()))
    if product_name_elem:
        product_name = product_name_elem.get_text(strip=True)
    else:
        # Try to find the product name from the structure
        for tag in section.find_all(['p', 'div', 'span', 'strong']):
            text = tag.get_text(strip=True)
            # Product names often appear before jmfpris or ord.pris
            if text and not re.search(r'jmfpris|ord\.pris|för|kr/kg|kr/st|lägg i|[0-9]+\s*kr', text, re.IGNORECASE):
                if len(text) > 3 and text[0].isupper():  # Likely a product name
                    product_name = text
                    break
        
        # If still not found, try first part of full text
        if not product_name:
            if '.' in full_text:
                product_name = full_text.split('.')[0]
            elif len(full_text) < 50:  # Reasonable length for a product name
                product_name = full_text
    
    # Clean up product name
    product_name = clean_product_name(product_name, description)
    if not product_name:
        return None
    
    # Try to find price
    price_text = ""
    price_patterns = [
        # "3 för 110 kr", "2 för 59 kr"
        r'\d+\s+för\s+\d+(?:[\.,]\d+)?\s*kr',
        # "75 kr/st", "119 kr/kg"
        r'\d+(?:[\.,]\d+)?\s*kr/(?:st|kg)',
        # "99 kr"
        r'\d+(?:[\.,]\d+)?\s*kr(?!\S)',
        # "99:-", "99:-/st", "3 för 99:-"
        r'\d+:-(?:/(?:st|kg)|\s+(?:för|st|kg))?'
    ]
    
    for pattern in price_patterns:
        price_match = re.search(pattern, full_text, re.IGNORECASE)
        if price_match:
            price_text = price_match.group(0)
            break
    
    # Try looking for price elements if regex failed
    if not price_text:
        price_elem = section.find(class_=lambda c: c and 'price' in str(c).lower()) or section.find(['strong', 'b', 'span'], string=lambda s: s and ('kr' in s or 'för' in s or ':-' in s))
        if price_elem:
            price_text = price_elem.get_text(strip=True)
    
    # Parse price information
    price, discount, discount_percentage, unit_price = parse_price(price_text, description or full_text)
    
    # Return extracted data if we have a valid product
    if product_name and price != "N/A":
        return [product_name, price, discount or "N/A", discount_percentage or "N/A"]
    
    return None

def find_product_elements(soup, html_content):
    """Find product elements in the page using multiple strategies"""
    product_elements = []
    
    # Strategy 1: Find sections with offer-related classes
    offer_elements = soup.find_all(['div', 'section', 'article'], class_=lambda c: c and any(term in str(c).lower() for term in ['product', 'offer', 'item', 'article']))
    product_elements.extend(offer_elements)
    
    # Strategy 2: Find elements containing product info (jmfpris, ord.pris)
    for elem in soup.find_all(['div', 'section', 'article']):
        text = elem.get_text(strip=True)
        if re.search(r'jmfpris|ord\.pris', text, re.IGNORECASE) and len(text) < 500:  # Not too large sections
            if elem not in product_elements:
                product_elements.append(elem)
    
    # Strategy 3: Find elements with price patterns
    price_patterns = [r'\d+\s+för\s+\d+', r'\d+\s*kr/(?:st|kg)', r'\d+:-']
    for elem in soup.find_all(['div', 'p', 'section', 'article']):
        text = elem.get_text(strip=True)
        if any(re.search(pattern, text) for pattern in price_patterns) and len(text) < 500:
            parent = elem.parent
            if parent and parent not in product_elements:
                product_elements.append(parent)
    
    # Strategy 4: Find elements with product images
    for img in soup.find_all('img'):
        parent = img.find_parent(['div', 'section', 'article'])
        if parent and 'src' in img.attrs and parent not in product_elements:
            text = parent.get_text(strip=True)
            if re.search(r'kr|för|ord\.pris|jmfpris', text, re.IGNORECASE) and len(text) < 500:
                product_elements.append(parent)
    
    return product_elements

def scrape_store_offers(store_ids):
    """Scrape offers from store pages"""
    results = {}
    
    for store_id in store_ids:
        print(f"Scraping offers from {store_id}...")
        url = f"https://www.ica.se/erbjudanden/{store_id}/"
        
        try:
            response = requests.get(url)
            html_content = response.text
        except Exception as e:
            print(f"Error fetching offers for {store_id}: {e}")
            results[store_id] = []
            continue
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find articles on sale using multiple strategies
        product_elements = find_product_elements(soup, html_content)
        
        # Process each potential product element
        articles = []
        for element in product_elements:
            product_info = extract_product_info(element)
            if product_info:
                articles.append(product_info)
        
        # Remove duplicates and non-product entries
        cleaned_articles = []
        seen_products = set()
        
        for article in articles:
            # Skip price-only entries and duplicate products
            if article[0] and article[0] not in seen_products and not is_price_format(article[0]):
                seen_products.add(article[0])
                cleaned_articles.append(article)
        
        # Combine product info for same product that may have been extracted separately
        combined_articles = {}
        for article in cleaned_articles:
            product_name = article[0]
            price = article[1]
            discount = article[2]
            discount_percent = article[3]
            
            # If product already exists with missing info, update it
            if product_name in combined_articles:
                if combined_articles[product_name][1] == "N/A" and price != "N/A":
                    combined_articles[product_name][1] = price
                if combined_articles[product_name][2] == "N/A" and discount != "N/A":
                    combined_articles[product_name][2] = discount  
                if combined_articles[product_name][3] == "N/A" and discount_percent != "N/A":
                    combined_articles[product_name][3] = discount_percent
            else:
                combined_articles[product_name] = article
        
        results[store_id] = list(combined_articles.values())
        print(f"Found {len(results[store_id])} offers in {store_id}")
    
    return results

def save_results(results):
    # Process results to format the data correctly
    formatted_results = {}
    
    for store_id, articles in results.items():
        formatted_articles = []
        
        for article in articles:
            name = article[0]
            price_text = article[1]
            discount_amount = article[2]
            discount_percentage = article[3]
            
            # Process multi-unit offers to calculate unit price
            unit_price = None
            if 'för' in price_text:
                match = re.search(r'(\d+)\s+för\s+(\d+(?:[.,]\d+)?)', price_text)
                if match:
                    quantity = int(match.group(1))
                    total_price = float(match.group(2).replace(',', '.'))
                    unit_price = total_price / quantity
            
            # Format the article
            formatted_article = {
                "name": name,
                "price": price_text if unit_price is None else f"{unit_price:.2f} kr",
                "discount_amount": discount_amount,
                "discount_percentage": discount_percentage
            }
            
            formatted_articles.append(formatted_article)
        
        formatted_results[store_id] = formatted_articles
    
    # Save formatted results to articles_on_sale.txt
    with open('articles_on_sale.txt', 'w', encoding='utf-8') as f:
        f.write(json.dumps(formatted_results, indent=2, ensure_ascii=False))
    print(f"Formatted results saved to articles_on_sale.txt")

if __name__ == "__main__":
    # Get store IDs from our previous scraper or load from results.txt
    try:
        with open('results.txt', 'r', encoding='utf-8') as f:
            store_data = json.load(f)
            all_store_ids = []
            for city, stores in store_data.items():
                all_store_ids.extend(stores)
    except:
        # If results.txt doesn't exist, run the store scraper
        store_data = scrape_ica_stores()
        all_store_ids = []
        for city, stores in store_data.items():
            all_store_ids.extend(stores)
    
    # Scrape offers for each store
    offer_results = scrape_store_offers(all_store_ids)
    
    # Save results
    save_results(offer_results)
    print("Offer scraping completed successfully")
