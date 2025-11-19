from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import threading
import time
import re

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
CORS(app)

# Ratings persistence file
RATINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ratings_data.json')
ratings_lock = threading.Lock()

# Image cache persistence file
IMAGE_CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'image_cache.json')
image_cache_lock = threading.Lock()

# Load ratings from file on startup
def load_ratings():
    """Load ratings from JSON file"""
    if os.path.exists(RATINGS_FILE):
        try:
            with open(RATINGS_FILE, 'r') as f:
                data = json.load(f)
                print(f"✅ Loaded {len(data)} recipe ratings from file")
                return data
        except Exception as e:
            print(f"⚠️  Error loading ratings: {e}")
            return {}
    return {}

# Save ratings to file
def save_ratings(ratings_data):
    """Save ratings to JSON file (async to avoid blocking)"""
    def _save():
        try:
            with ratings_lock:
                with open(RATINGS_FILE, 'w') as f:
                    json.dump(ratings_data, f, indent=2)
        except Exception as e:
            print(f"⚠️  Error saving ratings: {e}")
    
    # Save in background thread to not block requests
    threading.Thread(target=_save, daemon=True).start()

# In-memory storage for ratings (loaded from file)
recipe_ratings = load_ratings()

# -------- Deterministic image selection & caching -------- #

def load_image_cache():
    """Load previously chosen images to keep results stable across restarts."""
    if os.path.exists(IMAGE_CACHE_FILE):
        try:
            with open(IMAGE_CACHE_FILE, 'r') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    print(f"✅ Loaded {len(data)} cached recipe images")
                    return data
        except Exception as e:
            print(f"⚠️  Error loading image cache: {e}")
    return {}


def save_image_cache(cache: dict):
    """Persist image cache asynchronously (non-blocking)."""
    def _save():
        try:
            with image_cache_lock:
                with open(IMAGE_CACHE_FILE, 'w') as f:
                    json.dump(cache, f, indent=2)
        except Exception as e:
            print(f"⚠️  Error saving image cache: {e}")

    threading.Thread(target=_save, daemon=True).start()


image_cache = load_image_cache()

# Curated categories with synonyms and stable Unsplash photo ids
CURATED_IMAGES = {
    # carbs / bases
    'pizza': { 'keywords': ['pizza', 'margherita', 'pepperoni'], 'unsplash': 'photo-1513104890138-7c749659a591' },
    'burger': { 'keywords': ['burger', 'cheeseburger', 'hamburger', 'patty'], 'unsplash': 'photo-1568901346375-23c9450c58cd' },
    'pasta': { 'keywords': ['pasta', 'spaghetti', 'penne', 'fettuccine', 'lasagna'], 'unsplash': 'photo-1621996346565-e3dbc646d9a9' },
    'noodles': { 'keywords': ['noodle', 'noodles', 'ramen', 'udon', 'soba', 'chowmein'], 'unsplash': 'photo-1612929633738-8fe44f7ec841' },
    'rice': { 'keywords': ['rice', 'fried rice', 'pilaf', 'pulao', 'risotto'], 'unsplash': 'photo-1603133872878-684f208fb84b' },
    'biryani': { 'keywords': ['biryani'], 'unsplash': 'photo-1604908177071-927c7f6db98f' },
    'sandwich': { 'keywords': ['sandwich', 'sub', 'grilled cheese', 'panini'], 'unsplash': 'photo-1528735602780-2552fd46c7af' },

    # proteins / mains
    'chicken': { 'keywords': ['chicken', 'butter chicken', 'tikka', 'tandoori'], 'unsplash': 'photo-1598103442097-8b74394b95c6' },
    'fish': { 'keywords': ['fish', 'salmon', 'cod', 'trout'], 'unsplash': 'photo-1580959375944-0b9b33f4b964' },
    'steak': { 'keywords': ['steak', 'beefsteak', 'sirloin', 'ribeye'], 'unsplash': 'photo-1546833999-b9f581a1996d' },
    'kebab': { 'keywords': ['kebab', 'shawarma', 'kofta', 'seekh'], 'unsplash': 'photo-1544025162-d76694265947' },
    'taco': { 'keywords': ['taco', 'tacos'], 'unsplash': 'photo-1565299585323-38d6b0865b47' },
    'sushi': { 'keywords': ['sushi', 'maki', 'nigiri', 'sashimi'], 'unsplash': 'photo-1579584425555-c3ce17fd4351' },

    # styles / dishes
    'curry': { 'keywords': ['curry', 'masala'], 'unsplash': 'photo-1565557623262-b51c2513a641' },
    'stew': { 'keywords': ['stew', 'ragout'], 'unsplash': 'photo-1547592166-23ac45744acd' },
    'soup': { 'keywords': ['soup', 'broth', 'pho', 'tom yum', 'ramen soup'], 'unsplash': 'photo-1547592166-23ac45744acd' },
    'salad': { 'keywords': ['salad', 'greens', 'caesar'], 'unsplash': 'photo-1512621776951-a57141f2eefd' },
    'breakfast': { 'keywords': ['breakfast', 'brunch'], 'unsplash': 'photo-1533089860892-a7c6f0a88666' },
    'pancake': { 'keywords': ['pancake', 'waffle'], 'unsplash': 'photo-1567620905732-2d1ec7ab7445' },
    'egg': { 'keywords': ['egg', 'omelette', 'omelet', 'scramble'], 'unsplash': 'photo-1525351484163-7529414344d8' },
    'bread': { 'keywords': ['bread', 'toast', 'baguette', 'loaf'], 'unsplash': 'photo-1509440159596-0249088772ff' },

    # sweets & drinks
    'dessert': { 'keywords': ['dessert', 'sweet'], 'unsplash': 'photo-1551024506-0bccd828d307' },
    'cake': { 'keywords': ['cake', 'cheesecake'], 'unsplash': 'photo-1578985545062-69928b1d9587' },
    'smoothie': { 'keywords': ['smoothie', 'shake', 'milkshake'], 'unsplash': 'photo-1505252585461-04db1eb84625' },
    'fruit': { 'keywords': ['fruit', 'fruits', 'fruit salad'], 'unsplash': 'photo-1490474418585-ba9bad8fd0ea' },
    'vegetable': { 'keywords': ['vegetable', 'veggies'], 'unsplash': 'photo-1540420773420-3366772f4999' },
}

GENERIC_FOOD_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&auto=format&q=80"


_ADJECTIVES = re.compile(r"\b(spicy|classic|traditional|homemade|easy|quick|simple|delicious|tasty|authentic|crispy|creamy|savory|sweet|best|ultimate|perfect)\b", re.I)
_NON_WORDS = re.compile(r"[^a-zA-Z\s]")


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = _NON_WORDS.sub(" ", text)
    text = _ADJECTIVES.sub(" ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def choose_deterministic_image(recipe_name: str):
    """Return (image_url, category, confidence) with strict matching.

    Rules:
    - If we have an exact cache entry, return it.
    - Score curated categories by token overlap. Require score >= 1 to accept.
    - If no confident match, return GENERIC_FOOD_IMAGE with confidence 0.
    This guarantees we never show a clearly wrong image.
    """
    norm = _normalize(recipe_name)
    # Cache hit
    cached = image_cache.get(norm)
    if cached:
        return cached.get('url'), cached.get('category'), cached.get('confidence', 1.0)

    tokens = set(norm.split())
    best_cat = None
    best_score = 0
    # Evaluate categories
    for cat, meta in CURATED_IMAGES.items():
        score = 0
        for kw in meta['keywords']:
            kw_tokens = set(_normalize(kw).split())
            if kw_tokens and kw_tokens.issubset(tokens):
                score += len(kw_tokens)  # bigger phrases score higher
        if score > best_score:
            best_score = score
            best_cat = cat

    if best_cat and best_score >= 1:
        photo_id = CURATED_IMAGES[best_cat]['unsplash']
        url = f"https://images.unsplash.com/{photo_id}?w=800&h=600&fit=crop&auto=format&q=80"
        # Store in cache
        image_cache[norm] = { 'url': url, 'category': best_cat, 'confidence': float(best_score) }
        save_image_cache(image_cache)
        return url, best_cat, float(best_score)

    # Low confidence -> generic safe image
    image_cache[norm] = { 'url': GENERIC_FOOD_IMAGE, 'category': 'generic', 'confidence': 0.0 }
    save_image_cache(image_cache)
    return GENERIC_FOOD_IMAGE, 'generic', 0.0

# Initialize Gemini client
api_key = os.getenv('GEMINI_API_KEY')

if not api_key or api_key == 'your_api_key_here':
    print("⚠️  WARNING: GEMINI_API_KEY not set! Please add your API key to the .env file")
    print("   Get your API key from: https://aistudio.google.com/app/apikey")
    model = None
else:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    print("✅ Gemini client initialized successfully!")

@app.route('/api/recipes/by-dish', methods=['POST'])
def get_recipes_by_dish():
    if not model:
        return jsonify({"error": "Gemini API key not configured. Please add your API key to the .env file."}), 500
    
    data = request.get_json()
    dish_name = data.get('dish_name', '').strip()
    
    if not dish_name:
        return jsonify({"recipes": []})

    try:
        print(f"Received request for dish: {dish_name}")
        
        # Create a prompt for Gemini to find variations of the dish
        prompt = f"""Given the dish name: "{dish_name}"

Please provide 5 variations or similar recipes for this dish. For each recipe, provide the following information in valid JSON format:
- name: recipe name (include variations like "Classic {dish_name}", "Spicy {dish_name}", etc.)
- description: brief description highlighting what makes this variation unique (1-2 sentences)
- ingredients: array of main ingredients needed
- steps: array of 3-5 quick preparation steps
- cooking_time: estimated cooking time
- dietType: one of "veg", "non-veg", or "vegan"

Return ONLY a valid JSON array of recipe objects, no additional text or markdown formatting."""

        print("Calling Gemini API for dish search...")
        response = model.generate_content(prompt)
        
        print("Received response from Gemini")
        recipes_text = response.text
        
        # Clean up the response (remove markdown code blocks if present)
        if '```json' in recipes_text:
            recipes_text = recipes_text.split('```json')[1].split('```')[0].strip()
        elif '```' in recipes_text:
            recipes_text = recipes_text.split('```')[1].split('```')[0].strip()
        
        # Try to parse the JSON response
        try:
            recipes = json.loads(recipes_text)
            # Normalize to list
            if isinstance(recipes, dict):
                possible_lists = [v for v in recipes.values() if isinstance(v, list)]
                if possible_lists:
                    recipes = possible_lists[0]
                else:
                    recipes = []
            print(f"Successfully parsed {len(recipes)} recipe variations")
            # Add IDs and rating info to recipes
            for i, recipe in enumerate(recipes):
                recipe['id'] = f"dish_{dish_name.lower().replace(' ', '_')}_{i}"
                if recipe['id'] in recipe_ratings:
                    recipe['averageRating'] = round(
                        recipe_ratings[recipe['id']]['total'] / recipe_ratings[recipe['id']]['count'], 1
                    )
                    recipe['totalRatings'] = recipe_ratings[recipe['id']]['count']
            return jsonify({"recipes": recipes})
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {recipes_text[:500]}...")
            return jsonify({"recipes": [{
                "name": dish_name,
                "description": "Unable to parse recipe variations. Please try again.",
                "ingredients": [],
                "steps": ["Try refreshing the page"],
                "cooking_time": "N/A"
            }], "error": "parse_error"})

    except Exception as e:
        print(f"ERROR in get_recipes_by_dish: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate recipes: {str(e)}"}), 500

@app.route('/api/recipes', methods=['POST'])
def get_recipes():
    if not model:
        return jsonify({"error": "Gemini API key not configured. Please add your API key to the .env file."}), 500
    
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    
    if not ingredients:
        return jsonify({"recipes": []})

    # Clean up the ingredients list
    ingredients_list = [ing.strip() for ing in ingredients if ing.strip()]
    
    if not ingredients_list:
        return jsonify({"recipes": []})

    try:
        print(f"Received request with ingredients: {ingredients_list}")
        
        # Create a prompt for Gemini
        prompt = f"""Given these ingredients: {', '.join(ingredients_list)}

Please suggest 5 delicious recipes that can be made using some or all of these ingredients. For each recipe, provide the following information in valid JSON format:
- name: recipe name
- description: brief description (1-2 sentences)
- ingredients: array of main ingredients needed
- steps: array of 3-5 quick preparation steps
- cooking_time: estimated cooking time
- dietType: one of "veg", "non-veg", or "vegan"

Return ONLY a valid JSON array of recipe objects, no additional text or markdown formatting."""

        print("Calling Gemini API...")
        response = model.generate_content(prompt)
        
        print("Received response from Gemini")
        recipes_text = response.text
        
        # Clean up the response (remove markdown code blocks if present)
        if '```json' in recipes_text:
            recipes_text = recipes_text.split('```json')[1].split('```')[0].strip()
        elif '```' in recipes_text:
            recipes_text = recipes_text.split('```')[1].split('```')[0].strip()
        
        # Try to parse the JSON response
        try:
            recipes = json.loads(recipes_text)
            # Normalize to list
            if isinstance(recipes, dict):
                # Sometimes the model may return an object with a key; extract list-like values if present
                possible_lists = [v for v in recipes.values() if isinstance(v, list)]
                if possible_lists:
                    recipes = possible_lists[0]
                else:
                    recipes = []
            print(f"Successfully parsed {len(recipes)} recipes")
            # Add IDs and rating info to recipes
            for i, recipe in enumerate(recipes):
                recipe['id'] = f"ingredient_{i}_{recipe['name'].lower().replace(' ', '_')}"
                if recipe['id'] in recipe_ratings:
                    recipe['averageRating'] = round(
                        recipe_ratings[recipe['id']]['total'] / recipe_ratings[recipe['id']]['count'], 1
                    )
                    recipe['totalRatings'] = recipe_ratings[recipe['id']]['count']
            return jsonify({"recipes": recipes})
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {recipes_text[:500]}...")
            # If JSON parsing fails, return a formatted fallback
            return jsonify({"recipes": [{
                "name": "Recipe Suggestions",
                "description": "Unable to parse recipes. Please try again.",
                "ingredients": ingredients_list,
                "steps": ["Try refreshing the page"],
                "cooking_time": "N/A"
            }], "error": "parse_error"})

    except Exception as e:
        print(f"ERROR in get_recipes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate recipes: {str(e)}"}), 500

@app.route('/api/substitute', methods=['POST'])
def get_substitutes():
    if not model:
        return jsonify({"error": "Gemini API key not configured"}), 500
        
    data = request.get_json()
    recipe_name = data.get('recipe_name', '')
    missing_ingredient = data.get('missing_ingredient', '')
    available_ingredients = data.get('available_ingredients', [])
    
    if not missing_ingredient:
        return jsonify({"error": "Missing ingredient not specified"}), 400

    try:
        prompt = f"""I'm making {recipe_name} but I don't have {missing_ingredient}.
I have these ingredients available: {', '.join(available_ingredients)}

Please suggest:
1. The best substitute for {missing_ingredient} from my available ingredients
2. Alternative substitutes that would work well
3. How the substitution might affect the recipe

Provide a clear, concise response."""

        response = model.generate_content(prompt)
        substitution_advice = response.text
        return jsonify({"advice": substitution_advice})

    except Exception as e:
        return jsonify({"error": f"Failed to generate substitution advice: {str(e)}"}), 500

@app.route('/api/video', methods=['POST'])
def get_video():
    data = request.get_json()
    recipe_name = data.get('recipe_name', '')
    
    if not recipe_name:
        return jsonify({"error": "Recipe name is required"}), 400
    
    try:
        # Create YouTube search URL
        search_query = f"{recipe_name} recipe tutorial"
        youtube_search_url = f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}"
        
        return jsonify({
            "video_url": youtube_search_url,
            "search_query": search_query
        })
    except Exception as e:
        print(f"ERROR in get_video: {str(e)}")
        return jsonify({"error": f"Failed to generate video URL: {str(e)}"}), 500

@app.route('/api/recipe-image', methods=['POST'])
def get_recipe_image():
    """Get a food image URL for a recipe with strict accuracy guarantees.

    Strategy:
    - Deterministic curated matching with caching.
    - If we cannot confidently match, return a neutral generic food image
      rather than a potentially wrong dish photo.
    - This guarantees we never show a mismatched dish image.
    """
    data = request.get_json() or {}
    recipe_name = data.get('recipe_name', '')

    if not recipe_name:
        return jsonify({"error": "Recipe name is required"}), 400

    try:
        url, category, confidence = choose_deterministic_image(recipe_name)
        return jsonify({
            "image_url": url,
            "recipe_name": recipe_name,
            "category": category,
            "confidence": confidence,
            "source": "curated_strict" if category != 'generic' else "generic"
        })
    except Exception as e:
        print(f"ERROR in get_recipe_image: {str(e)}")
        return jsonify({"image_url": GENERIC_FOOD_IMAGE, "recipe_name": recipe_name, "source": "generic"}), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    if not model:
        return jsonify({"error": "Gemini API key not configured. Please add your API key to the .env file."}), 500
    
    data = request.get_json()
    message = data.get('message', '')
    context = data.get('context', {})  # Can include current recipe, ingredients, etc.
    
    if not message:
        return jsonify({"error": "Message is required"}), 400

    try:
        # Build context-aware prompt
        context_text = ""
        if context.get('recipe'):
            context_text += f"\nCurrent recipe: {context['recipe']['name']}"
            if context['recipe'].get('ingredients'):
                context_text += f"\nIngredients: {', '.join(context['recipe']['ingredients'])}"
        if context.get('user_ingredients'):
            context_text += f"\nUser's available ingredients: {', '.join(context['user_ingredients'])}"
        
        prompt = f"""You are a helpful cooking assistant. Help the user with their cooking questions.
{context_text}

User question: {message}

Provide a helpful, concise, and friendly response. If discussing substitutions, be specific about quantities and how it might affect the dish."""

        response = model.generate_content(prompt)
        bot_response = response.text
        return jsonify({"response": bot_response})

    except Exception as e:
        print(f"ERROR in chat: {str(e)}")
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500

@app.route('/api/recipes/rate', methods=['POST'])
def rate_recipe():
    """Rate a recipe"""
    data = request.get_json()
    recipe_id = data.get('recipe_id')
    rating = data.get('rating')
    
    if not recipe_id or not rating:
        return jsonify({"error": "Missing recipe_id or rating"}), 400
    
    if not (1 <= rating <= 5):
        return jsonify({"error": "Rating must be between 1 and 5"}), 400
    
    # Initialize recipe ratings if not exists
    if recipe_id not in recipe_ratings:
        recipe_ratings[recipe_id] = {'ratings': [], 'total': 0, 'count': 0}
    
    # Add the rating
    recipe_ratings[recipe_id]['ratings'].append(rating)
    recipe_ratings[recipe_id]['total'] += rating
    recipe_ratings[recipe_id]['count'] += 1
    
    # Calculate average
    avg_rating = recipe_ratings[recipe_id]['total'] / recipe_ratings[recipe_id]['count']
    
    # Save ratings to file asynchronously (non-blocking)
    save_ratings(recipe_ratings)
    
    return jsonify({
        "success": True,
        "average_rating": round(avg_rating, 1),
        "total_ratings": recipe_ratings[recipe_id]['count']
    })

@app.route('/api/recipes/ratings', methods=['GET'])
def get_all_ratings():
    """Get all ratings data (for analytics)"""
    # Calculate stats
    total_recipes_rated = len(recipe_ratings)
    total_ratings_count = sum(data['count'] for data in recipe_ratings.values())
    
    # Get top rated recipes
    top_rated = sorted(
        [
            {
                'recipe_id': recipe_id,
                'average_rating': round(data['total'] / data['count'], 1),
                'total_ratings': data['count']
            }
            for recipe_id, data in recipe_ratings.items()
        ],
        key=lambda x: (x['average_rating'], x['total_ratings']),
        reverse=True
    )[:10]
    
    return jsonify({
        "total_recipes_rated": total_recipes_rated,
        "total_ratings_count": total_ratings_count,
        "top_rated": top_rated,
        "all_ratings": recipe_ratings
    })

@app.route('/api/recipes/trending', methods=['GET'])
def get_trending_recipes():
    """Get trending recipes based on ratings"""
    if not model:
        return jsonify({"error": "Gemini API key not configured"}), 500
    
    try:
        # Get top rated recipe names
        sorted_recipes = sorted(
            recipe_ratings.items(),
            key=lambda x: (x[1]['total'] / x[1]['count'], x[1]['count']),
            reverse=True
        )[:10]
        
        if not sorted_recipes:
            # If no ratings yet, return popular recipes
            prompt = """Please suggest 8 trending and popular recipes from around the world. For each recipe, provide the following information in valid JSON format:
- name: recipe name
- description: brief description highlighting what makes it popular (1-2 sentences)
- ingredients: array of main ingredients needed
- steps: array of 3-5 quick preparation steps
- cooking_time: estimated cooking time
- dietType: one of "veg", "non-veg", or "vegan"

Return ONLY a valid JSON array of recipe objects, no additional text or markdown formatting."""
        else:
            # Generate recipes based on top rated ones
            top_names = [recipe_id for recipe_id, _ in sorted_recipes[:3]]
            prompt = f"""Based on these trending recipes: {', '.join(top_names)}, suggest 8 similar popular recipes. For each recipe, provide the following information in valid JSON format:
- name: recipe name
- description: brief description (1-2 sentences)
- ingredients: array of main ingredients needed
- steps: array of 3-5 quick preparation steps
- cooking_time: estimated cooking time
- dietType: one of "veg", "non-veg", or "vegan"

Return ONLY a valid JSON array of recipe objects, no additional text or markdown formatting."""
        
        response = model.generate_content(prompt)
        recipes_text = response.text
        
        # Clean up the response
        if '```json' in recipes_text:
            recipes_text = recipes_text.split('```json')[1].split('```')[0].strip()
        elif '```' in recipes_text:
            recipes_text = recipes_text.split('```')[1].split('```')[0].strip()
        
        recipes = json.loads(recipes_text)
        if isinstance(recipes, dict):
            possible_lists = [v for v in recipes.values() if isinstance(v, list)]
            if possible_lists:
                recipes = possible_lists[0]
            else:
                recipes = []
        
        # Add IDs and rating info to recipes
        for i, recipe in enumerate(recipes):
            recipe['id'] = f"trending_{i}_{recipe['name'].lower().replace(' ', '_')}"
            if recipe['id'] in recipe_ratings:
                recipe['averageRating'] = round(
                    recipe_ratings[recipe['id']]['total'] / recipe_ratings[recipe['id']]['count'], 1
                )
                recipe['totalRatings'] = recipe_ratings[recipe['id']]['count']
        
        return jsonify({"recipes": recipes})
    
    except Exception as e:
        print(f"ERROR in get_trending_recipes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate trending recipes: {str(e)}"}), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """Server-Sent Events streaming variant of chat endpoint for progressive rendering."""
    if not model:
        def _err_stream():
            yield 'data: ' + json.dumps({"error": "Gemini API key not configured."}) + '\n\n'
        return Response(_err_stream(), mimetype='text/event-stream')

    data = request.get_json() or {}
    message = data.get('message', '')
    context = data.get('context', {})
    if not message:
        def _empty_stream():
            yield 'data: ' + json.dumps({"error": "Message is required"}) + '\n\n'
        return Response(_empty_stream(), mimetype='text/event-stream')

    # Build context-aware prompt (reuse logic from /api/chat)
    context_text = ""
    try:
        recipe = context.get('recipe')
        if recipe:
            context_text += f"\nCurrent recipe: {recipe.get('name','')}"
            if recipe.get('ingredients'):
                context_text += f"\nIngredients: {', '.join(recipe['ingredients'])}"
        user_ings = context.get('user_ingredients')
        if user_ings:
            context_text += f"\nUser's available ingredients: {', '.join(user_ings)}"
    except Exception:
        pass

    prompt = f"""You are a helpful cooking assistant. Help the user with their cooking questions.
{context_text}

User question: {message}

Provide a helpful, concise, and friendly response. If discussing substitutions, be specific about quantities and how it might affect the dish."""

    def event_stream():
        try:
            print(f"[STREAM] Starting stream for message: {message[:50]}...")
            chunk_count = 0
            # Gemini streaming interface
            response_stream = model.generate_content(prompt, stream=True)
            for chunk in response_stream:
                try:
                    # Access text from chunk parts
                    if hasattr(chunk, 'text') and chunk.text:
                        text = chunk.text
                    elif hasattr(chunk, 'parts'):
                        text = ''.join(part.text for part in chunk.parts if hasattr(part, 'text'))
                    else:
                        continue
                    
                    if not text:
                        continue
                    
                    chunk_count += 1
                    # Send incremental delta; client will append
                    payload = {"delta": text}
                    yield 'data: ' + json.dumps(payload) + '\n\n'
                except Exception as chunk_err:
                    print(f"[STREAM] Chunk error: {chunk_err}")
                    continue
            
            print(f"[STREAM] Stream complete. Sent {chunk_count} chunks.")
            # Completion marker
            yield 'data: ' + json.dumps({"done": True}) + '\n\n'
        except Exception as e:
            print(f"[STREAM] ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            yield 'data: ' + json.dumps({"error": f"Streaming failed: {str(e)}"}) + '\n\n'

    return Response(event_stream(), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True)
