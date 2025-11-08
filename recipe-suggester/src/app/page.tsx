"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Recipe {
  name: string;
  description: string;
  ingredients?: string[];
  steps?: string[];
  cooking_time?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO timestamp for message
}

export default function Home() {
  const [ingredients, setIngredients] = useState("");
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
  // Use env-based API base so we can deploy frontend separately (e.g., Netlify) and point to remote Flask backend.
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleGetRecipes = async () => {
    if (!ingredients.trim()) {
      setError("Please enter some ingredients");
      return;
    }
    setLoading(true);
    setError("");
    setRecipes([]);
    try {
  const response = await fetch(`${API_BASE}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredients.split(",").map((i) => i.trim()) }),
      });
      if (!response.ok) throw new Error("Failed to get recipes");
      const data = await response.json();
      setRecipes(data.recipes || []);
    } catch (e) {
      setError("Couldn't fetch recipes. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
  const userMessage: ChatMessage = { role: "user", content: chatInput, createdAt: new Date().toISOString() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    try {
      const context: any = {};
      if (selectedRecipe) context.recipe = selectedRecipe;
      if (ingredients) context.user_ingredients = ingredients.split(",").map((i) => i.trim());

  const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, context }),
      });
      const data = await response.json();
  const assistantMessage: ChatMessage = { role: "assistant", content: data.response, createdAt: new Date().toISOString() };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setChatLoading(false);
    }
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
                <div className="text-3xl">🍳</div>
                <Link
                  href="/"
                  className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                >
                  Zenny
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
                onClick={() => setChatOpen(!chatOpen)}
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
              Tell us what ingredients you have, and we'll create delicious recipes just for you! ✨
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-gray-800">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGetRecipes()}
                  placeholder="e.g., chicken, rice, tomatoes, garlic..."
                  className="flex-grow px-6 py-4 bg-gray-800/80 border-2 border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
                <button
                  onClick={handleGetRecipes}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl whitespace-nowrap"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span>Finding...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <span>🔍</span>
                      <span>Get Recipes</span>
                    </span>
                  )}
                </button>
              </div>
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

          {recipes.length > 0 && (
            <div className="mt-10">
              <h3 className="text-3xl font-bold text-white mb-8 text-center">
                🍽️ Your Personalized <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">Recipes</span>
              </h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recipes.map((recipe, index) => (
                  <div 
                    key={index} 
                    className="group bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-800 cursor-pointer transform hover:-translate-y-2 hover:border-gray-700"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <div className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 h-1"></div>
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-white mb-3 group-hover:bg-gradient-to-r group-hover:from-yellow-400 group-hover:via-pink-500 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                        {recipe.name}
                      </h4>
                      <p className="text-gray-400 mb-4 line-clamp-3">
                        {recipe.description}
                      </p>
                      {recipe.cooking_time && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500 font-medium mb-4">
                          <span>⏱️</span>
                          <span>{recipe.cooking_time}</span>
                        </div>
                      )}
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
                  <div className="px-8 pt-8 pb-6">
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
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-800/80 border border-gray-700 text-gray-300">🧪 Difficulty: Easy</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedRecipe(null)}
                        className="text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-full p-2 transition-colors"
                        aria-label="Close modal"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="px-8 pb-8 overflow-y-auto space-y-10">
                    <p className="text-gray-400 text-lg leading-relaxed max-w-3xl">
                      {selectedRecipe.description}
                    </p>

                    {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                      <div className="relative group">
                        <div className="absolute inset-y-0 -left-0.5 w-1 rounded-full bg-gradient-to-b from-yellow-400 via-pink-500 to-purple-600"></div>
                        <div className="pl-6 py-5 bg-gray-900/70 border border-gray-800 rounded-2xl backdrop-blur-sm shadow-lg">
                          <h4 className="font-bold text-white mb-4 flex items-center space-x-2 text-lg">
                            <span>🥘</span>
                            <span>Ingredients</span>
                          </h4>
                          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                            {selectedRecipe.ingredients.map((ing, idx) => (
                              <li key={idx} className="flex items-start space-x-2 text-gray-300">
                                <span className="mt-1 w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 ring-2 ring-gray-900/50"></span>
                                <span>{ing}</span>
                              </li>
                            ))}
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
                            setChatOpen(true);
                            setSelectedRecipe(null);
                            if (chatMessages.length === 0) {
                              setChatMessages([
                                {
                                  role: 'assistant',
                                  content: `Hi! I can help you with this ${selectedRecipe.name} recipe. Feel free to ask me about substitutions, cooking techniques, or any questions you have!`,
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
          <div className="px-5 py-4 flex items-center justify-between bg-gray-900/70 border-b border-gray-800 relative">
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-xl p-[2px] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600">
                  <div className="w-full h-full rounded-xl flex items-center justify-center bg-gray-950">
                    <span className="text-xl">🤖</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-white">Zenny Cooking Assistant</h3>
                <p className="text-[11px] text-gray-400">Ask for techniques, substitutions & timing</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (chatMessages.length === 0) return;
                  const confirmClear = window.confirm('Clear all chat messages? This cannot be undone.');
                  if (confirmClear) setChatMessages([]);
                }}
                className="px-2 py-1 text-[11px] font-medium rounded-lg bg-gray-800/50 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 hover:bg-gray-800 transition-colors"
                aria-label="Clear chat history"
              >
                Clear
              </button>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-full p-2 transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-grow chat-scroll overflow-y-auto px-4 py-5 space-y-4 bg-black/40">
            {chatMessages.length === 0 && (
              <div className="mt-4 space-y-5">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur-sm">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    👋 Hi! I'm here to guide you through cooking. Provide ingredients for recipe help, or ask me how to tweak what you've got.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'How do I substitute eggs?',
                    'Make this spicier',
                    'Suggest a side dish',
                    'Simplify the steps',
                    'Give me plating tips'
                  ].map((suggestion) => (
                    <span
                      key={suggestion}
                      className="chat-suggestion-chip"
                      onClick={() => setChatInput(suggestion)}
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
            {chatLoading && (
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
