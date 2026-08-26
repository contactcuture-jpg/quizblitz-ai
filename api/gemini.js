const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fonction pour créer un délai (attendre)
const delay = ms => new Promise(res => setTimeout(res, ms));

// Fonction qui appelle l'IA avec une sécurité (Retry)
async function callGeminiAPI(prompt, retries = 3) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();

  // SI Google dit "Trop de questions (Quota dépassé)"
  if (!response.ok && (response.status === 429 || (data.error && data.error.message.includes('quota')))) {
    if (retries > 0) {
      console.log('Limite atteinte. Pause de 5 secondes...');
      await delay(5000); // On attend 5 secondes
      return callGeminiAPI(prompt, retries - 1); // On réessaie
    } else {
      throw new Error("Le serveur de l'IA est saturé pour le moment. Réessayez dans une minute.");
    }
  }

  if (!response.ok) {
    throw new Error(`Erreur Gemini: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { theme, language } = req.body;
    const randomSeed = Math.floor(Math.random() * 1000000);

    const prompt = `Tu es un générateur de quiz pour un jeu mobile. 
    Génère UNE SEULE question de niveau moyen en ${language} sur le thème : ${theme}.
    La question doit être culturellement pertinente pour la région ${language}.
    Sois très créatif et original. Évite les questions trop évidentes ou classiques. 
    Identifiant de génération: ${randomSeed}.
    Tu dois répondre STRICTEMENT au format JSON, sans aucun texte avant ou après:
    {
      "question": "Texte de la question ici ?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_index": 0
    }
    (Note: "correct_index" est l'index de la bonne réponse, de 0 à 3).`;

    // On appelle notre fonction sécurisée
    const data = await callGeminiAPI(prompt);

    let rawContent = data.candidates[0].content.parts[0].text;

    const startIndex = rawContent.indexOf('{');
    const endIndex = rawContent.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1) {
      rawContent = rawContent.substring(startIndex, endIndex + 1);
    }

    let quizData;
    try {
      quizData = JSON.parse(rawContent.trim());
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError);
      return res.status(500).json({ error: `Erreur de format JSON. Texte reçu: ${rawContent}` });
    }

    res.status(200).json(quizData);

  } catch (error) {
    console.error('Erreur API Gemini:', error);
    res.status(500).json({ error: error.message });
  }
}
