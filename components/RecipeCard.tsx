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
        borderRadius: '8px',
        margin: '0',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '480px',
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
          top: '12px',
          right: '12px',
          zIndex: 10,
          backgroundColor: 'white',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          opacity: isHovered || isFav ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <Heart 
          fill={isFav ? "#ff4747" : "transparent"} 
          color={isFav ? "#ff4747" : "#666"} 
          size={18} 
        />
      </button>
      <div className="savings-tag" style={{
        backgroundColor: '#f5f5f5',
        color: '#333',
        padding: '4px 8px',
        fontWeight: 'bold',
        fontSize: '13px',
        textAlign: 'center',
        width: '100%',
        borderBottom: '1px solid #eee'
      }}>
        Save {savings.toFixed(2)} kr
      </div>
      
      {imageUrl && (
        <div style={{ 
          width: '100%', 
          height: '180px',
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
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden'
      }}>
        <h3 className="recipe-title" style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textAlign: 'center',
          height: '60px',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
          lineHeight: '1.2'
        }}>
          {title}
        </h3>

        {/* Debug info about ingredients */}
        <div style={{ 
          fontSize: '11px', 
          color: '#999', 
          marginBottom: '4px',
          textAlign: 'center',
          height: '16px',
          overflow: 'hidden',
          padding: '0 4px'
        }}>
          {ingredients && ingredients.length ? `${ingredients.length} ingredients on sale` : 'No ingredients on sale'}
        </div>

        {ingredients && ingredients.length > 0 ? (
          <div className="recipe-ingredients" style={{
            width: '100%',
            marginBottom: '12px',
            flex: 1,
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              height: '140px',
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              padding: '8px',
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
                    padding: '4px 0',
                    borderBottom: index < ingredients.length - 1 ? '1px solid #eee' : 'none'
                  }}
                >
                  <span className="ingredient-name" style={{ 
                    fontWeight: '500',
                    fontSize: '13px',
                    maxWidth: '60%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {ingredient.name}
                  </span>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '4px'
                  }}>
                    <span style={{ 
                      fontWeight: 'bold',
                      fontSize: '13px'
                    }}>
                      {ingredient.price.toFixed(2)} kr
                    </span>
                    <span style={{ 
                      textDecoration: 'line-through',
                      color: '#999',
                      fontSize: '13px'
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
            padding: '8px', 
            backgroundColor: '#f8f8f8', 
            borderRadius: '6px', 
            marginBottom: '12px',
            textAlign: 'center',
            height: '140px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #f0f0f0',
            fontSize: '13px'
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
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: recipeUrl ? 'pointer' : 'not-allowed',
              fontSize: '13px',
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