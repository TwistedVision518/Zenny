from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
CORS(app)

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
    """Get a food image URL for a recipe using real food images from Foodish API"""
    data = request.get_json()
    recipe_name = data.get('recipe_name', '')
    index = data.get('index', 0)
    
    if not recipe_name:
        return jsonify({"error": "Recipe name is required"}), 400
    
    try:
        import requests
        
        # Try to extract dish type from recipe name (e.g., "Chicken Curry" -> "curry")
        recipe_lower = recipe_name.lower()
        
        # Map common dish types to Foodish API categories
        foodish_categories = {
            'burger': 'burger',
            'pizza': 'pizza',
            'pasta': 'pasta',
            'rice': 'rice',
            'biryani': 'biryani',
            'dosa': 'dosa',
            'idly': 'idly',
            'samosa': 'samosa',
            'dessert': 'dessert',
        }
        
        # Try to find matching category
        category = None
        for key, value in foodish_categories.items():
            if key in recipe_lower:
                category = value
                break
        
        # Use Foodish API to get real food images
        if category:
            foodish_url = f"https://foodish-api.com/api/images/{category}"
        else:
            foodish_url = "https://foodish-api.com/api/"
        
        response = requests.get(foodish_url, timeout=3)
        if response.ok:
            data = response.json()
            image_url = data.get('image', '')
            if image_url:
                return jsonify({
                    "image_url": image_url,
                    "recipe_name": recipe_name
                })
        
        # Fallback: Use a curated list of real food images
        fallback_images = [
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",  # Salad
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836",  # Food spread
            "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445",  # Pancakes
            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",  # Pizza
            "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",  # Healthy food
            "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",  # Soup
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1",  # Burger
            "https://images.unsplash.com/photo-1563379926898-05f4575a45d8",  # Pasta
            "https://images.unsplash.com/photo-1516684732162-798a0062be99",  # Asian food
            "https://images.unsplash.com/photo-1571091718767-18b5b1457add",  # Dessert
        ]
        
        # Use index to pick a consistent image per recipe
        import hashlib
        seed = int(hashlib.md5(recipe_name.encode()).hexdigest()[:8], 16)
        selected_image = fallback_images[seed % len(fallback_images)]
        
        # Add Unsplash parameters for proper sizing
        image_url = f"{selected_image}?w=800&h=600&fit=crop"
        
        return jsonify({
            "image_url": image_url,
            "recipe_name": recipe_name
        })
        
    except Exception as e:
        print(f"ERROR in get_recipe_image: {str(e)}")
        # Ultimate fallback with curated food image
        fallback_url = f"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop"
        return jsonify({"image_url": fallback_url}), 200

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

if __name__ == '__main__':
    app.run(debug=True)

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
            # Gemini streaming interface
            for chunk in model.generate_content(prompt, stream=True):
                text = getattr(chunk, 'text', '')
                if not text:
                    continue
                # Send incremental delta; client will append
                payload = {"delta": text}
                yield 'data: ' + json.dumps(payload) + '\n\n'
            # Completion marker
            yield 'data: ' + json.dumps({"done": True}) + '\n\n'
        except Exception as e:
            yield 'data: ' + json.dumps({"error": f"Streaming failed: {str(e)}"}) + '\n\n'

    return Response(event_stream(), mimetype='text/event-stream')
