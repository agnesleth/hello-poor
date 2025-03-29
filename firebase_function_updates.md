# Firebase Function Updates

To fix the CORS and authentication issues with your Firebase Cloud Function, you need to make the following changes to your `functions/main.py` file:

## 1. Add CORS Headers and Allow Unauthenticated Access

First, you need to update your `generateRecipeMatches` function to:
1. Allow unauthenticated access
2. Add CORS headers to handle requests from your local development environment

```python
@https_fn.on_call(
    timeout_sec=600, 
    memory=options.MemoryOption.GB_2,
    cors=True,  # Enable CORS for all origins
    region="us-central1"  # Specify the region where your function is deployed
)
def generateRecipeMatches(request: https_fn.CallableRequest) -> Dict:
    # Rest of your function code remains the same
    ...
```

## 2. Deploy the Updated Function

After making these changes, deploy your updated function:

```bash
firebase deploy --only functions
```

## 3. Set Function to Public (Optional but Recommended for Development)

For development purposes, you can make your function callable without authentication. Go to the Firebase Console:

1. Open your Firebase project
2. Go to "Functions" in the left sidebar
3. Find the `generateRecipeMatches` function
4. Click on the three dots menu (⋮) and select "Edit permissions"
5. Add an entry for `allUsers` with the "Cloud Functions Invoker" role
6. Save the changes

## 4. Alternative Solution for Testing

If you want to avoid modifying permissions, you can temporarily add authorization headers to your function calls in the client code:

```typescript
// In your recipes/page.tsx, add this before calling the function:
const app = getApp();
const functions = getFunctions(app);
// Set auth and region explicitly
functions.customHeaders = {
  "Authorization": "Bearer owner"  // For development only!
};
```

## 5. Long-term Solution

For production, implement proper Firebase Authentication in your app and use authenticated users to call the function. This is the recommended secure approach.

```typescript
// First import:
import { getAuth, signInAnonymously } from 'firebase/auth';

// Then before calling functions:
const auth = getAuth();
await signInAnonymously(auth);
// Now your function calls will be authenticated
```

These changes should resolve both the CORS and authentication issues you're experiencing with your Firebase Cloud Function. 