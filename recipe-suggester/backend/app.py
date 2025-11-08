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
