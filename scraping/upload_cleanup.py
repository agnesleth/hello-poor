import json
from firebase_admin import initialize_app, firestore
from firebase_admin import credentials

def clean_articles_in_firebase():
    """
    Scan all documents in the articles collection and remove specific
    unwanted items from the 'articles' array field.
    """
    # Initialize Firebase
    cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
    try:
        initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
    except ValueError:
        # App already initialized
        pass
    
    # Get Firestore client
    db = firestore.client()
    
    # Names of items to remove
    items_to_remove = ["Veckanstamis pris!", "Toaletpaper"]
    
    # Counter for statistics
    total_documents = 0
    documents_modified = 0
    total_items_removed = 0
    
    # Fetch all documents from the articles collection
    articles_ref = db.collection("articles")
    documents = articles_ref.stream()
    
    print("Scanning articles collection for items to remove...")
    
    # Process each store document
    for doc in documents:
        total_documents += 1
        store_id = doc.id
        data = doc.to_dict()
        
        # Skip if document doesn't have articles array
        if "articles" not in data or not isinstance(data["articles"], list):
            print(f"Skipping document {store_id}: No valid articles array found")
            continue
        
        # Get the original articles array
        original_articles = data["articles"]
        original_count = len(original_articles)
        
        # Filter out unwanted items
        filtered_articles = [
            article for article in original_articles 
            if article.get("name") not in items_to_remove
        ]
        
        # Count removed items
        removed_count = original_count - len(filtered_articles)
        
        # Update document if any items were removed
        if removed_count > 0:
            # Update the document in Firestore
            doc_ref = articles_ref.document(store_id)
            doc_ref.update({"articles": filtered_articles})
            
            documents_modified += 1
            total_items_removed += removed_count
            
            print(f"Updated store {store_id}: Removed {removed_count} items")
            
            # Print detailed info about removed items
            for article in original_articles:
                if article.get("name") in items_to_remove:
                    print(f"  - Removed: {article.get('name')} (Price: {article.get('price')})")
    
    # Print summary
    print("\nCleanup Summary:")
    print(f"Total documents scanned: {total_documents}")
    print(f"Documents modified: {documents_modified}")
    print(f"Total items removed: {total_items_removed}")
    print("Cleanup completed successfully")

if __name__ == "__main__":
    clean_articles_in_firebase()