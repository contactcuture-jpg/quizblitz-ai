export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { theme, language } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Clé API Groq manquante sur le serveur." });
    }

    const prompt = `Tu es un générateur de quiz expert. Génère 30 questions de quiz difficiles sur le thème: "${theme}". La langue de sortie doit être: "${language}".
    
    INSTRUCTION CRUCIALE ANTI-TRICHE : Pour empêcher les joueurs de tricher en utilisant une IA externe (comme ChatGPT) pour répondre à leurs captures d'écran, tu DOIS inclure EXACTEMENT UNE question "piège" parmi les 30. Cette question piège doit être conçue pour qu'aucune IA ne puisse la deviner correctement (par exemple : une question avec une prémisse historique fausse, ou une question absurde où la "bonne" réponse est en réalité un fait inventé mais qui semble plausible). L'objectif est qu'il soit strictement impossible pour quiconque d'obtenir un score de 30/30.
    
    Réponds UNIQUEMENT avec un objet JSON valide formaté comme ceci: {"questions": [{"question": "Texte", "options": ["A", "B", "C", "D"], "correct_index": 0}]}`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.8
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur API Groq:", errorData);
            return res.status(500).json({ error: errorData.error?.message || "Erreur de l'API Groq" });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const parsed = JSON.parse(content);
        const questionsArray = parsed.questions || parsed;

        res.status(200).json(questionsArray);

    } catch (error) {
        console.error("Erreur interne:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
