'use client';

interface Ingredient {
  name: string;
  price: number;
  originalPrice: number;
}

interface RecipeCardProps {
  title: string;
  ingredients: Ingredient[];
  savings: number;
}

export function RecipeCard({ title, ingredients, savings }: RecipeCardProps) {
  return (
    <div className="recipe-card">
      <div className="savings-tag">Save {savings.toFixed(2)} kr</div>
      
      <h3 className="recipe-title">{title}</h3>
      
      <div className="recipe-ingredients">
        {ingredients.map((ingredient, index) => (
          <div key={index} className="ingredient-item">
            <span className="ingredient-name">{ingredient.name}</span>
            <span className="ingredient-price">
              {ingredient.price.toFixed(2)} kr
              <span className="original-price">{ingredient.originalPrice.toFixed(2)} kr</span>
            </span>
          </div>
        ))}
      </div>

      <button className="view-recipe-button">View Recipe</button>
    </div>
  );
} 