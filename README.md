# Hello Poor

A web application that helps users find recipes based on local grocery deals. Type in your city and get recipes that use discounted ingredients from stores near you.

## Features

- User registration with name and location
- Store selection based on user's city
- Food preference customization
- Recipe recommendations based on current grocery deals
- Money-saving calculations for each recipe
- Modern and responsive UI

## Tech Stack

- Next.js 14
- Firebase (Authentication, Firestore, Cloud Functions)
- Tailwind CSS
- TypeScript
- Shadcn UI Components

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hello-poor.git
cd hello-poor
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a new Firebase project
   - Enable Firestore
   - Copy your Firebase config to `lib/firebase.ts`
   - Deploy the cloud functions (found in the `functions` directory)

4. Create necessary Firestore collections:
   - `cities`: Contains city names and their associated stores
   - `allowed_food_prefs`: Contains available food preferences
   - `users`: Will store user data and preferences

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
HELLO-POOR/
├── app/                   # Next.js app directory
├── components/           # React components
├── lib/                  # Utility functions and configurations
├── public/              # Static assets
└── types/               # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
