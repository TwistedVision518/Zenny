# Zenny - AI Recipe Assistant

An intelligent web application that suggests recipes based on ingredients you have available in your kitchen. Built with Next.js, Python Flask, and Google Gemini AI.

## Features

- **Smart Recipe Suggestions**: Enter your available ingredients and get personalized recipe recommendations
- **AI-Powered Chatbot**: Interactive cooking assistant to answer questions about recipes, substitutions, and techniques
- **Detailed Instructions**: View full recipes with ingredients list, cooking steps, and estimated cooking time
- **Modern Dark UI**: Sleek, responsive interface with beautiful gradients and glassmorphism effects

## Setup Instructions

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

## How to Use

1. **Enter Ingredients**: Type your available ingredients in the input field (comma-separated)
   - Example: `chicken, rice, tomatoes, garlic, onion`

2. **Get Recipes**: Click the "Get Recipes" button

3. **View Details**: Click on any recipe card to see the full recipe with ingredients and instructions

4. **Ask Questions**: Click the "Chat Assistant" button to ask questions about recipes, ingredient substitutions, or cooking techniques

5. **Try Different Combinations**: Experiment with different ingredient combinations to discover new recipes!

## Technologies Used

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Python Flask, Google Gemini AI
- **AI**: Gemini 2.0 Flash for recipe generation and chat

## Notes

- The Gemini API is FREE to use with generous rate limits
- Make sure both frontend and backend servers are running for the application to work
- The application requires an active internet connection to communicate with Google's Gemini API

## Developer

Built by **TwistedVis518**

- GitHub: [TwistedVision518](https://github.com/TwistedVision518)
- Instagram: [@pranavislost](https://www.instagram.com/pranavislost/)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

