#!/bin/bash

# Deploy the updated Firebase function

echo "Deploying Firebase function..."
echo "Make sure you have Firebase CLI installed and are logged in."

# Navigate to the functions directory
cd ../functions

# Deploy only the function (not the entire project)
firebase deploy --only functions:generateRecipeMatches

echo "Deployment complete. Check the Firebase console for the function status."
echo "Your client app should now be able to call the function without CORS or authentication errors." 