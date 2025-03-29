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

# Updated function with CORS enabled and no authentication required
@https_fn.on_call(
    timeout_sec=600, 
    memory=options.MemoryOption.GB_2,
    cors=True,  # Enable CORS for all origins
    region="us-central1"  # Specify the region
)
def generateRecipeMatches(request: https_fn.CallableRequest) -> Dict:
    """
    Firebase callable function that generates recipe recommendations
    based on user preferences and sale items at allowed stores.
    
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
    
    # Rest of your function code remains the same...
    # ...

    # Return a placeholder response for now - replace this with your actual implementation
    return {
        "status": "success",
        "recommendations": [
            {
                "recipe_name": "Pasta with Meatballs",
                "recipe_url": "https://example.com/recipe1",
                "recipe_img": "https://example.com/img1.jpg",
                "discounted_ingredients": ["Pasta", "Ground Beef"],
                "savings_info": [
                    {
                        "ingredient": "Pasta",
                        "price": "15.90",
                        "discount_amount": "5.00",
                        "discount_percentage": "24"
                    },
                    {
                        "ingredient": "Ground Beef",
                        "price": "49.90",
                        "discount_amount": "10.00",
                        "discount_percentage": "17"
                    }
                ]
            }
        ]
    } 