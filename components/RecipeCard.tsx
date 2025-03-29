'use client';

// ... existing code ...

// Insert this above or near the existing interface/exports

type Ingredient = {
  name: string;
  price: number;
  originalPrice: number;
};

interface RecipeCardProps {
  title: string;
  ingredients: Ingredient[];
  savings: number;
  recipeUrl?: string;
  imageUrl?: string;
}

export function RecipeCard({ title, ingredients, savings, recipeUrl, imageUrl }: RecipeCardProps) {
  const handleViewRecipe = () => {
    if (recipeUrl) {
      window.open(recipeUrl, '_blank');
    }
  };
  
  console.log('Rendering RecipeCard for:', title);
  console.log('Ingredients received:', ingredients);

  return (
    <div className="recipe-card" style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      margin: '0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div className="savings-tag" style={{
        backgroundColor: '#f5f5f5',
        color: '#333',
        padding: '8px 16px',
        fontWeight: 'bold',
        fontSize: '16px',
        textAlign: 'center',
        width: '100%',
        borderBottom: '1px solid #eee'
      }}>
        Save {savings.toFixed(2)} kr
      </div>
      
      {imageUrl && (
        <div style={{ 
          width: '100%', 
          height: '250px',
          overflow: 'hidden'
        }}>
          <img 
            src={imageUrl} 
            alt={title} 
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} 
          />
        </div>
      )}
      
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 className="recipe-title" style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {title}
        </h3>

        {/* Debug info about ingredients */}
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px', textAlign: 'center' }}>
          {ingredients && ingredients.length ? `${ingredients.length} ingredients on sale` : 'No ingredients on sale'}
        </div>

        {ingredients && ingredients.length > 0 ? (
          <div className="recipe-ingredients" style={{
            width: '100%',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {ingredients.map((ingredient, index) => (
                <div 
                  key={index} 
                  className="ingredient-item" 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: index < ingredients.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <span className="ingredient-name" style={{ 
                    fontWeight: '500',
                    fontSize: '15px'
                  }}>
                    {ingredient.name}
                  </span>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 'bold',
                      fontSize: '15px'
                    }}>
                      {ingredient.price.toFixed(2)} kr
                    </span>
                    <span style={{ 
                      textDecoration: 'line-through',
                      color: '#999',
                      fontSize: '15px'
                    }}>
                      {ingredient.originalPrice.toFixed(2)} kr
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#f8f8f8', 
            borderRadius: '8px', 
            marginBottom: '20px',
            textAlign: 'center' 
          }}>
            No ingredients on sale for this recipe
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button 
            className="view-recipe-button"
            onClick={handleViewRecipe}
            disabled={!recipeUrl}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: recipeUrl ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: 'bold',
              opacity: recipeUrl ? 1 : 0.7,
              transition: 'all 0.2s ease'
            }}
          >
            View Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
// ... existing code ...