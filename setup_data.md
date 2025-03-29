# Setting up Test Data in Firestore

Based on your logs, it appears that there's an issue with your "stores" collection in Firestore. Let's set up some test data to make sure your function works properly.

## Store Data Structure

First, make sure your "stores" collection has the correct document structure:

1. Each store document should have a `store_id` field that matches exactly what's in the user's `allowed_stores` array
2. Each store document should have an `articles` array with sale items

## Add Test Store Data

1. Go to the [Firebase Console](https://console.firebase.google.com/project/hellopoor-16c13/firestore)
2. Navigate to the "stores" collection
3. Create a new document with the following data:

```
Document ID: (auto-generated)
Fields:
  store_id: "ica-nara-hornan-1003672"  // This should match exactly what's in user's allowed_stores
  articles: array
    [0]: array
      [0]: "Ground Beef"   // Product name
      [1]: "89.90"         // Price
      [2]: "20.00"         // Discount amount
      [3]: "22%"           // Discount percentage
    [1]: array
      [0]: "Pasta"
      [1]: "15.90"
      [2]: "5.00"
      [3]: "31%"
    [2]: array
      [0]: "Tomato Sauce"
      [1]: "22.90"
      [2]: "7.00"
      [3]: "30%"
    [3]: array
      [0]: "Chicken Breasts"
      [1]: "109.90"
      [2]: "30.00"
      [3]: "27%"
    [4]: array
      [0]: "Rice"
      [1]: "29.90"
      [2]: "10.00"
      [3]: "33%"
```

## Verify User Data

1. Check the user document with ID `eVWKSgs7wHkHrfgraBmu`
2. Make sure the `allowed_stores` array contains `"ica-nara-hornan-1003672"` (exactly this string)

## Verify Recipes Data

Make sure your "recipes" collection has documents with the following structure:

```
Document ID: (auto-generated)
Fields:
  recipe_name: "Spaghetti and Meatballs"
  recipe_url: "https://example.com/spaghetti-meatballs"
  recipe_img: "https://example.com/images/spaghetti.jpg"
  category: "Italian"
  main_ingredients: array
    [0]: "Ground Beef"
    [1]: "Pasta"
    [2]: "Tomato Sauce"
```

## Deploy Updated Function

After setting up the test data, deploy your updated function:

```bash
cd /Users/buyn/Desktop/agnes_och_axel/functions
./deploy.sh
```

The updated function includes more detailed debugging and will use sample data if no store data is found, ensuring you always get some recipe recommendations. 