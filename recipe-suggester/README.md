# Zenny - AI Recipe Assistant 🍳

> Your intelligent cooking companion powered by Google Gemini AI

An advanced web application that transforms your available ingredients into delicious recipes, helps plan your meals, tracks nutrition, and provides personalized cooking advice. Built with Next.js, Python Flask, and Google Gemini 2.0.

![Zenny Logo](public/logodog.jpg)

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue?style=flat&logo=python)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-black?style=flat&logo=flask)](https://flask.palletsprojects.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0-orange?style=flat&logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

## � What’s New

- 🎯 Auto‑plan your week to calorie/macro goals
- 🥫 Pantry manager with pantry‑aware recipe prioritization
- 💰 Cost per serving on cards + Budget filter and Budget Mode
- 🔁 Smart ingredient substitutions with one‑tap apply/reset (used in shopping list)
- 🗺️ Region selector (US/EU/IN) for cost estimates and currency display
- 📰 "What’s New" strip on the homepage with quick actions
- 🆚 Ingredient swap comparison: "Original" vs "Your list"

## �🌟 What Makes Zenny Special?

- 🎯 **Smart AI Recipe Generation** - Get personalized recipes from your ingredients
- ⭐ **Favorites System** - Save and organize your favorite recipes
- 📅 **Weekly Meal Planner** - Plan 7 days of meals with automatic shopping lists
- 💪 **Nutritional Tracking** - View calories, protein, carbs, and fats per serving
- 🍽️ **Recipe Scaling** - Adjust servings with automatic ingredient recalculation
- 🔍 **Advanced Filters** - Filter by time, difficulty, cuisine, and diet type
- 🤖 **AI Chat Assistant** - Get cooking advice and substitution suggestions
- ⭐ **Community Ratings** - Rate recipes and see what others love
- 🎨 **Beautiful UI** - Modern dark theme with smooth animations
- 🚀 **Lightning Fast** - Optimized for speed with progressive image loading
 - 🥫 **Pantry‑Aware Suggestions** - Prioritize recipes that use what you already have
 - 💰 **Cost‑Aware Cooking** - See $/serving, filter by budget, and prefer cheaper swaps
 - 🔁 **Smart Substitutions** - One‑tap ingredient swaps with reasons and reset
 - 🎯 **Goal‑Based Planning** - Auto‑fill the week to hit your calories/macros

## ✨ Features

### 🔍 **Smart Recipe Discovery**
- **Ingredient-Based Search**: Enter your available ingredients and get personalized recipe recommendations
- **Dish Search**: Find variations of specific dishes (e.g., "Pasta Carbonara")
- **Trending Recipes**: Discover popular recipes from around the world
- **Deterministic Image System**: Accurate food images using curated Unsplash photos with 24+ categories

### 🤖 **AI-Powered Assistant**
- **Interactive Chatbot**: Get answers about recipes, substitutions, and cooking techniques
- **Context-Aware**: Chat remembers your current recipe for relevant suggestions
- **Real-Time Streaming**: Fast AI responses powered by Gemini 2.0 Flash

### ⭐ **Favorites & Collections**
- **Save Recipes**: Heart your favorite recipes for quick access
- **Persistent Storage**: Favorites saved in browser localStorage
- **Quick View**: Dedicated favorites page with all saved recipes

### 📅 **Meal Planning**
- **7-Day Calendar**: Plan breakfast, lunch, and dinner for the entire week
- **Drag & Drop**: Easy recipe assignment to meal slots
- **Shopping List Generator**: Automatically aggregate ingredients from planned meals
- **One-Click Copy**: Copy shopping list to clipboard instantly
 - **Auto‑Plan to Goals**: Fill the week targeting your daily calories/macros

### 📊 **Advanced Filters**
- **Time Filter**: Filter by cooking time (15min, 30min, 45min, 1hr+)
- **Difficulty Filter**: Choose Easy, Medium, or Hard recipes
- **Cuisine Filter**: Browse by cuisine type (Indian, Italian, Chinese, Mexican, Thai, etc.)
- **Diet Filters**: Filter by Veg, Non-Veg, or Vegan options
 - **Budget Filter**: Any, or under $2/$5/$8/$12 per serving

### 🍽️ **Recipe Scaling**
- **Servings Adjustment**: Scale recipes up or down with +/- buttons
- **Smart Scaling**: Automatically recalculates ingredient quantities
- **Nutrition Scaling**: Macros adjust proportionally with servings

### 💪 **Nutritional Information**
- **Comprehensive Data**: View calories, protein, carbs, and fats per serving
- **Visual Badges**: Color-coded nutritional info on recipe cards
- **Detailed Panel**: Full macro breakdown in recipe modal

### ⭐ **Rating System**
- **5-Star Ratings**: Rate recipes to help others discover great dishes
- **Average Ratings**: See community ratings with total count
- **Personal Tracking**: Your ratings are remembered

### 🎨 **Modern UI/UX**
- **Dark Theme**: Beautiful dark interface with gradients
- **Glassmorphism**: Modern backdrop blur effects
- **Smooth Animations**: Hover effects, scale transitions, and loading states
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Gradient Accents**: Signature yellow → pink → purple theme throughout

### 🥫 Pantry‑Aware Cooking
- Add pantry items (onions, rice, milk, etc.) and the app prioritizes recipes that use them.
- Pantry items are excluded from shopping lists.
- Toggle “📦 Prioritize Pantry” to sort by pantry match.

### 💰 Cost‑Aware Cooking
- Each recipe shows a rough “$X.XX per serving” estimate.
- Filter results by budget and enable “� Budget Mode” to prefer cheaper substitutions in the shopping list.
- Uses a lightweight keyword price map (tunable/region‑aware in future).
 - Choose your region (US/EU/IN) to adjust costs and currency symbol.

### 🔁 Smart Ingredient Substitutions
- In the recipe modal, ingredients offer one‑tap “Swap → …” suggestions.
- Reasons are provided; cheaper swaps are highlighted in green.
- Applied swaps persist during the session and feed into the shopping list.
 - Toggle “Compare swaps” to view side‑by‑side: Original vs Your list.

## �📸 Screenshots

### Main Interface
- Clean search interface with ingredient and dish search modes
- Beautiful gradient buttons and dark theme
- Trending recipes button for quick inspiration

### Recipe Cards
- Nutritional badges (calories, protein, carbs, fats)
- Heart icons for favoriting
- Diet type indicators (Veg/Non-Veg/Vegan)
- Cooking time and difficulty display
- Hover animations and gradient effects

### Recipe Modal
- Large hero image with gradient overlay
- Servings scaler with +/- buttons
- Nutrition panel with per-serving macros
- Ingredient list with scaled quantities
- Pantry indicators and one‑tap swaps on ingredients
- Step-by-step instructions
- Rating system (1-5 stars)
- YouTube video search integration

### Meal Planner
- 7-day calendar view with "TODAY" badge
- Breakfast, lunch, dinner slots per day
- Custom dropdown styling with animations
- Shopping list generator
- Goals panel with Auto‑Fill button
- Beautiful gradient cards with hover effects
 - Ingredient swaps are reflected in the shopping list; pantry items are auto‑excluded

### Favorites
- Grid view of all saved recipes
- Quick access to favorite dishes
- One-click to view full recipe
- Empty state with helpful message

## 🔧 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
# On Windows:
.\\venv\\Scripts\\activate
# On Mac/Linux:
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install Flask flask-cors google-generativeai python-dotenv
```

4. **⚠️ IMPORTANT - Configure Gemini API Key:**
   - Open the `.env` file in the `backend` directory
   - Replace `your_gemini_api_key_here` with your actual Gemini API key:
     ```
     GEMINI_API_KEY=your-actual-api-key-here
     ```
   - Save the file
   - Get your FREE API key from: https://aistudio.google.com/app/apikey

5. Start the Flask server:
```bash
python app.py
```

The backend will run on http://127.0.0.1:5000

## 🚀 How to Use

### Basic Recipe Search

1. **Choose Search Mode**:
   - 🥘 **By Ingredients**: Enter what you have (e.g., `chicken, rice, tomatoes`)
   - 🍽️ **By Dish**: Search for specific dishes (e.g., `Chicken Biryani`)

2. **Apply Filters** (Optional):
   - Select diet type: Veg / Non-Veg / Vegan
   - After recipes load, use advanced filters for time, difficulty, and cuisine

3. **Get Recipes**: Click "Get Recipes" and wait for AI-generated suggestions

4. **View Details**: Click any recipe card to see:
   - Full ingredient list with quantities
   - Step-by-step instructions
   - Nutritional information
   - Adjustable servings

### Advanced Features

#### ⭐ **Using Favorites**
1. Click the heart icon (🤍) on any recipe card
2. Access favorites anytime via the **⭐ Favorites** button at the top
3. Favorites are saved in your browser automatically

#### 📅 **Meal Planning**
1. Generate some recipes first
2. Click **📅 Meal Planner** button
3. Use dropdowns to assign recipes to meal slots
4. Click **📋 Generate Shopping List** to get all ingredients
5. Shopping list is copied to clipboard automatically
 6. Set daily calories/macros and click **⚡ Auto‑Fill Week to Goals** to populate the plan

#### 🍽️ **Scaling Recipes**
1. Open any recipe modal
2. Use +/- buttons to adjust servings
3. Ingredients and nutrition update automatically
4. Click "Reset" to return to original serving size

#### 💬 **AI Chat Assistant**
1. Click the **💬 Chat Assistant** button in header
2. Ask questions about recipes, substitutions, or cooking techniques
3. Chat remembers context from your current recipe
4. Get instant AI-powered cooking advice

#### ⭐ **Rating Recipes**
1. Open any recipe modal
2. Click stars to rate (1-5 stars)
3. Your rating is saved and contributes to average rating
4. See community ratings on recipe cards

#### 🥫 **Using the Pantry**
1. Click **🥫 Pantry** in the filters row.
2. Add items like `onion, rice` and close the panel.
3. Toggle **📦 Prioritize Pantry** to sort recipes by pantry match.
4. Shopping lists automatically skip items that are already in your pantry.

#### 💰 **Budget & Cost**
1. Choose a **💸 Budget** filter (e.g., Under $5/serv).
2. Toggle **💰 Budget Mode** to prefer cheaper substitutions in the shopping list.
3. See per‑serving cost on recipe cards, with region‑specific currency.
4. Switch **🗺️ Region** in the filters to adjust estimates.

#### 🔁 **Ingredient Swaps**
1. Open a recipe modal and scroll to Ingredients.
2. Tap a “Swap → …” chip to apply; tap Reset to undo.
3. Toggle **Compare swaps** to see Original vs Your list.
4. Applied swaps are reflected in your shopping list.

## 🛠️ Technologies Used

### Frontend
- **Framework**: Next.js 16 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 with custom animations
- **UI Components**: React 19
- **Markdown**: react-markdown with remark-gfm
- **Storage**: Browser localStorage for favorites and meal plans

### Backend
- **Framework**: Python Flask 3.0+
- **AI Model**: Google Gemini 2.0 Flash Experimental
- **APIs**: 
  - Gemini Generative AI
  - Unsplash (for curated food images)
- **CORS**: flask-cors for cross-origin requests
- **Environment**: python-dotenv for configuration
- **Data Storage**: JSON files (ratings, image cache)
- **Server**: Gunicorn-ready for production deployment

### Key Features Implementation
- **Deterministic Images**: Token-based category matching with confidence scoring
- **Recipe Scaling**: Smart ingredient quantity recalculation
- **Meal Planning**: Date-based recipe assignment with ingredient aggregation
- **Nutritional Data**: AI-generated macro estimates per serving
- **Rating System**: Persistent JSON storage with average calculation
- **Filters**: Client-side filtering for instant results

## 📊 Performance Optimizations

- **Fast Recipe Loading**: Recipes displayed immediately, images load progressively
- **Reduced AI Load**: 3 recipes per search (optimized from 5)
- **Parallel Image Fetching**: Non-blocking image loads
- **Cached Images**: Deterministic URLs prevent duplicate API calls
- **Client-Side Filtering**: Instant filter application without backend calls

## 🎨 Design Philosophy

- **Dark Theme**: Easy on the eyes for late-night cooking
- **Gradient Accents**: Signature yellow → pink → purple branding
- **Glassmorphism**: Modern backdrop blur effects
- **Micro-interactions**: Hover states, scale transitions, and smooth animations
- **Responsive**: Mobile-first design that scales to any screen size

## 📝 Notes

- ✅ The Gemini API is **FREE** to use with generous rate limits
- ✅ Make sure both frontend and backend servers are running
- ✅ Requires internet connection for AI API communication
- ✅ Favorites and meal plans are saved in browser (localStorage)
- ✅ Recipe ratings are stored in backend JSON file
- ✅ Images are cached for faster subsequent loads

## 🚀 Deployment

### Netlify (Frontend)
The Next.js frontend is configured for Netlify deployment with `netlify.toml`.

### Backend Options
- **Local**: `python app.py` (development)
- **Gunicorn**: Production-ready WSGI server included
- **Cloud**: Deploy to Heroku, Railway, or any Python hosting

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available for educational purposes.

## 👨‍💻 Developer

Built with ❤️ by **TwistedVision518**

- GitHub: [@TwistedVision518](https://github.com/TwistedVision518)
- Instagram: [@pranavislost](https://www.instagram.com/pranavislost/)

---

**Zenny** - Your AI-powered cooking companion 🍳✨

- GitHub: [TwistedVision518](https://github.com/TwistedVision518)
- Instagram: [@pranavislost](https://www.instagram.com/pranavislost/)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
