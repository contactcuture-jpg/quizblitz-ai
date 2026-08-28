export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { theme, language } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "Clé API Groq manquante sur le serveur." });
    }

    const prompt = `Tu es un générateur de quiz expert. Génère 30 questions de quiz difficiles sur le thème: "${theme}". La langue de sortie doit être: "${language}". Réponds UNIQUEMENT avec un objet JSON valide formaté comme ceci: {"questions": [{"question": "Texte", "options": ["A", "B", "C", "D"], "correct_index": 0}]}`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Modèle Llama 3.3 (le tout dernier)
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur API Groq:", errorData);
            return res.status(500).json({ error: errorData.error?.message || "Erreur de l'API Groq" });
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Groq renvoie un objet JSON contenant un tableau "questions"
        const parsed = JSON.parse(content);
        const questionsArray = parsed.questions || parsed;

        res.status(200).json(questionsArray);

    } catch (error) {
        console.error("Erreur interne:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
}
