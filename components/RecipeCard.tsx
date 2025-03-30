'use client';

// ... existing code ...

// Insert this above or near the existing interface/exports
import { useState } from 'react';
import { useFavorites, Recipe as FavoriteRecipe } from '@/lib/FavoritesContext';
import { Heart } from 'lucide-react';

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
  storeId?: string;
  storeName?: string;
}

export function RecipeCard({ title, ingredients, savings, recipeUrl, imageUrl, storeId = '', storeName = '' }: RecipeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const recipeId = `${title}-${storeId}`;
  const isFav = isFavorite(recipeId);

  const handleViewRecipe = () => {
    if (recipeUrl) {
      window.open(recipeUrl, '_blank');
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isFav) {
      removeFavorite(recipeId);
    } else {
      const recipe: FavoriteRecipe = {
        id: recipeId,
        title,
        ingredients,
        savings,
        recipeUrl,
        imageUrl,
        storeId,
        storeName
      };
      addFavorite(recipe);
    }
  };
  
  console.log('Rendering RecipeCard for:', title);
  console.log('Ingredients received:', ingredients);

  return (
    <div 
      className="recipe-card" 
      style={{
        backgroundColor: 'white',
        borderRadius: '6px',
        margin: '0',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '360px',
        overflow: 'hidden',
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Heart icon for favorites */}
      <button 
        className={`favorite-button ${isHovered || isFav ? 'visible' : 'invisible'}`}
        onClick={handleToggleFavorite}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10,
          backgroundColor: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          opacity: isHovered || isFav ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <Heart 
          fill={isFav ? "#ff4747" : "transparent"} 
          color={isFav ? "#ff4747" : "#666"} 
          size={14} 
        />
      </button>
      <div className="savings-tag" style={{
        backgroundColor: '#f5f5f5',
        color: '#333',
        padding: '3px 6px',
        fontWeight: 'bold',
        fontSize: '11px',
        textAlign: 'center',
        width: '100%',
        borderBottom: '1px solid #eee'
      }}>
        Save {savings.toFixed(2)} kr
      </div>
      
      {imageUrl && (
        <div style={{ 
          width: '100%', 
          height: '120px',
          overflow: 'hidden',
          flexShrink: 0
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
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden'
      }}>
        <h3 className="recipe-title" style={{
          margin: '0 0 5px 0',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          height: '50px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
          lineHeight: '1.1'
        }}>
          {title}
        </h3>

        {/* Debug info about ingredients */}
        <div style={{ 
          fontSize: '9px', 
          color: '#999', 
          marginBottom: '3px',
          textAlign: 'center',
          height: '12px',
          overflow: 'hidden',
          padding: '0 3px'
        }}>
          {ingredients && ingredients.length ? `${ingredients.length} ingredients on sale` : 'No ingredients on sale'}
        </div>

        {ingredients && ingredients.length > 0 ? (
          <div className="recipe-ingredients" style={{
            width: '100%',
            marginBottom: '8px',
            flex: 1,
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              height: '85px',
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '4px',
              padding: '5px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d1d1 #f5f5f5',
              WebkitOverflowScrolling: 'touch'
            }}>
              {ingredients.map((ingredient, index) => (
                <div 
                  key={index} 
                  className="ingredient-item" 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '2px 0',
                    borderBottom: index < ingredients.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <span className="ingredient-name" style={{ 
                    fontWeight: '500',
                    fontSize: '11px',
                    maxWidth: '50%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {ingredient.name}
                  </span>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '3px'
                  }}>
                    <span style={{ 
                      fontWeight: 'bold',
                      fontSize: '11px'
                    }}>
                      {ingredient.price.toFixed(2)} kr
                    </span>
                    <span style={{ 
                      textDecoration: 'line-through',
                      color: '#999',
                      fontSize: '11px'
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
            padding: '5px', 
            backgroundColor: '#f8f8f8', 
            borderRadius: '4px', 
            marginBottom: '8px',
            textAlign: 'center',
            height: '85px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #f0f0f0',
            fontSize: '11px'
          }}>
            No ingredients on sale for this recipe
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
          <button 
            className="view-recipe-button"
            onClick={handleViewRecipe}
            disabled={!recipeUrl}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              padding: '5px 10px',
              cursor: recipeUrl ? 'pointer' : 'not-allowed',
              fontSize: '11px',
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