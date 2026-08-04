export async function onRequestPost(context) {
  try {
    // 1. Récupérer la clé API stockée dans Cloudflare (Secret Variable)
    const apiKey = context.env.GCP_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Clé API non configurée." }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 2. Récupérer les données envoyées par le joueur (ex: l'action ou la décision)
    const body = await context.request.json();
    const promptUtilisateur = body.prompt;

    // 3. Appel sécurisé vers l'API d'IA (ex: Gemini / Google AI)
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptUtilisateur }] }]
      })
    });

    const data = await aiResponse.json();

    // 4. Renvoyer uniquement la réponse texte au joueur
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Erreur lors du traitement par l'IA." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}