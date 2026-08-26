const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "groq/compound-mini", // Modèle plus léger pour éviter le Rate Limit
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.0, // Température maximale pour forcer l'originalité
        max_tokens: 300
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erreur renvoyée par Groq :', data);
      return res.status(500).json({ error: `Erreur Groq: ${data.error?.message || JSON.stringify(data)}` });
    }

    let rawContent = data.choices[0].message.content;

    // Nettoyage intelligent pour extraire uniquement le JSON
    const startIndex = rawContent.indexOf('{');
    const endIndex = rawContent.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1) {
      rawContent = rawContent.substring(startIndex, endIndex + 1);
    }

    const quizData = JSON.parse(rawContent.trim());

    res.status(200).json(quizData);

  } catch (error) {
    console.error('Erreur API Groq:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la question' });
  }
}
