# New Features - Zenny Recipe AI

## 🌟 Recently Added Features

### 1. Diet Filter (Veg/Non-Veg) 🥬🍖
Filter recipes based on dietary preferences:
- **All** - Show all recipes
- **🥬 Veg** - Vegetarian recipes only
- **🍖 Non-Veg** - Non-vegetarian recipes only

**Usage:**
- Diet filter buttons appear below the search mode toggle
- Click any diet type to filter results
- Recipe cards show diet badges with color coding
- Filter persists until changed

### 2. Recipe Rating System ⭐
Rate recipes from 1-5 stars:
- **Interactive star rating** in recipe modal
- **Average rating display** on recipe cards
- **Rating count** shows how many users rated
- **Persistent ratings** saved to JSON file

**Usage:**
- Open any recipe to see the rating interface
- Click on stars (1-5) to rate
- Your rating is instantly saved and displayed
- Ratings persist across server restarts

### 3. Trending Recipes 🔥
Discover popular recipes based on community ratings:
- **Trending button** in search mode toggle
- **Smart algorithm** ranks by rating and popularity
- **Fallback to popular recipes** if no ratings yet
- All recipes include diet type information

**Usage:**
- Click the "🔥 Trending" button
- View 8 trending recipes
- Rate them to influence future trending results

## 💾 Data Persistence

### Ratings Storage
- **File:** `backend/ratings_data.json`
- **Format:** JSON (human-readable)
- **Async saving:** Non-blocking writes for better performance
- **Thread-safe:** Uses locking to prevent data corruption
- **Auto-load:** Ratings load automatically on server start

### Benefits
- **Fast:** JSON file I/O is extremely fast for this data size
- **Persistent:** Ratings survive server restarts
- **Portable:** Easy to backup, transfer, or analyze
- **Simple:** No database setup required

## 🎨 Design Details

### Color Coding
- **Veg recipes:** Green gradient (`bg-green-500/20 text-green-400`)
- **Non-veg recipes:** Red-orange gradient (`bg-red-500/20 text-red-400`)
- **Vegan recipes:** Emerald gradient (`bg-emerald-500/20 text-emerald-400`)
- **Rating stars:** Yellow (`text-yellow-400`)

### UI Components
- **Diet badges:** Rounded pills with emoji indicators
- **Star rating:** Interactive 5-star system with hover effects
- **Filter buttons:** Matching gradient design with smooth transitions
- **Count display:** Shows filtered results "(X of Y recipes)"

## 🚀 API Endpoints

### Rating Endpoints
```
POST /api/recipes/rate
Body: { recipe_id: string, rating: number (1-5) }
Response: { success: bool, average_rating: number, total_ratings: number }
```

```
GET /api/recipes/ratings
Response: { 
  total_recipes_rated: number,
  total_ratings_count: number,
  top_rated: array,
  all_ratings: object
}
```

### Trending Endpoint
```
GET /api/recipes/trending
Response: { recipes: array }
```

## 📊 Analytics Available

The `/api/recipes/ratings` endpoint provides:
- Total recipes that have been rated
- Total number of ratings submitted
- Top 10 rated recipes
- Complete ratings database

Use this for:
- Understanding user preferences
- Improving recipe suggestions
- Analyzing rating patterns
- Generating reports

## 🔧 Technical Implementation

### Frontend (React/TypeScript)
- State management with React hooks
- Real-time filtering with `filteredRecipes`
- Optimistic UI updates for ratings
- Type-safe interfaces for Recipe data

### Backend (Flask/Python)
- Thread-safe file operations
- Async saving (non-blocking)
- In-memory cache for speed
- Automatic data persistence

### Performance
- **Ratings load:** ~1-5ms (from file on startup)
- **Rating save:** Async (0ms blocking time)
- **Filter operation:** Instant (client-side)
- **Trending fetch:** 2-3 seconds (AI generation)

## 🎯 Future Enhancements

Possible additions:
- User accounts (personalized ratings)
- Rating history and editing
- Comments/reviews on recipes
- Social sharing of favorites
- Recipe collections/bookmarks
- Advanced filtering (cuisine, difficulty, time)
- Search within trending recipes
- Export ratings data as CSV

---

**Last Updated:** November 20, 2025
**Version:** 2.0.0
