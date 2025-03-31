import json
from firebase_admin import initialize_app, firestore
from firebase_admin import credentials

def check_firebase_data():
    """Check data that was uploaded to Firebase"""
    # Initialize Firebase
    cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
    try:
        initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
    except ValueError:
        # App already initialized
        pass
    
    # Get Firestore client
    db = firestore.client()
    
    # Get all documents from the cities collection
    cities_ref = db.collection("cities")
    docs = cities_ref.stream()
    
    # Display the data
    print(f"\n{'='*40}")
    print("CITIES COLLECTION DATA")
    print(f"{'='*40}")
    
    for doc in docs:
        doc_data = doc.to_dict()
        city_name = doc_data.get('name', 'Unknown')
        stores = doc_data.get('stores', [])
        
        print(f"\nDocument ID: {doc.id}")
        print(f"City Name: {city_name}")
        print(f"Number of Stores: {len(stores)}")
        print(f"First 3 stores: {', '.join(stores[:3])}...")
    
    print(f"\n{'='*40}")

if __name__ == "__main__":
    check_firebase_data() 