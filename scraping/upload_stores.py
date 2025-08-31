import json
import uuid
from firebase_admin import initialize_app, firestore
from firebase_admin import credentials

def upload_stores_to_firebase():
    """Upload store data from results.txt to Firebase"""
    # Initialize Firebase
    cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
    try:
        initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
    except ValueError:
        # App already initialized
        pass
    
    # Get Firestore client
    db = firestore.client()
    
    # Load store data
    with open('results.txt', 'r', encoding='utf-8') as f:
        store_data = json.load(f)
    
    # Upload each city to Firestore
    for city_name, stores in store_data.items():
        # Create data object with city name and stores array
        data = {
            "name": city_name,
            "stores": stores
        }
        
        # Add to Firestore with a random document ID
        doc_ref = db.collection("cities").document(str(uuid.uuid4()))
        doc_ref.set(data)
        
        print(f"Uploaded {city_name} with {len(stores)} stores")
    
    print("All cities uploaded successfully")

def upload_articles_to_firebase():
    """Upload articles on sale from articles_on_sale.txt to Firebase"""
    # Initialize Firebase
    cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
    try:
        initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
    except ValueError:
        # App already initialized
        pass
    
    # Get Firestore client
    db = firestore.client()
    
    # Load articles data
    with open('articles_on_sale.txt', 'r', encoding='utf-8') as f:
        articles_data = json.load(f)
    
    # Read the store names from results.txt to map store_id to store_name
    try:
        with open('results.txt', 'r', encoding='utf-8') as f:
            store_data = json.load(f)
            
        # Create a map of store_id to store_name
        store_names = {}
        for city_name, stores in store_data.items():
            for store_id in stores:
                # Extract store name from the URL (e.g., "ica-folkes-livs-1004181" -> "Folkes Livs")
                name_parts = store_id.split('-')
                if len(name_parts) >= 3:
                    # Remove 'ica' prefix and numeric ID suffix
                    store_name = ' '.join(name_parts[1:-1]).title().replace('-', ' ')
                    store_names[store_id] = store_name
                else:
                    store_names[store_id] = store_id  # Fallback to store_id if parsing fails
    except Exception as e:
        print(f"Warning: Could not load store names from results.txt: {e}")
        store_names = {}
    
    # Upload each store's articles to Firestore
    for store_id, articles in articles_data.items():
        # Convert articles to the required format
        formatted_articles = []
        for article in articles:
            formatted_article = {
                "name": article["name"],
                "price": article["price"],
                "discount_amount": article["discount_amount"],
                "discount_percentage": article["discount_percentage"]
            }
            formatted_articles.append(formatted_article)
        
        # Create data object with articles array and store_id
        data = {
            "articles": formatted_articles,
            "store_id": store_id,
            "store_name": store_names.get(store_id, store_id)  # Use store name if available, otherwise use store_id
        }
        
        # Add to Firestore using store_id as the document ID
        doc_ref = db.collection("articles").document(store_id)
        doc_ref.set(data)
        
        print(f"Uploaded {len(formatted_articles)} articles for store {store_id}")
    
    print("All articles uploaded successfully")

if __name__ == "__main__":
    upload_stores_to_firebase()
    upload_articles_to_firebase() 