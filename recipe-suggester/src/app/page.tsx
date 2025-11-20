"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Recipe {
  name: string;
  description: string;
  ingredients?: string[];
  steps?: string[];
  cooking_time?: string;
  imageUrl?: string;
  dietType?: "veg" | "non-veg" | "vegan" | "egg";
  id?: string;
  averageRating?: number;
  totalRatings?: number;
  servings?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  cuisine?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  recipeIds: string[];
  createdAt: string;
}

interface MealPlan {
  [date: string]: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO timestamp for message
}

export default function Home() {
  const cookingTaglines = [
    "Tell us what ingredients you have, and we'll create delicious recipes just for you! ✨",
    "Turn your pantry into a culinary adventure! 🍳",
    "Your ingredients, our creativity - let's cook something amazing! 👨‍🍳",
    "Fresh ideas from whatever's in your fridge! 🥗",
    "Got ingredients? We've got recipes! Let's get cooking! 🔥",
    "From your kitchen to your table - made simple! 🍽️",
    "Discover delicious dishes hiding in your pantry! 🎯",
    "Every ingredient tells a story - let's write yours! 📖",
    "Cooking magic starts with what you already have! ✨",
    "Transform everyday ingredients into extraordinary meals! 🌟",
    "Your kitchen, your rules - we'll show you the way! 👑",
    "Great meals begin with simple ingredients! 🥘",
  ];

  const [ingredients, setIngredients] = useState("");
  const [searchMode, setSearchMode] = useState<"ingredients" | "dish">("ingredients");
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non-veg" | "egg">("all");
  const [showTrending, setShowTrending] = useState(false);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  
  // Advanced filters
  const [timeFilter, setTimeFilter] = useState<number>(120); // max minutes
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "Easy" | "Medium" | "Hard">("all");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  
  // Favorites & Collections
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCollections, setShowCollections] = useState(false);
  
  // Meal Planning
  const [mealPlan, setMealPlan] = useState<MealPlan>({});
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  
  // Recipe scaling
  const [scaledServings, setScaledServings] = useState<Record<string, number>>({});
  
  const [tagline, setTagline] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [chatContextRecipe, setChatContextRecipe] = useState<Recipe | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  // Use env-based API base so we can deploy frontend separately (e.g., Netlify) and point to remote Flask backend.
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

  // Pantry, Budget and Goals (MVP for ideas #2, #3, #4)
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [pantryInput, setPantryInput] = useState("");
  const [showPantryManager, setShowPantryManager] = useState(false);
  const [prioritizePantry, setPrioritizePantry] = useState(true);

  const [budgetFilter, setBudgetFilter] = useState<"any" | 2 | 5 | 8 | 12>("any");
  const [budgetMode, setBudgetMode] = useState(false); // prefer cheaper swaps in shopping list

  const [goals, setGoals] = useState<{ calories?: number; protein?: number; carbs?: number; fats?: number }>({ calories: 2000 });

  // Track applied ingredient swaps per recipe (recipeId -> {index -> newText})
  const [appliedSwaps, setAppliedSwaps] = useState<Record<string, Record<number, string>>>({});

  // Region-aware pricing and UI niceties
  const [region, setRegion] = useState<'US'|'EU'|'IN'>('US');
  const currencySymbol = (r: 'US'|'EU'|'IN') => r === 'EU' ? '€' : r === 'IN' ? '₹' : '$';
  const regionFactor = (r: 'US'|'EU'|'IN') => r === 'EU' ? 1.1 : r === 'IN' ? 0.4 : 1;
  
  // Convert USD budget values to region-appropriate display amounts
  // Uses exchange rates for display, while regionFactor affects actual cost calculation
  const convertBudgetDisplay = (usdAmount: number, r: 'US'|'EU'|'IN'): string => {
    if (r === 'EU') return (usdAmount * 0.92).toFixed(1); // USD to EUR (~0.92)
    if (r === 'IN') return Math.round(usdAmount * 83).toString(); // USD to INR (~83)
    return usdAmount.toFixed(2); // US stays in USD
  };
  const [showWhatsNew, setShowWhatsNew] = useState(true);
  const [showSwapCompare, setShowSwapCompare] = useState(false);

  // Load favorites and collections from localStorage on mount
  useEffect(() => {
    // Set tagline only on client side to avoid hydration mismatch
    setTagline(cookingTaglines[Math.floor(Math.random() * cookingTaglines.length)]);
    
    const savedFavorites = localStorage.getItem('zenny_favorites');
    const savedCollections = localStorage.getItem('zenny_collections');
    const savedMealPlan = localStorage.getItem('zenny_meal_plan');
    const savedPantry = localStorage.getItem('zenny_pantry');
    const savedPrioritize = localStorage.getItem('zenny_prioritize_pantry');
    const savedBudget = localStorage.getItem('zenny_budget_filter');
    const savedBudgetMode = localStorage.getItem('zenny_budget_mode');
    const savedGoals = localStorage.getItem('zenny_goals');
  const savedRegion = localStorage.getItem('zenny_region');
  const savedShowNew = localStorage.getItem('zenny_show_new');
    
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    if (savedCollections) {
      setCollections(JSON.parse(savedCollections));
    }
    if (savedMealPlan) {
      setMealPlan(JSON.parse(savedMealPlan));
    }
    if (savedPantry) setPantryItems(JSON.parse(savedPantry));
    if (savedPrioritize) setPrioritizePantry(savedPrioritize === 'true');
    if (savedBudget) setBudgetFilter(JSON.parse(savedBudget));
    if (savedBudgetMode) setBudgetMode(savedBudgetMode === 'true');
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedRegion) setRegion(savedRegion as any);
    if (savedShowNew) setShowWhatsNew(savedShowNew === 'true');
  }, []);

  // Save to localStorage when favorites, collections, or meal plan changes
  useEffect(() => {
    localStorage.setItem('zenny_favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('zenny_collections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('zenny_meal_plan', JSON.stringify(mealPlan));
  }, [mealPlan]);

  // Persist pantry/budget/goals
  useEffect(() => {
    localStorage.setItem('zenny_pantry', JSON.stringify(pantryItems));
  }, [pantryItems]);

  useEffect(() => {
    localStorage.setItem('zenny_prioritize_pantry', prioritizePantry ? 'true' : 'false');
  }, [prioritizePantry]);

  useEffect(() => {
    localStorage.setItem('zenny_budget_filter', JSON.stringify(budgetFilter));
    localStorage.setItem('zenny_budget_mode', budgetMode ? 'true' : 'false');
  }, [budgetFilter, budgetMode]);

  useEffect(() => {
    localStorage.setItem('zenny_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('zenny_region', region);
  }, [region]);

  useEffect(() => {
    localStorage.setItem('zenny_show_new', showWhatsNew ? 'true' : 'false');
  }, [showWhatsNew]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Favorites management
  const toggleFavorite = (recipeId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(recipeId)) {
        newFavorites.delete(recipeId);
      } else {
        newFavorites.add(recipeId);
      }
      return newFavorites;
    });
  };

  // Collections management
  const createCollection = (name: string, description: string) => {
    const newCollection: Collection = {
      id: `col_${Date.now()}`,
      name,
      description,
      recipeIds: [],
      createdAt: new Date().toISOString(),
    };
    setCollections(prev => [...prev, newCollection]);
    return newCollection.id;
  };

  const addToCollection = (collectionId: string, recipeId: string) => {
    setCollections(prev =>
      prev.map(col =>
        col.id === collectionId
          ? { ...col, recipeIds: [...col.recipeIds, recipeId] }
          : col
      )
    );
  };

  const removeFromCollection = (collectionId: string, recipeId: string) => {
    setCollections(prev =>
      prev.map(col =>
        col.id === collectionId
          ? { ...col, recipeIds: col.recipeIds.filter(id => id !== recipeId) }
          : col
      )
    );
  };

  // Recipe scaling
  const scaleRecipe = (recipe: Recipe, newServings: number): Recipe => {
    if (!recipe.servings || !recipe.ingredients) return recipe;
    
    const scale = newServings / recipe.servings;
    const scaledIngredients = recipe.ingredients.map(ing => {
      // Try to extract and scale numbers in ingredients
      return ing.replace(/(\d+(?:\.\d+)?)/g, (match) => {
        const num = parseFloat(match);
        const scaled = (num * scale).toFixed(2).replace(/\.00$/, '');
        return scaled;
      });
    });

    return {
      ...recipe,
      servings: newServings,
      ingredients: scaledIngredients,
      calories: recipe.calories ? Math.round(recipe.calories * scale) : undefined,
      protein: recipe.protein ? Math.round(recipe.protein * scale) : undefined,
      carbs: recipe.carbs ? Math.round(recipe.carbs * scale) : undefined,
      fats: recipe.fats ? Math.round(recipe.fats * scale) : undefined,
    };
  };

  // Meal planning
  const addToMealPlan = (date: string, mealType: 'breakfast' | 'lunch' | 'dinner', recipe: Recipe) => {
    setMealPlan(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [mealType]: recipe,
      },
    }));
  };

  const removeFromMealPlan = (date: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    setMealPlan(prev => {
      const newPlan = { ...prev };
      if (newPlan[date]) {
        delete newPlan[date][mealType];
        if (Object.keys(newPlan[date]).length === 0) {
          delete newPlan[date];
        }
      }
      return newPlan;
    });
  };

  // Generate shopping list from meal plan
  const generateShoppingList = (): string[] => {
    const all: string[] = [];
    const shouldCheapen = budgetMode;

    Object.values(mealPlan).forEach(day => {
      [day.breakfast, day.lunch, day.dinner].forEach(recipe => {
        if (!recipe?.ingredients) return;
        const list = recipe.ingredients.map((ing, idx) => {
          // Apply any user swaps
          const swapped = recipe.id && appliedSwaps[recipe.id] && appliedSwaps[recipe.id][idx]
            ? appliedSwaps[recipe.id][idx]
            : ing;
          // If budget mode, apply cheapest suggestion if available
          const cheapest = shouldCheapen ? cheapestSubstitution(swapped) : null;
          return cheapest?.to || swapped;
        });
        all.push(...list);
      });
    });
    // Exclude pantry items (keyword contains)
    const filtered = all.filter(item => {
      const lower = item.toLowerCase();
      return !pantryItems.some(p => lower.includes(p.toLowerCase()));
    });
    // Deduplicate roughly
    return Array.from(new Set(filtered));
  };

  // --- Cost estimation & substitutions helpers ---
  const BASE_PRICE_MAP: { key: string; price: number }[] = [
    { key: 'chicken', price: 4.0 },
    { key: 'beef', price: 5.5 },
    { key: 'pork', price: 4.5 },
    { key: 'fish', price: 5.0 },
    { key: 'egg', price: 0.5 },
    { key: 'rice', price: 0.5 },
    { key: 'pasta', price: 0.8 },
    { key: 'tomato', price: 0.6 },
    { key: 'onion', price: 0.3 },
    { key: 'garlic', price: 0.2 },
    { key: 'milk', price: 0.4 },
    { key: 'cream', price: 1.2 },
    { key: 'cheese', price: 1.5 },
    { key: 'yogurt', price: 0.9 },
    { key: 'butter', price: 1.0 },
    { key: 'olive oil', price: 0.8 },
    { key: 'flour', price: 0.4 },
    { key: 'sugar', price: 0.3 },
    { key: 'potato', price: 0.5 },
    { key: 'bell pepper', price: 0.7 },
  ];

  const estimateCost = (recipe: Recipe) => {
    const base = recipe.ingredients || [];
    let total = 0;
    const PRICE_MAP = BASE_PRICE_MAP.map(p => ({ key: p.key, price: Number((p.price * regionFactor(region)).toFixed(2)) }));
    base.forEach((ing) => {
      const lower = ing.toLowerCase();
      const hit = PRICE_MAP.find(p => lower.includes(p.key));
      total += hit ? hit.price : 0.75; // default fallback
    });
    const servings = recipe.servings || 2;
    return { total: Number(total.toFixed(2)), perServing: Number((total / servings).toFixed(2)) };
  };

  type SubSuggestion = { to: string; reason: string; cheaper?: boolean };
  const SUB_RULES: { match: string; suggestions: SubSuggestion[] }[] = [
    { match: 'basil', suggestions: [{ to: 'parsley', reason: 'similar herb profile', cheaper: true }] },
    { match: 'heavy cream', suggestions: [{ to: 'milk + butter', reason: 'common home substitute', cheaper: true }] },
    { match: 'greek yogurt', suggestions: [{ to: 'plain yogurt', reason: 'near equivalent', cheaper: true }] },
    { match: 'chicken breast', suggestions: [{ to: 'chicken thigh', reason: 'juicier & often cheaper', cheaper: true }] },
    { match: 'brown sugar', suggestions: [{ to: 'white sugar + molasses', reason: 'classic swap', cheaper: true }] },
    { match: 'olive oil', suggestions: [{ to: 'vegetable oil', reason: 'budget friendly', cheaper: true }] },
    { match: 'beef', suggestions: [{ to: 'ground turkey', reason: 'leaner & cheaper', cheaper: true }] },
  ];

  const substitutionsFor = (ingredient: string): SubSuggestion[] => {
    const lower = ingredient.toLowerCase();
    for (const rule of SUB_RULES) {
      if (lower.includes(rule.match)) return rule.suggestions;
    }
    return [];
  };

  const cheapestSubstitution = (ingredient: string): SubSuggestion | null => {
    const list = substitutionsFor(ingredient).filter(s => s.cheaper);
    return list.length ? list[0] : null;
  };

  const pantryMatchScore = (recipe: Recipe): number => {
    if (!recipe.ingredients || pantryItems.length === 0) return 0;
    const ingr = recipe.ingredients.map(i => i.toLowerCase());
    let hits = 0;
    pantryItems.forEach(p => {
      const token = p.toLowerCase();
      if (ingr.some(i => i.includes(token))) hits += 1;
    });
    return hits;
  };

  const autoPlanToGoals = async () => {
    if (recipes.length === 0) {
      alert('Generate some recipes first, then try auto-plan.');
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    // Use setTimeout to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));
    
    try {
      const dailyCalories = goals.calories || 1800;
      const perMeal = dailyCalories / 3;
      const used: Record<string, number> = {};
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });

      const pick = () => {
        // Score recipes by closeness to target kcal and pantry usage; penalize repeats
        const scored = recipes.map(r => {
          const kcal = r.calories || perMeal;
          const macrosPenalty =
            (goals.protein ? Math.abs((r.protein || goals.protein) - goals.protein) : 0) +
            (goals.carbs ? Math.abs((r.carbs || goals.carbs) - goals.carbs) * 0.5 : 0) +
            (goals.fats ? Math.abs((r.fats || goals.fats) - goals.fats) * 0.7 : 0);
          const cost = estimateCost(r).perServing;
          const repeatPenalty = (used[r.id || r.name] || 0) * 200; // discourage repeats
          const pantryBonus = prioritizePantry ? -10 * pantryMatchScore(r) : 0; // better score if more pantry
          return { r, score: Math.abs(kcal - perMeal) + macrosPenalty + repeatPenalty + pantryBonus + (budgetMode ? cost : 0) };
        }).sort((a, b) => a.score - b.score);
        const chosen = scored[0]?.r || recipes[0];
        const key = chosen.id || chosen.name;
        used[key] = (used[key] || 0) + 1;
        return chosen;
      };

      const newPlan: MealPlan = {};
      
      // Process in smaller chunks to prevent UI freeze
      for (let i = 0; i < days.length; i++) {
        const dateStr = days[i];
        newPlan[dateStr] = {
          breakfast: pick(),
          lunch: pick(),
          dinner: pick(),
        };
        
        // Allow UI to breathe every 2 days
        if (i % 2 === 1) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      setMealPlan(newPlan);
      alert('✅ Meal plan filled for the week based on your goals!');
    } catch (error) {
      console.error('Error auto-planning:', error);
      alert('❌ Failed to auto-plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Optimize image fetching with useCallback
  const fetchFoodImage = useCallback(async (recipeName: string, index: number): Promise<string> => {
    try {
      const response = await fetch(`${API_BASE}/api/recipe-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_name: recipeName, index })
      });
      if (response.ok) {
        const data = await response.json();
        return data.image_url;
      }
      // Direct fallback if backend fails
      return `https://picsum.photos/seed/recipe-${index}/800/600`;
    } catch {
      // Ultimate fallback
      return `https://picsum.photos/seed/fallback-${index}/800/600`;
    }
  }, [API_BASE]);

  const clearIngredients = () => {
    setIngredients("");
    setError("");
    // Animate input wrapper subtly when cleared
    if (inputWrapRef.current) {
      inputWrapRef.current.classList.add("ring-flash", "pop-once");
      setTimeout(() => {
        inputWrapRef.current && inputWrapRef.current.classList.remove("ring-flash", "pop-once");
      }, 420);
    }
    if (inputRef.current) {
      inputRef.current.classList.add("pop-once");
      setTimeout(() => {
        inputRef.current && inputRef.current.classList.remove("pop-once");
      }, 220);
      inputRef.current.focus();
    }
  };

  const handleGetRecipes = async () => {
    if (!ingredients.trim()) {
      setError(searchMode === "ingredients" ? "Please enter some ingredients" : "Please enter a dish name");
      return;
    }
    setLoading(true);
    setError("");
    setRecipes([]);
    setShowCollections(false);
    setShowMealPlanner(false);
    try {
      const endpoint = searchMode === "ingredients" ? `${API_BASE}/api/recipes` : `${API_BASE}/api/recipes/by-dish`;
      const body = searchMode === "ingredients" 
        ? { ingredients: ingredients.split(",").map((i) => i.trim()) }
        : { dish_name: ingredients.trim() };
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      // Check for API errors
      if (data.error) {
        if (data.error.includes("rate limit") || data.error.includes("quota")) {
          setError("⏰ API rate limit reached. Please wait a minute and try again.");
        } else {
          setError(data.error);
        }
        setLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error("Failed to get recipes");
      const recipesData = data.recipes || [];
      
      // Show recipes immediately without waiting for images
      setRecipes(recipesData);
      setLoading(false);
      
      // Lazy load images - only load first 6, rest on demand
      const loadImagesInBatches = async () => {
        const batchSize = 6;
        for (let i = 0; i < recipesData.length; i += batchSize) {
          const batch = recipesData.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (recipe: Recipe, batchIndex: number) => {
              const index = i + batchIndex;
              setImageLoading((prev) => ({ ...prev, [index]: true }));
              const imageUrl = await fetchFoodImage(recipe.name, index);
              setRecipes((prevRecipes) => {
                const updated = [...prevRecipes];
                if (updated[index]) updated[index] = { ...updated[index], imageUrl };
                return updated;
              });
              setImageLoading((prev) => ({ ...prev, [index]: false }));
            })
          );
          // Small delay between batches to avoid overwhelming the system
          if (i + batchSize < recipesData.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      };
      loadImagesInBatches();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes("fetch")) {
        setError("❌ Can't connect to backend. Make sure it's running on port 5000.");
      } else {
        setError("⚠️ Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleRateRecipe = async (recipeId: string, rating: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/recipes/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId, rating }),
      });
      if (!response.ok) throw new Error("Failed to rate recipe");
      const data = await response.json();
      
      // Update local state with new rating
      setUserRatings((prev) => ({ ...prev, [recipeId]: rating }));
      
      // Update recipe in the list
      setRecipes((prevRecipes) =>
        prevRecipes.map((recipe) =>
          recipe.id === recipeId
            ? { ...recipe, averageRating: data.average_rating, totalRatings: data.total_ratings }
            : recipe
        )
      );
      
      // Update selected recipe if it's the one being rated
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe({
          ...selectedRecipe,
          averageRating: data.average_rating,
          totalRatings: data.total_ratings,
        });
      }
    } catch (e) {
      console.error("Failed to rate recipe:", e);
    }
  };

  const fetchTrendingRecipes = async () => {
    setLoading(true);
    setError("");
    setShowTrending(true);
    setShowCollections(false);
    setShowMealPlanner(false);
    try {
      const response = await fetch(`${API_BASE}/api/recipes/trending`);
      if (!response.ok) throw new Error("Failed to get trending recipes");
      const data = await response.json();
      const recipesData = data.recipes || [];
      
      // Show recipes immediately without waiting for images
      setRecipes(recipesData);
      setLoading(false);
      
      // Fetch images for each recipe in parallel (non-blocking)
      recipesData.forEach(async (recipe: Recipe, index: number) => {
        setImageLoading((prev) => ({ ...prev, [index]: true }));
        const imageUrl = await fetchFoodImage(recipe.name, index);
        setRecipes((prevRecipes) => {
          const updated = [...prevRecipes];
          if (updated[index]) updated[index] = { ...updated[index], imageUrl };
          return updated;
        });
        setImageLoading((prev) => ({ ...prev, [index]: false }));
      });
    } catch (e) {
      setError("Couldn't fetch trending recipes. Is the backend running?");
      setLoading(false);
    }
  };

  // Optimize recipe filtering with useMemo
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Diet filter
      if (dietFilter !== "all" && recipe.dietType !== dietFilter) return false;
      
      // Time filter (cooking time in minutes)
      if (timeFilter < 120) {
        const cookingTime = parseInt(recipe.cooking_time?.match(/\d+/)?.[0] || "999");
        if (cookingTime > timeFilter) return false;
      }
      
      // Difficulty filter
      if (difficultyFilter !== "all" && recipe.difficulty !== difficultyFilter) return false;
      
      // Cuisine filter
      if (cuisineFilter !== "all" && recipe.cuisine !== cuisineFilter) return false;
      // Budget filter (per serving)
      if (budgetFilter !== "any") {
        const cps = estimateCost(recipe).perServing;
        // Adjust budget threshold by region factor to match region-adjusted costs
        const adjustedBudget = (budgetFilter as number) * regionFactor(region);
        if (cps > adjustedBudget) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // If prioritizing pantry, sort by pantry match desc
      if (prioritizePantry) return pantryMatchScore(b) - pantryMatchScore(a);
      return 0;
    });
  }, [recipes, dietFilter, timeFilter, difficultyFilter, cuisineFilter, budgetFilter, prioritizePantry]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
  const userMessage: ChatMessage = { role: "user", content: chatInput, createdAt: new Date().toISOString() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    try {
  const context: any = {};
  if (selectedRecipe) context.recipe = selectedRecipe;
  else if (chatContextRecipe) context.recipe = chatContextRecipe;
      if (ingredients) context.user_ingredients = ingredients.split(",").map((i) => i.trim());
      // Attempt streaming first
      try {
        setStreaming(true);
        const streamResp = await fetch(`${API_BASE}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage.content, context })
        });
        if (!streamResp.ok || !streamResp.body) throw new Error('Streaming response not available');
        const reader = streamResp.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        
        // Add placeholder message first and track its index
        const placeholderMessage: ChatMessage = { role: 'assistant', content: '', createdAt: new Date().toISOString() };
        setChatMessages((prev) => [...prev, placeholderMessage]);
        
        // Track the message index for efficient updates
        let messageIndex = -1;
        setChatMessages((prev) => {
          messageIndex = prev.length - 1;
          return prev;
        });
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          const events = chunkText.split('\n\n').filter(Boolean);
          
          for (const ev of events) {
            if (!ev.startsWith('data:')) continue;
            const jsonStr = ev.replace(/^data:\s*/, '').trim();
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.delta) {
                assistantContent += payload.delta;
                // Update message at the last index efficiently
                setChatMessages((prev) => {
                  const copy = [...prev];
                  const lastIdx = copy.length - 1;
                  if (lastIdx >= 0 && copy[lastIdx].role === 'assistant') {
                    copy[lastIdx] = { ...copy[lastIdx], content: assistantContent };
                  }
                  return copy;
                });
              } else if (payload.done) {
                // Streaming complete
                break;
              } else if (payload.error) {
                throw new Error(payload.error);
              }
            } catch (parseErr) {
              console.warn('Parse error in stream:', parseErr);
            }
          }
        }
      } catch (streamErr) {
        // Fallback to non-stream
        setStreaming(false);
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage.content, context })
        });
        const data = await response.json();
        const assistantMessage: ChatMessage = { role: 'assistant', content: data.response, createdAt: new Date().toISOString() };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setStreaming(false);
      }
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Dynamic suggestion chips based on recipe complexity or available ingredients
  const generateSuggestionChips = () => {
    const base: string[] = [];
    const r = chatContextRecipe || selectedRecipe;
    if (r) {
      const ingCount = r.ingredients ? r.ingredients.length : 0;
      const stepCount = r.steps ? r.steps.length : 0;
      if (ingCount >= 8) base.push('Simplify this recipe');
      if (stepCount >= 5) base.push('Condense the instructions');
      base.push('Suggest plating ideas');
      base.push('Make it spicier');
      base.push('Make it less spicy');
      base.push('Offer healthy substitutions');
      base.push('Give a quick side dish idea');
      base.push('What can I prep ahead?');
    } else {
      base.push('Suggest a quick dinner');
      base.push('Healthy meal idea');
      base.push('High-protein suggestion');
      base.push('Budget-friendly meal');
    }
    if (!r && ingredients.trim()) {
      base.unshift('Use Current Ingredients');
    }
    return base;
  };

  return (
    <>
      {/* Animated Background */}
      <div className="animated-gradient-bg" />
      <div className="animated-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="flex flex-col min-h-screen bg-transparent relative z-10">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <Link
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    clearIngredients();
                  }}
                  className="flex items-center space-x-3 group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-purple-500/20 group-hover:ring-purple-500/60 transition-all group-active:scale-95">
                    <img 
                      src="/logodog.jpg?v=2" 
                      alt="Zenny Logo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
                    Zenny
                  </span>
                </Link>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-3">
                  <a
                    href="https://github.com/TwistedVision518"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-purple-400 transition-colors"
                  title="GitHub"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/pranavislost/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-400 transition-colors"
                  title="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
              <button
                onClick={() => {
                  // If opening chat while a recipe is selected, carry it into chat context
                  setChatOpen((prev) => {
                    const next = !prev;
                    if (next && selectedRecipe) setChatContextRecipe(selectedRecipe);
                    return next;
                  });
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white rounded-full hover:opacity-90 transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl font-medium"
              >
                <span>💬</span>
                <span className="hidden sm:inline">Chat Assistant</span>
                {chatMessages.length > 0 && (
                  <span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {chatMessages.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="inline-block mb-6 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full">
              <span className="text-gray-400 text-sm font-medium">✨ Powered by AI</span>
            </div>
            <h2 className="text-5xl font-extrabold text-white sm:text-6xl mb-4">
              What's in your{' '}
              <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                kitchen?
              </span>
            </h2>
            <p className="mt-4 text-xl text-gray-400 max-w-2xl mx-auto">
              {tagline}
            </p>
            
            {/* Quick Access Buttons - Always Visible */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setShowCollections(!showCollections)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 ${
                  showCollections
                    ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-800/60 border border-gray-700 text-gray-300 hover:text-white hover:border-purple-500'
                }`}
              >
                ⭐ Favorites {favorites.size > 0 && `(${favorites.size})`}
              </button>

              <button
                onClick={() => setShowMealPlanner(!showMealPlanner)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 ${
                  showMealPlanner
                    ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-800/60 border border-gray-700 text-gray-300 hover:text-white hover:border-purple-500'
                }`}
              >
                📅 Meal Planner
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800">
              {/* Search Mode Toggle */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={() => { setSearchMode("ingredients"); setError(""); setShowTrending(false); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    searchMode === "ingredients" && !showTrending
                      ? "bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  🥘 By Ingredients
                </button>
                <button
                  onClick={() => { setSearchMode("dish"); setError(""); setShowTrending(false); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    searchMode === "dish" && !showTrending
                      ? "bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  🍽️ By Dish Name
                </button>
                <button
                  onClick={fetchTrendingRecipes}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    showTrending
                      ? "bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  🔥 Trending
                </button>
              </div>

              {/* What's New Strip */}
              {showWhatsNew && (
                <div className="mb-4 p-3 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-yellow-400/10 text-[13px] text-gray-200 flex items-center gap-3 flex-wrap">
                  <strong className="mr-1">What’s new:</strong>
                  <button onClick={() => setShowPantryManager(true)} className="px-2 py-0.5 rounded-full bg-gray-900/60 border border-gray-700 hover:border-purple-500/60 transition">🥫 Pantry</button>
                  <button onClick={() => setShowMealPlanner(true)} className="px-2 py-0.5 rounded-full bg-gray-900/60 border border-gray-700 hover:border-purple-500/60 transition">🎯 Auto‑Plan</button>
                  <span>💰 Budget filter + $/serving</span>
                  <span>🔁 Ingredient swaps</span>
                  <button onClick={() => setShowWhatsNew(false)} className="ml-auto text-gray-400 hover:text-white">Dismiss ✕</button>
                </div>
              )}
              
              {/* Diet Filter - Always visible */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-gray-400 text-sm mr-2">Diet:</span>
                <button
                  onClick={() => setDietFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    dietFilter === "all"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDietFilter("veg")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    dietFilter === "veg"
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  🥬 Veg
                </button>
                <button
                  onClick={() => setDietFilter("egg")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    dietFilter === "egg"
                      ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-md scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  🥚 Egg
                </button>
                <button
                  onClick={() => setDietFilter("non-veg")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 hover:scale-105 ${
                    dietFilter === "non-veg"
                      ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md scale-105"
                      : "bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700"
                  }`}
                >
                  🍖 Non-Veg
                </button>
              </div>

              {/* Advanced Filters */}
              {!showTrending && recipes.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mt-3 pb-3 border-b border-gray-700">
                  {/* Time Filter */}
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">⏱️ Max Time:</span>
                    <div className="relative">
                      <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(Number(e.target.value))}
                        className="px-3 py-2 text-xs bg-gray-900/95 backdrop-blur-sm border-2 border-gray-700 hover:border-purple-500/60 rounded-xl text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 cursor-pointer appearance-none hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-purple-500/20"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A78BFA' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em',
                          paddingRight: '2.2rem'
                        }}
                      >
                        <option value={120} className="bg-gray-900 text-gray-200">Any</option>
                        <option value={15} className="bg-gray-900 text-gray-200">15 min</option>
                        <option value={30} className="bg-gray-900 text-gray-200">30 min</option>
                        <option value={45} className="bg-gray-900 text-gray-200">45 min</option>
                        <option value={60} className="bg-gray-900 text-gray-200">1 hour</option>
                        <option value={90} className="bg-gray-900 text-gray-200">1.5 hours</option>
                      </select>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-yellow-400/0 hover:from-purple-500/10 hover:via-pink-500/10 hover:to-yellow-400/10 pointer-events-none transition-all duration-300"></div>
                    </div>
                  </div>

                  {/* Difficulty Filter */}
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">📊 Difficulty:</span>
                    <div className="relative">
                      <select
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value as "Easy" | "Medium" | "Hard" | "all")}
                        className="px-3 py-2 text-xs bg-gray-900/95 backdrop-blur-sm border-2 border-gray-700 hover:border-purple-500/60 rounded-xl text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 cursor-pointer appearance-none hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-purple-500/20"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A78BFA' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em',
                          paddingRight: '2.2rem'
                        }}
                      >
                        <option value="all" className="bg-gray-900 text-gray-200">All</option>
                        <option value="Easy" className="bg-gray-900 text-gray-200">Easy</option>
                        <option value="Medium" className="bg-gray-900 text-gray-200">Medium</option>
                        <option value="Hard" className="bg-gray-900 text-gray-200">Hard</option>
                      </select>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-yellow-400/0 hover:from-purple-500/10 hover:via-pink-500/10 hover:to-yellow-400/10 pointer-events-none transition-all duration-300"></div>
                    </div>
                  </div>

                  {/* Cuisine Filter */}
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">🌍 Cuisine:</span>
                    <div className="relative">
                      <select
                        value={cuisineFilter}
                        onChange={(e) => setCuisineFilter(e.target.value)}
                        className="px-3 py-2 text-xs bg-gray-900/95 backdrop-blur-sm border-2 border-gray-700 hover:border-purple-500/60 rounded-xl text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 cursor-pointer appearance-none hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-purple-500/20"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A78BFA' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em',
                          paddingRight: '2.2rem'
                        }}
                      >
                        <option value="all" className="bg-gray-900 text-gray-200">All</option>
                        <option value="Indian" className="bg-gray-900 text-gray-200">Indian</option>
                        <option value="Chinese" className="bg-gray-900 text-gray-200">Chinese</option>
                        <option value="Italian" className="bg-gray-900 text-gray-200">Italian</option>
                        <option value="Mexican" className="bg-gray-900 text-gray-200">Mexican</option>
                        <option value="American" className="bg-gray-900 text-gray-200">American</option>
                        <option value="Thai" className="bg-gray-900 text-gray-200">Thai</option>
                        <option value="Japanese" className="bg-gray-900 text-gray-200">Japanese</option>
                        <option value="Mediterranean" className="bg-gray-900 text-gray-200">Mediterranean</option>
                        <option value="French" className="bg-gray-900 text-gray-200">French</option>
                        <option value="Other" className="bg-gray-900 text-gray-200">Other</option>
                      </select>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-yellow-400/0 hover:from-purple-500/10 hover:via-pink-500/10 hover:to-yellow-400/10 pointer-events-none transition-all duration-300"></div>
                    </div>
                  </div>

                  {/* Region Selector */}
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">🗺️ Region:</span>
                    <div className="relative">
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value as any)}
                        className="px-3 py-2 text-xs bg-gray-900/95 backdrop-blur-sm border-2 border-gray-700 hover:border-purple-500/60 rounded-xl text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 cursor-pointer appearance-none hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-purple-500/20"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A78BFA' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em',
                          paddingRight: '2.2rem'
                        }}
                      >
                        <option value="US" className="bg-gray-900 text-gray-200">US</option>
                        <option value="EU" className="bg-gray-900 text-gray-200">EU</option>
                        <option value="IN" className="bg-gray-900 text-gray-200">IN</option>
                      </select>
                    </div>
                  </div>

                  {/* Budget Filter */}
                  <div className="flex items-center gap-2 group">
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">💸 Budget:</span>
                    <div className="relative">
                      <select
                        value={budgetFilter as any}
                        onChange={(e) => setBudgetFilter((e.target.value as any) === 'any' ? 'any' : Number(e.target.value) as 2|5|8|12)}
                        className="px-3 py-2 text-xs bg-gray-900/95 backdrop-blur-sm border-2 border-gray-700 hover:border-purple-500/60 rounded-xl text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 cursor-pointer appearance-none hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-purple-500/20"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A78BFA' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.2em 1.2em',
                          paddingRight: '2.2rem'
                        }}
                      >
                        <option value="any" className="bg-gray-900 text-gray-200">Any</option>
                        <option value={2} className="bg-gray-900 text-gray-200">Under {currencySymbol(region)}{convertBudgetDisplay(2, region)}/serv</option>
                        <option value={5} className="bg-gray-900 text-gray-200">Under {currencySymbol(region)}{convertBudgetDisplay(5, region)}/serv</option>
                        <option value={8} className="bg-gray-900 text-gray-200">Under {currencySymbol(region)}{convertBudgetDisplay(8, region)}/serv</option>
                        <option value={12} className="bg-gray-900 text-gray-200">Under {currencySymbol(region)}{convertBudgetDisplay(12, region)}/serv</option>
                      </select>
                    </div>
                  </div>

                  {/* Pantry controls */}
                  <button
                    onClick={() => setShowPantryManager(v => !v)}
                    className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 border ${showPantryManager ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white border-transparent' : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:text-white hover:border-purple-500'}`}
                  >
                    🥫 Pantry
                  </button>
                  <button
                    onClick={() => setBudgetMode(b => !b)}
                    className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 border ${budgetMode ? 'bg-green-600/80 text-white border-transparent' : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:text-white hover:border-purple-500'}`}
                    title="Prefer cheaper substitutions in shopping list"
                  >
                    💰 Budget Mode
                  </button>
                  <button
                    onClick={() => setPrioritizePantry(p => !p)}
                    className={`px-3 py-1 text-xs rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 border ${prioritizePantry ? 'bg-blue-600/80 text-white border-transparent' : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:text-white hover:border-purple-500'}`}
                    title="Sort results by how much they use your pantry"
                  >
                    📦 Prioritize Pantry
                  </button>

                  {/* Favorites Toggle */}
                  <button
                    onClick={() => setShowCollections(!showCollections)}
                    className="px-3 py-1 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-purple-500 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1"
                  >
                    ⭐ Favorites ({favorites.size})
                  </button>

                  {/* Meal Planner Toggle */}
                  <button
                    onClick={() => setShowMealPlanner(!showMealPlanner)}
                    className="px-3 py-1 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-purple-500 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1"
                  >
                    📅 Meal Planner
                  </button>
                </div>
              )}

              {showPantryManager && (
                <div className="mt-3 mb-2 bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      value={pantryInput}
                      onChange={(e) => setPantryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && pantryInput.trim()) {
                          setPantryItems(prev => Array.from(new Set([...prev, ...pantryInput.split(',').map(s => s.trim()).filter(Boolean)])));
                          setPantryInput('');
                        }
                      }}
                      placeholder="Add pantry items, comma-separated (e.g., onions, rice)"
                      className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => {
                        if (!pantryInput.trim()) return;
                        setPantryItems(prev => Array.from(new Set([...prev, ...pantryInput.split(',').map(s => s.trim()).filter(Boolean)])));
                        setPantryInput('');
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:scale-105 active:scale-95 transition"
                    >
                      Add
                    </button>
                    {pantryItems.length > 0 && (
                      <span className="text-xs text-gray-400 ml-auto">{pantryItems.length} item(s)</span>
                    )}
                  </div>
                  {pantryItems.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pantryItems.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-gray-800/70 border border-gray-700 text-gray-200">
                          <span>🥫 {item}</span>
                          <button onClick={() => setPantryItems(p => p.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-white">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <div ref={inputWrapRef} className="relative flex-grow rounded-xl">
                  <input
                    ref={inputRef}
                    type="text"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGetRecipes()}
                    placeholder={
                      searchMode === "ingredients"
                        ? "e.g., chicken, rice, tomatoes, garlic..."
                        : "e.g., Chicken Biryani, Pasta Carbonara..."
                    }
                    className="w-full pr-12 px-6 py-4 bg-gray-800/80 border-2 border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg transition"
                  />
                  {ingredients && (
                    <button
                      type="button"
                      onClick={clearIngredients}
                      aria-label="Clear input"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full p-1 transition-colors duration-150 group"
                    >
                      <svg className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={handleGetRecipes}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span>Cooking up ideas...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <span>🔍</span>
                      <span>{searchMode === "ingredients" ? "Get Recipes" : "Find Variations"}</span>
                    </span>
                  )}
                </button>
              </div>
              {/* Helper text */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                {searchMode === "ingredients" 
                  ? "💡 Separate multiple ingredients with commas" 
                  : "💡 Enter a dish name to discover different variations and recipes"}
              </p>
            </div>
          </div>

          {error && (
            <div className="max-w-3xl mx-auto mb-6">
              <div className="p-4 bg-red-500/10 border border-red-500/30 backdrop-blur-xl rounded-xl">
                <p className="text-red-400 flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              </div>
            </div>
          )}

          {/* Collections/Favorites View */}
          {showCollections && (
            <div className="mt-10 bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800">
              <h3 className="text-3xl font-bold text-white mb-6">
                ⭐ Your <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">Favorites</span>
              </h3>
              {favorites.size > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recipes.filter(r => r.id && favorites.has(r.id)).map((recipe, index) => (
                    <div
                      key={index}
                      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-purple-500 transition-all cursor-pointer"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-lg font-semibold text-white flex-1">{recipe.name}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(recipe.id!);
                          }}
                          className="text-red-500 hover:scale-110 transition-transform"
                        >
                          ❤️
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">{recipe.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤍</div>
                  <p className="text-gray-400 text-lg mb-2">No favorites yet!</p>
                  <p className="text-gray-500 text-sm">
                    Generate recipes and click the heart icon to save your favorites here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Meal Planner View */}
          {showMealPlanner && (
            <div className="mt-10 bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-4xl font-bold text-white mb-2">
                    📅 <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">Meal Planner</span>
                  </h3>
                  <p className="text-gray-400 text-sm">Plan your week and generate shopping lists automatically</p>
                </div>
                {Object.keys(mealPlan).length > 0 && (
                  <button
                    onClick={() => {
                      const list = generateShoppingList();
                      const listText = list.join('\n');
                      navigator.clipboard.writeText(listText);
                      const totalItems = list.length;
                      alert(`🛒 Shopping list with ${totalItems} items copied to clipboard!`);
                    }}
                    className="relative group px-6 py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <span>📋</span>
                      <span>Generate Shopping List</span>
                    </span>
                    <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                  </button>
                )}
              </div>

              {/* Goals-based Auto Planner */}
              <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Daily Calories</label>
                      <input type="number" min={800} max={4000} value={goals.calories ?? ''}
                        onChange={(e)=>setGoals(g=>({...g, calories: Number(e.target.value)||undefined}))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Protein (g)</label>
                      <input type="number" min={0} value={goals.protein ?? ''}
                        onChange={(e)=>setGoals(g=>({...g, protein: Number(e.target.value)||undefined}))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Carbs (g)</label>
                      <input type="number" min={0} value={goals.carbs ?? ''}
                        onChange={(e)=>setGoals(g=>({...g, carbs: Number(e.target.value)||undefined}))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Fats (g)</label>
                      <input type="number" min={0} value={goals.fats ?? ''}
                        onChange={(e)=>setGoals(g=>({...g, fats: Number(e.target.value)||undefined}))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={autoPlanToGoals}
                      disabled={loading || recipes.length === 0}
                      className={`px-5 py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white rounded-xl font-bold shadow-lg transition-all ${
                        loading || recipes.length === 0 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:shadow-xl hover:scale-105 active:scale-95'
                      }`}
                    >
                      {loading ? '⏳ Planning...' : '⚡ Auto‑Fill Week to Goals'}
                    </button>
                    <div className="text-xs text-gray-400">
                      {recipes.length === 0 ? 'Generate recipes first' : 'Uses your generated recipes'}
                    </div>
                  </div>
                </div>
              </div>
              
              {recipes.length === 0 && (
                <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-12 border border-gray-700/50 text-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-yellow-400/5"></div>
                  <div className="relative z-10">
                    <div className="text-7xl mb-6 animate-bounce">🍽️</div>
                    <h4 className="text-2xl font-bold text-white mb-3">
                      <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                        No recipes to plan yet!
                      </span>
                    </h4>
                    <p className="text-gray-400 text-base mb-6 max-w-md mx-auto">
                      Generate some delicious recipes first, then come back here to organize your weekly meal plan.
                    </p>
                    <button
                      onClick={() => setShowMealPlanner(false)}
                      className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 border border-gray-600 shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <span>←</span>
                      <span>Back to Search</span>
                    </button>
                  </div>
                </div>
              )}
              
              {recipes.length > 0 && (
                <div className="grid gap-5">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  const dateStr = date.toISOString().split('T')[0];
                  const dayPlan = mealPlan[dateStr];
                  const isToday = i === 0;
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-5 border transition-all duration-300 hover:border-purple-500/50 ${
                        isToday 
                          ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
                          : 'border-gray-700'
                      }`}
                    >
                      {isToday && (
                        <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white text-xs font-bold rounded-full shadow-lg">
                          TODAY
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">
                          {['📅', '🗓️', '📆', '📋', '📝', '📌', '📍'][i % 7]}
                        </span>
                        <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {(['breakfast', 'lunch', 'dinner'] as const).map(mealType => {
                          const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
                          return (
                            <div 
                              key={mealType} 
                              className="relative bg-gradient-to-br from-gray-900/70 to-gray-900/50 rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 group"
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">{mealIcons[mealType]}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  {mealType}
                                </span>
                              </div>
                              {dayPlan?.[mealType] ? (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                  <div className="text-sm text-white font-semibold line-clamp-2 group-hover:text-purple-300 transition-colors">
                                    {dayPlan[mealType]!.name}
                                  </div>
                                  {dayPlan[mealType]!.cooking_time && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <span>⏱️</span>
                                      <span>{dayPlan[mealType]!.cooking_time}</span>
                                    </div>
                                  )}
                                  <div className="flex gap-2 pt-2">
                                    <button
                                      onClick={() => setSelectedRecipe(dayPlan[mealType]!)}
                                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-300 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 border border-purple-500/30"
                                    >
                                      👁️ View
                                    </button>
                                    <button
                                      onClick={() => removeFromMealPlan(dateStr, mealType)}
                                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 border border-red-500/30"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <select
                                    onChange={(e) => {
                                      const recipe = recipes.find(r => r.id === e.target.value);
                                      if (recipe) {
                                        addToMealPlan(dateStr, mealType, recipe);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="w-full bg-gray-900/95 backdrop-blur-sm border-2 border-gray-700 hover:border-purple-500/70 rounded-xl px-4 py-3 text-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 cursor-pointer appearance-none hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-purple-500/30"
                                    defaultValue=""
                                    style={{
                                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A78BFA' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                      backgroundPosition: 'right 0.75rem center',
                                      backgroundRepeat: 'no-repeat',
                                      backgroundSize: '1.5em 1.5em',
                                      paddingRight: '3rem'
                                    }}
                                  >
                                    <option value="" className="bg-gray-900 text-gray-300 font-semibold">✨ Add recipe...</option>
                                    {recipes.map((r, idx) => (
                                      <option key={idx} value={r.id} className="bg-gray-900 text-white py-2 font-medium">
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-yellow-400/0 group-hover:from-purple-500/15 group-hover:via-pink-500/15 group-hover:to-yellow-400/15 pointer-events-none transition-all duration-300"></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}

          {recipes.length > 0 && !showCollections && !showMealPlanner && (
            <div className="mt-10">
              <h3 className="text-3xl font-bold text-white mb-8 text-center">
                {showTrending ? '🔥 ' : '🍽️ Your Personalized '}
                <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                  {showTrending ? 'Trending Recipes' : 'Recipes'}
                </span>
                {filteredRecipes.length !== recipes.length && (
                  <span className="text-sm text-gray-400 ml-3">
                    ({filteredRecipes.length} of {recipes.length})
                  </span>
                )}
              </h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRecipes.map((recipe, index) => (
                  <div 
                    key={index} 
                    className="group bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-800 cursor-pointer transform hover:-translate-y-2 hover:border-gray-700"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 h-1"></div>
                    {/* Recipe Image Preview */}
                    {recipe.imageUrl ? (
                      <div className="relative w-full h-48 overflow-hidden bg-gray-800">
                        <img 
                          src={recipe.imageUrl} 
                          alt={recipe.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/30 to-transparent" />
                      </div>
                    ) : imageLoading[index] ? (
                      <div className="w-full h-48 bg-gray-800 animate-pulse flex items-center justify-center">
                        <span className="text-gray-500 text-sm">Loading image...</span>
                      </div>
                    ) : null}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-xl font-bold text-white group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:via-pink-500 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all flex-1">
                          {recipe.name}
                        </h4>
                        <div className="flex items-center gap-2 ml-2">
                          {recipe.dietType && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              recipe.dietType === 'veg' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              recipe.dietType === 'vegan' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              recipe.dietType === 'egg' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {recipe.dietType === 'veg' ? '🥬 Veg' : recipe.dietType === 'vegan' ? '🌱 Vegan' : recipe.dietType === 'egg' ? '🥚 Egg' : '🍖 Non-Veg'}
                            </span>
                          )}
                          {recipe.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(recipe.id!);
                              }}
                              className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                                favorites.has(recipe.id!)
                                  ? 'text-red-500 bg-red-500/20'
                                  : 'text-gray-400 bg-gray-800/50 hover:text-red-400'
                              }`}
                              title={favorites.has(recipe.id!) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {favorites.has(recipe.id!) ? '❤️' : '🤍'}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 mb-4 line-clamp-3">
                        {recipe.description}
                      </p>
                      
                      {/* Nutritional Info */}
                      {recipe.calories && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-medium">
                            🔥 {recipe.calories} cal
                          </span>
                          {recipe.protein && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-medium">
                              💪 {recipe.protein}g protein
                            </span>
                          )}
                          {recipe.carbs && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-medium">
                              🍞 {recipe.carbs}g carbs
                            </span>
                          )}
                          {recipe.fats && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full text-xs font-medium">
                              🥑 {recipe.fats}g fats
                            </span>
                          )}
                        </div>
                      )}
                      {/* Cost & Pantry match */}
                      {recipe.ingredients && (
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-medium">
                            💵 {currencySymbol(region)}{estimateCost(recipe).perServing.toFixed(2)}/serv
                          </span>
                          {pantryItems.length > 0 && (
                            <span className="text-xs text-gray-400">
                              🥫 Pantry match: {pantryMatchScore(recipe)}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {recipe.cooking_time && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 font-medium">
                              <span>⏱️</span>
                              <span>{recipe.cooking_time}</span>
                            </div>
                          )}
                          {recipe.difficulty && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 font-medium">
                              <span>📊</span>
                              <span>{recipe.difficulty}</span>
                            </div>
                          )}
                          {recipe.servings && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 font-medium">
                              <span>🍽️</span>
                              <span>{recipe.servings} servings</span>
                            </div>
                          )}
                        </div>
                        {recipe.averageRating !== undefined && (
                          <div className="flex items-center space-x-1 text-sm">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-white font-semibold">{recipe.averageRating.toFixed(1)}</span>
                            {recipe.totalRatings && (
                              <span className="text-gray-500">({recipe.totalRatings})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="mt-2 flex items-center space-x-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent font-semibold text-sm group-hover:translate-x-1 transition-transform">
                        <span>View Full Recipe</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedRecipe && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-xl">
              <div className="relative bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-[2px] rounded-3xl shadow-[0_0_40px_-10px_rgba(236,72,153,0.45)] w-full max-w-4xl">
                <div className="relative rounded-3xl bg-gray-950/95 border border-gray-800/80 overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Hero Image Section */}
                  {selectedRecipe.imageUrl && (
                    <div className="relative w-full h-64 sm:h-80 overflow-hidden">
                      <img 
                        src={selectedRecipe.imageUrl} 
                        alt={selectedRecipe.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-gray-950/70 to-gray-950" />
                      {/* Close button overlay on image */}
                      <button
                        onClick={() => setSelectedRecipe(null)}
                        className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-black/60 rounded-full p-2.5 transition-colors backdrop-blur-sm bg-black/30"
                        aria-label="Close modal"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className={`px-8 ${selectedRecipe.imageUrl ? 'pt-6' : 'pt-8'} pb-6`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                          {selectedRecipe.name}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-800/80 border border-gray-700 text-gray-300 backdrop-blur-sm">⚙️ AI Generated</span>
                          {selectedRecipe.cooking_time && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-black shadow-inner">
                              ⏱️ {selectedRecipe.cooking_time}
                            </span>
                          )}
                          {selectedRecipe.dietType && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              selectedRecipe.dietType === 'veg' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              selectedRecipe.dietType === 'vegan' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              selectedRecipe.dietType === 'egg' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {selectedRecipe.dietType === 'veg' ? '🥬 Vegetarian' : selectedRecipe.dietType === 'vegan' ? '🌱 Vegan' : selectedRecipe.dietType === 'egg' ? '🥚 Egg' : '🍖 Non-Vegetarian'}
                            </span>
                          )}
                          {selectedRecipe.difficulty && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-800/80 border border-gray-700 text-gray-300">
                              📊 {selectedRecipe.difficulty}
                            </span>
                          )}
                          {selectedRecipe.cuisine && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-800/80 border border-gray-700 text-gray-300">
                              🌍 {selectedRecipe.cuisine}
                            </span>
                          )}
                        </div>
                        {selectedRecipe.id && (
                          <div className="mt-4 flex items-center gap-4">
                            <span className="text-sm text-gray-400">Rate this recipe:</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (selectedRecipe.id) handleRateRecipe(selectedRecipe.id, star);
                                  }}
                                  className={`text-2xl transition-all duration-200 hover:scale-125 active:scale-110 ${
                                    (userRatings[selectedRecipe.id!] || 0) >= star
                                      ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                      : 'text-gray-600 hover:text-yellow-400/50'
                                  }`}
                                >
                                  ⭐
                                </button>
                              ))}
                            </div>
                            {selectedRecipe.averageRating !== undefined && (
                              <span className="text-sm text-gray-400">
                                {selectedRecipe.averageRating.toFixed(1)} ({selectedRecipe.totalRatings || 0} ratings)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {!selectedRecipe.imageUrl && (
                        <button
                          onClick={() => setSelectedRecipe(null)}
                          className="text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-full p-2 transition-colors"
                          aria-label="Close modal"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-8 pb-8 overflow-y-auto space-y-10">
                    <p className="text-gray-400 text-lg leading-relaxed max-w-3xl">
                      {selectedRecipe.description}
                    </p>

                    {/* Recipe Scaling and Nutritional Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Servings Scaler */}
                      {selectedRecipe.servings && selectedRecipe.id && (
                        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-4">
                          <h5 className="text-sm font-semibold text-gray-300 mb-3">🍽️ Servings</h5>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                if (!selectedRecipe.id) return;
                                const current = scaledServings[selectedRecipe.id] || selectedRecipe.servings!;
                                if (current > 1) {
                                  setScaledServings(prev => ({
                                    ...prev,
                                    [selectedRecipe.id!]: current - 1
                                  }));
                                }
                              }}
                              className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold transition-all duration-200 hover:scale-110 active:scale-95"
                            >
                              −
                            </button>
                            <span className="text-xl font-bold text-white min-w-[60px] text-center">
                              {scaledServings[selectedRecipe.id] || selectedRecipe.servings}
                            </span>
                            <button
                              onClick={() => {
                                if (!selectedRecipe.id) return;
                                const current = scaledServings[selectedRecipe.id] || selectedRecipe.servings!;
                                setScaledServings(prev => ({
                                  ...prev,
                                  [selectedRecipe.id!]: current + 1
                                }));
                              }}
                              className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold transition-all duration-200 hover:scale-110 active:scale-95"
                            >
                              +
                            </button>
                            {scaledServings[selectedRecipe.id] && scaledServings[selectedRecipe.id] !== selectedRecipe.servings && (
                              <button
                                onClick={() => {
                                  if (!selectedRecipe.id) return;
                                  setScaledServings(prev => {
                                    const newScaled = { ...prev };
                                    delete newScaled[selectedRecipe.id!];
                                    return newScaled;
                                  });
                                }}
                                className="ml-2 text-xs text-gray-400 hover:text-white underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Nutritional Info */}
                      {(selectedRecipe.calories || selectedRecipe.protein || selectedRecipe.carbs || selectedRecipe.fats) && (
                        <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-4">
                          <h5 className="text-sm font-semibold text-gray-300 mb-3">📊 Nutrition Per Serving</h5>
                          <div className="space-y-2">
                            {selectedRecipe.calories && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Calories</span>
                                <span className="text-sm font-semibold text-blue-400">
                                  {Math.round(selectedRecipe.calories * (selectedRecipe.id && scaledServings[selectedRecipe.id] ? scaledServings[selectedRecipe.id] : selectedRecipe.servings || 1) / (selectedRecipe.servings || 1))} kcal
                                </span>
                              </div>
                            )}
                            {selectedRecipe.protein && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Protein</span>
                                <span className="text-sm font-semibold text-purple-400">
                                  {Math.round(selectedRecipe.protein * (selectedRecipe.id && scaledServings[selectedRecipe.id] ? scaledServings[selectedRecipe.id] : selectedRecipe.servings || 1) / (selectedRecipe.servings || 1))}g
                                </span>
                              </div>
                            )}
                            {selectedRecipe.carbs && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Carbs</span>
                                <span className="text-sm font-semibold text-yellow-400">
                                  {Math.round(selectedRecipe.carbs * (selectedRecipe.id && scaledServings[selectedRecipe.id] ? scaledServings[selectedRecipe.id] : selectedRecipe.servings || 1) / (selectedRecipe.servings || 1))}g
                                </span>
                              </div>
                            )}
                            {selectedRecipe.fats && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Fats</span>
                                <span className="text-sm font-semibold text-orange-400">
                                  {Math.round(selectedRecipe.fats * (selectedRecipe.id && scaledServings[selectedRecipe.id] ? scaledServings[selectedRecipe.id] : selectedRecipe.servings || 1) / (selectedRecipe.servings || 1))}g
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                      <div className="relative group">
                        <div className="absolute inset-y-0 -left-0.5 w-1 rounded-full bg-gradient-to-b from-yellow-400 via-pink-500 to-purple-600"></div>
                        <div className="pl-6 py-5 bg-gray-900/70 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-lg">
                          <h4 className="font-bold text-white mb-4 flex items-center space-x-2 text-lg">
                            <span>🥘</span>
                            <span>Ingredients</span>
                            {selectedRecipe.id && scaledServings[selectedRecipe.id] && scaledServings[selectedRecipe.id] !== selectedRecipe.servings && (
                              <span className="text-xs text-purple-400 font-normal">
                                (scaled for {scaledServings[selectedRecipe.id]} servings)
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <label className="text-xs text-gray-400 flex items-center gap-2">
                                <input type="checkbox" className="accent-purple-500" checked={showSwapCompare} onChange={(e)=>setShowSwapCompare(e.target.checked)} />
                                Compare swaps
                              </label>
                            </div>
                            <div className="text-xs text-gray-400">{selectedRecipe.servings ? `Servings: ${selectedRecipe.servings}` : ''}</div>
                          </div>
                          <ul className={showSwapCompare ? "grid sm:grid-cols-2 gap-x-8 gap-y-3" : "grid sm:grid-cols-2 gap-x-8 gap-y-3"}>
                            {(() => {
                              const displayRecipe = selectedRecipe.id && scaledServings[selectedRecipe.id] && selectedRecipe.servings
                                ? scaleRecipe(selectedRecipe, scaledServings[selectedRecipe.id])
                                : selectedRecipe;
                              return displayRecipe.ingredients?.map((ing, idx) => {
                                const ingredientText = selectedRecipe?.id && appliedSwaps[selectedRecipe.id]?.[idx]
                                  ? appliedSwaps[selectedRecipe.id]![idx]
                                  : ing;
                                const inPantry = pantryItems.some(p => ingredientText.toLowerCase().includes(p.toLowerCase()));
                                const suggestions = substitutionsFor(ingredientText);
                                return (
                                  <li key={idx} className="text-gray-300">
                                    {showSwapCompare ? (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="text-gray-400 text-sm">
                                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Original</div>
                                          <div className="mt-0.5">{ing}</div>
                                        </div>
                                        <div className="text-gray-200 text-sm">
                                          <div className="text-[11px] uppercase tracking-wide text-gray-500">Your list</div>
                                          <div className="mt-0.5 flex items-center gap-2">
                                            <span>{ingredientText}</span>
                                            {inPantry && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-green-600/20 text-green-300 border border-green-600/30">In pantry</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2">
                                        <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 ring-2 ring-gray-900/50"></span>
                                        <span className="flex-1">
                                          {ingredientText}
                                          {inPantry && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-green-600/20 text-green-300 border border-green-600/30">In pantry</span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                    {suggestions.length > 0 && (
                                      <div className="pl-4 mt-1 flex flex-wrap gap-2">
                                        {suggestions.slice(0,2).map((s, i) => (
                                          <button key={i} onClick={() => {
                                            if (!selectedRecipe?.id) return;
                                            setAppliedSwaps(prev => ({
                                              ...prev,
                                              [selectedRecipe.id!]: { ...(prev[selectedRecipe.id!]||{}), [idx]: s.to }
                                            }));
                                          }}
                                          className={`text-[11px] px-2.5 py-1 rounded-full border transition ${s.cheaper ? 'border-green-600/40 text-green-300 bg-green-600/10 hover:bg-green-600/20' : 'border-purple-600/40 text-purple-300 bg-purple-600/10 hover:bg-purple-600/20'}`}
                                          title={s.reason}
                                          >
                                            Swap → {s.to}
                                          </button>
                                        ))}
                                        {selectedRecipe?.id && appliedSwaps[selectedRecipe.id]?.[idx] && (
                                          <button onClick={() => {
                                            if (!selectedRecipe?.id) return;
                                            setAppliedSwaps(prev => {
                                              const map = { ...(prev[selectedRecipe.id!]||{}) };
                                              delete map[idx];
                                              return { ...prev, [selectedRecipe.id!]: map };
                                            });
                                          }} className="text-[11px] px-2.5 py-1 rounded-full border border-gray-600/50 text-gray-300 hover:bg-gray-700/40">
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              });
                            })()}
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedRecipe.steps && selectedRecipe.steps.length > 0 && (
                      <div className="relative group">
                        <div className="absolute inset-y-0 -left-0.5 w-1 rounded-full bg-gradient-to-b from-yellow-400 via-pink-500 to-purple-600"></div>
                        <div className="pl-6 py-5 bg-gray-900/70 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-lg">
                          <h4 className="font-bold text-white mb-4 flex items-center space-x-2 text-lg">
                            <span>👨‍🍳</span>
                            <span>Instructions</span>
                          </h4>
                          <ol className="space-y-4">
                            {selectedRecipe.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start space-x-4 text-gray-300">
                                <span className="flex-shrink-0 w-8 h-8 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center text-sm font-bold relative">
                                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-20"></span>
                                  <span className="relative bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                                    {idx + 1}
                                  </span>
                                </span>
                                <span className="pt-1 leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {/* Video button – compact pill with spinner */}
                      <div className="group relative rounded-full p-[1.5px] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_20px_-10px_rgba(236,72,153,0.45)]">
                        <button
                          onClick={() => {
                            setVideoLoading(true);
                            const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedRecipe.name + ' recipe tutorial')}`;
                            window.open(videoUrl, '_blank');
                            setTimeout(() => setVideoLoading(false), 900);
                          }}
                          disabled={videoLoading}
                          aria-busy={videoLoading}
                          className="relative w-full rounded-full bg-gray-950/85 border border-gray-800 h-12 px-5 md:h-12 text-white font-semibold tracking-wide inline-flex items-center justify-center gap-2.5 transition-all ring-1 ring-red-500/15 hover:bg-gray-900/80 hover:shadow-[0_10px_32px_-12px_rgba(239,68,68,0.35)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {videoLoading ? (
                            <>
                              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="text-sm md:text-base">Opening…</span>
                            </>
                          ) : (
                            <>
                              <span className="text-base md:text-lg">▶️</span>
                              <span className="text-sm md:text-base">Video Tutorial</span>
                            </>
                          )}
                          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>

                      {/* Ask Questions – compact pill with spinner */}
                      <div className="group relative rounded-full p-[1.5px] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_20px_-10px_rgba(236,72,153,0.45)]">
                        <button
                          onClick={() => {
                            setAskLoading(true);
                            // Capture the current recipe for chat context, then close modal
                            const current = selectedRecipe;
                            if (current) setChatContextRecipe(current);
                            setChatOpen(true);
                            setSelectedRecipe(null);
                            if (chatMessages.length === 0) {
                              setChatMessages([
                                {
                                  role: 'assistant',
                                  content: current
                                    ? `Hi! I can help you with this ${current.name} recipe. Ask about substitutions, techniques, timing, or tweaks!`
                                    : 'Hi! I can help you with your recipe questions. Ask about substitutions, techniques, timing, or tweaks!',
                                  createdAt: new Date().toISOString()
                                }
                              ]);
                            }
                            setTimeout(() => setAskLoading(false), 600);
                          }}
                          disabled={askLoading}
                          aria-busy={askLoading}
                          className="relative w-full rounded-full bg-gray-950/85 border border-gray-800 h-12 px-5 md:h-12 text-white font-semibold tracking-wide inline-flex items-center justify-center gap-2.5 transition-all ring-1 ring-purple-500/20 hover:bg-gray-900/80 hover:shadow-[0_10px_32px_-12px_rgba(147,51,234,0.35)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {askLoading ? (
                            <>
                              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="text-sm md:text-base">Starting chat…</span>
                            </>
                          ) : (
                            <>
                              <span className="text-base md:text-lg">💬</span>
                              <span className="text-sm md:text-base">Ask Questions</span>
                            </>
                          )}
                          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Chatbot Sidebar */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-gray-950/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col border-l border-gray-800/70">
          {/* Header */}
          <div className="px-5 py-4 bg-gray-900/70 border-b border-gray-800 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600">
                    <div className="w-full h-full rounded-xl flex items-center justify-center bg-gray-950">
                      <span className="text-xl">🤖</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold tracking-wide text-white truncate">Zenny Cooking Assistant</h3>
                  <p className="text-[11px] text-gray-400">Ask for techniques, substitutions & timing</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-full p-2 transition-colors flex-shrink-0"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Second row for context chip and clear button */}
            <div className="flex items-center justify-between gap-2">
              {chatContextRecipe ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-800/60 border border-gray-700 text-gray-200 max-w-[200px]">
                  <span className="truncate">🍽️ {chatContextRecipe.name}</span>
                  <button
                    onClick={() => setChatContextRecipe(null)}
                    className="ml-1.5 text-gray-400 hover:text-white hover:bg-gray-700/60 rounded-full p-0.5 flex-shrink-0"
                    title="Clear recipe context"
                    aria-label="Clear recipe context"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ) : (
                <div />
              )}
              <button
                onClick={() => {
                  if (chatMessages.length === 0) return;
                  const confirmClear = window.confirm('Clear all chat messages? This cannot be undone.');
                  if (confirmClear) setChatMessages([]);
                }}
                disabled={chatMessages.length === 0}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-gray-800/50 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Clear chat history"
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-grow chat-scroll overflow-y-auto px-4 py-5 space-y-4 bg-black/40">
            {chatMessages.length === 0 && (
              <div className="mt-4 space-y-5">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur-sm">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    👋 Hi! I'm here to guide you. Ask about substitutions, flavor tweaks, nutrition, plating, or side ideas.
                  </p>
                  {chatContextRecipe && (
                    <p className="text-xs text-gray-400 mt-2">Current recipe context: <span className="text-gray-300 font-medium">{chatContextRecipe.name}</span></p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {generateSuggestionChips().map((suggestion) => (
                    <span
                      key={suggestion}
                      className="chat-suggestion-chip"
                      onClick={() => {
                        if (suggestion === 'Use Current Ingredients') {
                          if (ingredients.trim()) {
                            setChatInput(`Create a recipe using: ${ingredients}`);
                          }
                        } else {
                          setChatInput(suggestion);
                        }
                      }}
                    >
                      {suggestion}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(() => {
              const groups: { role: 'user' | 'assistant'; messages: ChatMessage[] }[] = [];
              for (const m of chatMessages) {
                const last = groups[groups.length - 1];
                if (last && last.role === m.role) {
                  last.messages.push(m);
                } else {
                  groups.push({ role: m.role, messages: [m] });
                }
              }
              return groups.map((group, gIdx) => (
                <div key={gIdx} className={`flex ${group.role === 'user' ? 'justify-end' : 'justify-start'} chat-msg-animate`}>
                  {group.role === 'assistant' && (
                    <div className="mr-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-xl p-[2px] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600">
                        <div className="w-full h-full rounded-[0.6rem] bg-gray-900 flex items-center justify-center text-sm">🤖</div>
                      </div>
                    </div>
                  )}
                  <div className="group relative max-w-[78%] space-y-2">
                    {group.messages.map((msg, idx) => {
                      const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={idx} className="space-y-1">
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${group.role === 'user' ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white' : 'bg-gray-800/75 border border-gray-700 text-gray-200 backdrop-blur-sm'} transition-colors`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({node, ...props}) => (
                                  <p className="text-sm leading-relaxed" {...props} />
                                ),
                                ol: ({node, ...props}) => (
                                  <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed" {...props} />
                                ),
                                ul: ({node, ...props}) => (
                                  <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed" {...props} />
                                ),
                                li: ({node, ...props}) => (
                                  <li className="text-sm leading-relaxed" {...props} />
                                ),
                                strong: ({node, ...props}) => (
                                  <strong className="font-semibold text-white" {...props} />
                                ),
                                a: ({node, ...props}) => (
                                  <a className="underline decoration-pink-400/60 hover:decoration-pink-400" target="_blank" rel="noreferrer" {...props} />
                                ),
                                code: ({node, ...props}) => (
                                  <code className="rounded bg-black/30 px-1.5" {...props} />
                                )
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                          <div className={`mt-0 flex items-center ${group.role === 'user' ? 'justify-end pr-1' : 'justify-start pl-1'} space-x-1 opacity-60`}> 
                            <span className="text-[10px] tracking-wide text-gray-400">{time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {group.role === 'user' && (
                    <div className="ml-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-xl p-[2px] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600">
                        <div className="w-full h-full rounded-[0.6rem] bg-gray-900 flex items-center justify-center text-sm">🙋‍♂️</div>
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}
            {streaming && chatLoading && (
              <div className="flex justify-start chat-msg-animate">
                <div className="bg-gray-800/70 border border-gray-700 rounded-2xl px-4 py-3 shadow-md flex items-center space-x-2 text-gray-300">
                  <span className="h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Streaming...</span>
                </div>
              </div>
            )}
            {!streaming && chatLoading && (
              <div className="flex justify-start chat-msg-animate">
                <div className="bg-gray-800/70 border border-gray-700 rounded-2xl px-4 py-3 shadow-md flex items-center space-x-2 text-gray-300">
                  <span className="h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 bg-gray-900/80 backdrop-blur-xl border-t border-gray-800">
            <div className="flex items-end space-x-2">
              <div className="flex-grow relative">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!chatLoading && chatInput.trim()) handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Ask a cooking question... (Shift+Enter for newline)"
                  className="w-full resize-none px-4 py-3 bg-gray-800/70 border border-gray-700/80 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-transparent shadow-inner"
                  disabled={chatLoading}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="h-11 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-black shadow-lg shadow-purple-500/30 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-label="Send message"
              >
                {chatLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    <span>Sending</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-black/50 backdrop-blur-xl border-t border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-gray-300 font-medium">
                Built by{' '}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent font-bold">
                  TwistedVis518
                </span>
              </p>
              <p className="text-gray-500 text-sm mt-1">
                © 2025 Zenny. Made with ❤️
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <a
                href="https://github.com/TwistedVision518"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center space-x-2 text-gray-400 hover:text-purple-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm font-medium">GitHub</span>
              </a>
              <a
                href="https://www.instagram.com/pranavislost/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center space-x-2 text-gray-400 hover:text-pink-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-sm font-medium">Instagram</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
