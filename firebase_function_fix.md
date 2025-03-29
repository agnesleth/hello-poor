# Firebase Function Fix: "Unhandled error: The default Firebase app does not exist"

## Problem
You were seeing this error in your Firebase Function logs:
```
DEFAULT 2025-03-29T19:57:20.996837Z Unhandled error: The default Firebase app does not exist. Make sure to initialize the SDK by calling initialize_app().
```

## Solution
We fixed the issue by explicitly initializing Firebase in your Cloud Functions environment. The original code assumed that Firebase was automatically initialized in the Cloud Function environment, but that's not always the case.

### Changes Made:
1. Added explicit initialization for Cloud Functions environment:
   ```python
   if os.getenv('FUNCTION_TARGET') is None:
       # Local initialization with certificate
       cred = credentials.Certificate("/Users/buyn/Desktop/agnes_och_axel/serviceAccountKey.json")
       initialize_app(cred, {'storageBucket': 'hellopoor-16c13.appspot.com'})
   else:
       # Cloud Functions environment initialization
       try:
           initialize_app()
       except ValueError:
           # App already initialized - this is fine
           pass
   ```

2. Added CORS support to the function decorator:
   ```python
   @https_fn.on_call(timeout_sec=600, memory=options.MemoryOption.GB_2, cors=True)
   ```

## Deployment
To deploy the updated function, run the deployment script:
```bash
cd /Users/buyn/Desktop/agnes_och_axel/hello-poor
./deploy_function.sh
```

## Client-Side Changes
We also made client-side changes to properly call the function:
1. Specified the region in functions initialization: `getFunctions(app, 'us-central1')`
2. Used a promise-based approach for better error handling
3. Removed authentication requirements

After deploying the updated function, your client code should successfully call the Firebase function without the initialization error.

## Extra Verification
If the function works when called directly from Firebase Console but still fails when called from your app, verify that:
1. Your function is deployed to the correct region (us-central1)
2. CORS is properly enabled in the function
3. Your function doesn't require authentication or you're properly handling authentication 