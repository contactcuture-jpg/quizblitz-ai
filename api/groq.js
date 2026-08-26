const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  // On accepte seulement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { theme, language } = req.body;

    // L'instruction (Prompt) pour le ciblage géographique et linguistique
    const prompt = `Tu es un générateur de quiz pour un jeu mobile. 
    Génère UNE SEULE question de niveau moyen en ${language} sur le thème : ${theme}.
    La question doit être culturellement pertinente pour la région ${language}.
    Tu dois répondre STRICTEMENT au format JSON comme ceci, sans aucun autre texte:
    {
      "question": "Texte de la question ici ?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_index": 0
    }
    (Note: "correct_index" est l'index de la bonne réponse, de 0 à 3).`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7 // Un peu de créativité pour varier les questions
      })
    });

    const data = await response.json();
    let rawContent = data.choices[0].message.content;

    // Parfois l'IA ajoute des balises ```json, on les enlève pour avoir un JSON pur
    if (rawContent.startsWith('```json')) {
      rawContent = rawContent.substring(7);
    }
    if (rawContent.endsWith('```')) {
      rawContent = rawContent.substring(0, rawContent.length - 3);
    }

    const quizData = JSON.parse(rawContent.trim());

    // On renvoie les données au frontend
    res.status(200).json(quizData);

  } catch (error) {
    console.error('Erreur API Groq:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la question' });
  }
}