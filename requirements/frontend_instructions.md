#Project overview
Use this guide to build a webb app where users enter their city, select stores they want to shop from, their food preferences and recipes will be generated based on what's on sale in these stores.

#Feature requirements
- We will use Next.js, Shadcn and Firebase

#################################
firebase configuration: 
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMW4YRYDIDLExMUByPjkhi7pVLjgT5mU4",
  authDomain: "hellopoor-16c13.firebaseapp.com",
  projectId: "hellopoor-16c13",
  storageBucket: "hellopoor-16c13.firebasestorage.app",
  messagingSenderId: "776206171526",
  appId: "1:776206171526:web:95ff4c2187ca0dc53e4007",
  measurementId: "G-9SPFP62GEF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

############################# PAGE INSTRUCTIONS
- Create a form where users input their name, email and town (from a dropdown menu, with values for towns are taken from the firebase collection ”cities” field = ”name”), then based on the city they choose they get the corresponding field ”stores” for that ”name” that they can select with a checkbox. The selected stores are stored as the variable allowed_stores and a user is created in the collection ”users” with the fields name = Name, email = ”email” and allowed_stores = allowed stores. 

- The user can then input their food-preferences as multi-choice from a dropdown menu which fetches its value from the firebase collection ”allowed_food_prefs” with the field ”name”. This is stored as a list [chosen food pref 1, chosen food pref 2..]
- The user can then press generate recipes and then a firebase cloud function called ”generate_user_matches” with the arguments user = newly created user reference, food_preferences = food preferences. This function returns recipes on the form [ [recipe_name, recipe_url, recipe_img, money_saved, discounted_artcles], … ].
- Display these recipes in a nice grid layout with images and short descriptions
- Show a loading spinner or animation while fetching data or generating recipes
- When hovering over a recipe card:
  - Show a button to save/favorite the recipe
  - Show a button to click the url to view the full recipe

#Current file structure
HELLO-POOR/
├── .next/
├── app/
├── components/
│   ├── requirements/
│   │   └── frontend_instructions.md
│   └── ui/
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── context-menu.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── hover-card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── navigation-menu.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       └── textarea.tsx
├── lib/
├── node_modules/
├── public/
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json

#Rules
- All new components should go in /components and be named like example-component.tsx unless otherwise specified
- All new pages go in /app
