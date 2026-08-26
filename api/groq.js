const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  // On accepte seulement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { theme, language } = req.body;

    // Numéro aléatoire pour forcer l'IA à changer de question à chaque fois
    const randomSeed = Math.floor(Math.random() * 1000000);

    // L'instruction (Prompt)
    const prompt = `Tu es un générateur de quiz pour un jeu mobile. 
    Génère UNE SEULE question de niveau moyen en ${language} sur le thème : ${theme}.
    La question doit être culturellement pertinente pour la région ${language}.
    Identifiant de génération: ${randomSeed} (Utilise-le pour générer une question unique et différente des précédentes).
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
        model: "groq/compound",
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // Température plus haute pour plus de créativité
        max_tokens: 500 // Augmenté pour éviter que le JSON soit coupé
      })
    });

    const data = await response.json();
    
    // Si Groq renvoie une erreur, on l'affiche clairement
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

    // On renvoie les données au frontend
    res.status(200).json(quizData);

  } catch (error) {
    console.error('Erreur API Groq:', error);
    res.status(500).json({ error: 'Erreur lors de la génération de la question' });
  }
}
