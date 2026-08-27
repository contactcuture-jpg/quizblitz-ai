const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { theme, language } = req.body;

    const prompt = `Tu es un générateur de quiz pour un jeu mobile. 
    Génère 30 questions de niveau moyen en ${language} sur le thème : ${theme}.
    Les questions doivent être culturellement pertinentes pour la région ${language}.
    Sois très créatif et original. Évite les questions trop évidentes ou classiques.
    TRÈS IMPORTANT : Tu DOIS absolument écrire la question et les options dans la langue exacte demandée (${language}) en utilisant son alphabet natif (ex: alphabet cyrillique pour le russe, caractères chinois pour le chinois). Ne traduis jamais en français.
    Tu dois répondre STRICTEMENT au format JSON (un tableau contenant 30 objets), sans aucun texte avant ou après:
    [
      {
        "question": "Texte de la question 1 ici ?",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correct_index": 0
      },
      ... (total 30 questions)
    ]
    (Note: "correct_index" est l'index de la bonne réponse, de 0 à 3).`;

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
    
    if (!response.ok) {
      console.error('Erreur renvoyée par Gemini :', data);
      return res.status(500).json({ error: `Erreur Gemini: ${data.error?.message || JSON.stringify(data)}` });
    }

    let rawContent = data.candidates[0].content.parts[0].text;

    const startIndex = rawContent.indexOf('[');
    const endIndex = rawContent.lastIndexOf(']');
    
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
