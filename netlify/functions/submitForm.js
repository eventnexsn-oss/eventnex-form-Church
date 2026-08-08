const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const loadLocalEnv = () => {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('No .env file found');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
      console.log(`Loaded env var: ${key}`);
    }
  });
};

loadLocalEnv();

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME || 'Feuille 1';

// AI Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'eventnex.sn@gmail.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'eventnex.sn@gmail.com';

const base64url = (input) => {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const normalizePrivateKey = (key) => {
  if (!key) return key;
  return key.replace(/\\n/g, '\n').trim();
};

const buildJwt = () => {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Missing Google service account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.');
  }

  const normalizedPrivateKey = normalizePrivateKey(SERVICE_ACCOUNT_PRIVATE_KEY);

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureBase = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureBase);
  signer.end();

  const signature = signer.sign(normalizedPrivateKey, 'base64');
  const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signatureBase}.${encodedSignature}`;
};

const getAccessToken = async () => {
  const jwt = buildJwt();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Google OAuth error: ${result.error_description || JSON.stringify(result)}`);
  }
  return result.access_token;
};

const normalizeValue = (value, alternate) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(' | ');
  if (typeof value === 'string' && value.includes('Autre') && alternate) {
    return value.replace('Autre', `Autre (${alternate})`);
  }
  return value;
};

// AI Scoring Function
const generateAIPrompt = (payload, isJson = true) => {
  const getVal = (val, alternate) => {
    if (!val) return "";
    if (typeof val === 'string' && val.includes('Autre') && alternate) {
      return val.replace('Autre', `Autre (${alternate})`);
    }
    return val;
  };

  if (isJson) {
    return `Tu es l'unité stratégique d'Eventnex. Tu dois noter la MATURITÉ OPÉRATIONNELLE de ce prospect, PAS son potentiel commercial.

    RÈGLE DE NOTATION STRICTE (score de 0 à 100, en partant de 50 puis en appliquant ces ajustements) :
    - Résultats actuels "Critiques": -25 points | "Médiocres": -15 points | "Moyens": -5 points | "Corrects": +15 points
    - Procédures "Gestion de crise au fur et à mesure": -15 points | "Tradition orale uniquement": -10 points | "Oui, procédures strictes et écrites": +15 points
    - Archivage "Aucune mémoire conservée": -10 points
    - Gestion des équipes "Attribution informelle (à l'oral)": -10 points
    - Contrôle d'entrée manuel (papier, liste imprimée): -5 points
    - Un score final supérieur à 70 EXIGE au moins deux indicateurs positifs ci-dessus. Sans indicateur positif, le score ne peut pas dépasser 45.
    Le score reflète l'état ACTUEL du prospect, pas son potentiel après avoir adopté Eventnex.

    Chaque élément du SWOT doit être un fait distinct : ne jamais reformuler la même faiblesse à la fois en "Force" et en "Faiblesse".

    IMPORTANT: Dans "justification", donne une analyse qualitative fluide, JAMAIS de calcul chiffré ni de liste de points déduits (pas de "-15 points", pas d'arithmétique visible). Cette justification est un texte destiné à un usage interne, elle doit rester professionnelle et synthétique sans exposer la mécanique de notation.

    Génère aussi un champ "message_client": un message court, chaleureux et professionnel destiné DIRECTEMENT au prospect. Ce message ne doit JAMAIS contenir de chiffres (pas de score, pas de ROI, pas de pourcentage, pas de montant en FCFA) ni mentionner de mécanique de notation. Il doit se limiter à reconnaître les priorités exprimées par le prospect et annoncer que l'équipe prépare une démonstration personnalisée.

    Les projections financières ("projection_financiere") et "conseil_vente" sont un usage STRICTEMENT INTERNE pour l'équipe commerciale — précise-le mentalement mais ne les répète pas dans "message_client".

    RÈGLE STRICTE SUR LES PROJECTIONS FINANCIÈRES: tu ne connais PAS les dépenses réelles du prospect (aucune facture, aucun coût opérationnel détaillé ne t'a été fourni). N'invente JAMAIS un montant en FCFA précis. Base "reduction_couts" et "augmentation_revenus" UNIQUEMENT sur le "Budget déclaré" fourni dans les données ci-dessous, exprimé en pourcentage de ce budget, jamais en montant absolu isolé. Si le budget déclaré est "non renseigné", écris "Non calculable — budget non renseigné" pour "reduction_couts" et n'avance aucun montant. Le "roi" doit toujours porter la mention "(estimation indicative, non contractuelle)".

    RÉPONDS EN JSON VALIDE AVEC ANALYSE COMPLÈTE:
    {
      "score": 85,
      "justification": "Analyse qualitative interne, sans calcul chiffré",
      "message_client": "Message chaleureux sans aucun chiffre, destiné au prospect",
      "conseil_vente": "Stratégie prioritaire avec ROI estimé (usage interne uniquement)",
      "swot": {
        "forces": ["Analyse force 1", "Analyse force 2"],
        "faiblesses": ["Analyse faiblesse 1", "Analyse faiblesse 2"],
        "opportunites": ["Analyse opportunité 1", "Analyse opportunité 2"],
        "menaces": ["Analyse menace 1", "Analyse menace 2"]
      },
      "projection_financiere": {
        "roi": "280%",
        "reduction_couts": "120000 FCFA/mois",
        "augmentation_revenus": "30%"
      },
      "recommandations": [
        "Action 1 avec timeline",
        "Action 2 avec KPI",
        "Action 3 avec responsable"
      ]
    }
    DONNÉES COMPLÈTES: Entreprise: ${payload.nom_entite}, Secteur: ${payload.statut_entite}, Taille: ${payload.taille_organisation}, Budget déclaré: ${payload.budget || 'non renseigné'}, Priorité: ${getVal(payload.diagnostic_priorite, payload.diagnostic_priorite_autre)}, Résultats: ${payload.mesure_resultats}, Outils: ${getVal(payload.outils, payload.outils_autre)}, Problèmes: ${getVal(payload.problemes_billetterie, payload.problemes_billetterie_autre)}, Fréquence: ${getVal(payload.frequence, payload.frequence_autre)}, Participants: ${payload.nb_participants}, Archivage: ${getVal(payload.archivage, payload.archivage_autre)}, Intégrations: ${getVal(payload.integrations, payload.integrations_autre)}`;
  } else {
    return `Tu es le système d'intelligence stratégique d'Eventnex. Analyse complète avec méthodologie militaire et benchmark sectoriel.
    Ton analyse doit inclure:
    1. Positionnement stratégique actuel
    2. Benchmark concurrentiel Sénégal
    3. Projection financière détaillée
    4. Plan d'action priorisé avec timeline
    5. Indicateurs de performance clés

    DONNÉES STRATÉGIQUES:
    - Entreprise: ${payload.nom_entite} (${payload.taille_organisation} employés)
    - Secteur: ${payload.statut_entite} - ${payload.sous_statut}
    - Marché: Sénégal (croissance +12% en 2026)
    - Priorité: ${getVal(payload.diagnostic_priorite, payload.diagnostic_priorite_autre)}
    - Résultats: ${payload.mesure_resultats}
    - Outils: ${getVal(payload.outils, payload.outils_autre)}
    - Problèmes: ${getVal(payload.problemes_billetterie, payload.problemes_billetterie_autre)}
    - Fréquence: ${getVal(payload.frequence, payload.frequence_autre)}
    - Participants: ${payload.nb_participants}
    - Intégrations: ${getVal(payload.integrations, payload.integrations_autre)}
    - Archivage: ${getVal(payload.archivage, payload.archivage_autre)}

    RÉDIGE EN FRANÇAIS PROFESSIONNEL (Format Markdown):
    # ANALYSE STRATÉGIQUE: ${payload.nom_entite}
    ## Positionnement Actuel
    - Analyse détaillée position marché
    - Benchmark vs concurrents directs
    - Matrice SWOT complète

    ## Projection Financière
    - ROI estimé: 250-300%
    - Réduction coûts: 100-150K FCFA/mois
    - Augmentation revenus: 25-35%

    ## Recommandations Prioritaires
    1. Action 1: Migration digitale complète (Timeline: 30 jours)
    2. Action 2: Formation équipe (KPI: 100% adoption)
    3. Action 3: Intégration CRM (Responsable: ${payload.nom_prenom})

    ## Benchmark Sectoriel
    - Comparaison vs 3 concurrents directs
    - Analyse tendances marché Sénégal 2026-2027
    - Positionnement idéal pour ${payload.nom_entite}`;
  }
};

// AI API Call with Fallback
const callAI = async (prompt, isJson = true) => {
  let erreurGroq = "";
  let erreurGemini = "";

  try {
    return await callGroqAI(prompt, isJson);
  } catch (e) {
    erreurGroq = e.toString();
    try {
      return await callGeminiAI(prompt);
    } catch (e2) {
      erreurGemini = e2.toString();
      if (isJson) {
        return '{"score": 50, "justification": "Erreur système", "conseil_vente": "Analyse manuelle requise"}';
      }
      return `# ⚠️ ÉCHEC DE CONNEXION AU NOYAU IA\n\nImpossible de joindre les API.\n\n**Erreur Groq:** ${erreurGroq}\n\n**Erreur Gemini:** ${erreurGemini}`;
    }
  }
};

// Groq AI API Call
const callGroqAI = async (prompt, isJson = true) => {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {"role": "system", "content": isJson ? "Tu es un générateur JSON." : "Tu es un analyste de données militaire francophone."},
      {"role": "user", "content": prompt}
    ],
    temperature: isJson ? 0.1 : 0.3
  };

  if (isJson) {
    payload.response_format = { "type": "json_object" };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Groq a renvoyé: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// Gemini AI API Call
const callGeminiAI = async (prompt) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Gemini a renvoyé: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

// Brevo Email Function

const sendBrevoEmail = async (recipient, subject, textContent, attachments = []) => {
  if (!BREVO_API_KEY) {
    console.log('BREVO_API_KEY not configured, skipping email');
    return;
  }

  const url = "https://api.brevo.com/v3/smtp/email";
  const payload = {
    sender: { name: "Eventnex Data Core", email: SENDER_EMAIL },
    to: [{ email: recipient }],
    subject: subject,
    textContent: textContent
  };

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map(attach => ({
      name: attach.name,
      content: attach.content
    }));
    console.log('Brevo attachments:', JSON.stringify(payload.attachment, null, 2));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo Error: ${errorText}`);
  }

  return await response.json();
};

const buildRow = (payload, analyseScore = { score: 50 }) => {
  return [
    `EVT-${crypto.randomUUID().split('-')[0].toUpperCase()}`,
    new Date().toISOString(),
    payload.ip_address || 'Inconnue',
    payload.localisation_finale || 'Inconnue',
    normalizeValue(payload.statut_entite, payload.statut_autre),
    normalizeValue(payload.sous_statut, payload.sous_statut_autre),
    normalizeValue(payload.taille_organisation, payload.taille_organisation_autre),
    payload.nom_entite || '',
    payload.sous_entite || '',
    payload.nom_prenom || '',
    payload.fonction || '',
    payload.telephone ? `00221 ${payload.telephone}` : '',
    payload.email || '',
    `${analyseScore.score}%`,
    normalizeValue(payload.diagnostic_priorite, payload.diagnostic_priorite_autre),
    payload.historique_tentative || '',
    normalizeValue(payload.element_intouchable, payload.element_intouchable_autre),
    normalizeValue(payload.blocage_interne, payload.blocage_interne_autre),
    payload.mesure_resultats || '',
    payload.nb_participants || '',
    normalizeValue(payload.frequence, payload.frequence_autre),
    normalizeValue(payload.type_evenement, payload.type_evenement_autre),
    normalizeValue(payload.vente_billets, payload.vente_billets_autre),
    normalizeValue(payload.problemes_billetterie, payload.problemes_billetterie_autre),
    normalizeValue(payload.controle_entrees, payload.controle_entrees_autre),
    normalizeValue(payload.com_avant, payload.com_avant_autre),
    normalizeValue(payload.difficulte_com, payload.difficulte_com_autre),
    normalizeValue(payload.bilan, payload.bilan_autre),
    normalizeValue(payload.outils, payload.outils_autre),
    normalizeValue(payload.plannings, payload.plannings_autre),
    normalizeValue(payload.procedures, payload.procedures_autre),
    normalizeValue(payload.archivage, payload.archivage_autre),
    normalizeValue(payload.integrations, payload.integrations_autre),
    normalizeValue(payload.objectif, payload.objectif_autre),
    payload.date_demo || '',
    payload.heure_demo || '',
    payload.commentaires || '',
    payload.telemetrie_temps || 'Non mesuré',
  ];
};

const appendRowToSheet = async (token, values) => {
  if (!SHEET_ID) {
    throw new Error('Missing GOOGLE_SHEET_ID environment variable.');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(SHEET_TAB_NAME)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Sheets append error: ${JSON.stringify(result)}`);
  }
  return result;
};

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ result: 'error', error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    // Functions to calculate realistic values from form data
    const formatDate = (dateString) => {
      if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return 'Date à confirmer';
      }
      const [year, month, day] = dateString.split('-');
      const currentYear = new Date().getFullYear();
      if (Number(year) < currentYear || Number(year) > currentYear + 5) {
        return 'Date à confirmer';
      }
      return `${day}/${month}/${year}`;
    };

    const calculateRealisticScore = (payload) => {
      let score = 30;
      if (payload.mesure_resultats === 'Corrects (Mais nous voulons passer au niveau supérieur)') score += 20;
      if (payload.mesure_resultats === 'Moyens (On survit mais sans optimiser)') score += 10;
      if (payload.procedures === 'Oui, procédures strictes et écrites') score += 15;
      if (payload.blocage_interne === 'Le manque d\'outils technologiques adaptés') score += 10;
      if (payload.mesure_resultats === 'Critiques (Pertes financières / Risques élevés)') score -= 10;
      if (payload.mesure_resultats === 'Médiocres (Beaucoup de frictions et de stress)') score -= 5;
      if (payload.procedures === 'Gestion de crise au fur et à mesure') score -= 15;
      return Math.min(90, Math.max(10, score));
    };

    const generateRealisticInsights = (payload, score) => {
      const insights = [];
      if (payload.diagnostic_priorite) insights.push(`Priorité: ${payload.diagnostic_priorite}`);
      if (payload.mesure_resultats) insights.push(`Performance: ${payload.mesure_resultats}`);
      if (score >= 70) insights.push('Organisation bien structurée');
      else if (score >= 50) insights.push('Opportunités d\'amélioration');
      else insights.push('Besoin d\'optimisation urgent');
      return insights.join(' | ');
    };

    const generateRealisticSWOT = (payload) => {
      const forces = ['Expertise sectorielle'];
      const faiblesses = [];
      const opportunites = ['Automatisation des processus'];
      const menaces = [];
      if (payload.problemes_billetterie) {
        const problems = Array.isArray(payload.problemes_billetterie) ? payload.problemes_billetterie : [payload.problemes_billetterie];
        if (problems.includes('Files d\'attente interminables')) faiblesses.push('Gestion inefficace');
        if (problems.includes('Taux de fraude / Faux billets')) menaces.push('Risques financiers');
      }
      return { forces, faiblesses, opportunites, menaces };
    };

    const generateRealisticFinancials = (score, payload) => {
      const budgetRanges = {
        "Moins de 100 000 FCFA/An": 75000,
        "100 000 - 500 000 FCFA/An": 300000,
        "500 000 - 1 000 000 FCFA/An": 750000,
        "Plus de 1 000 000 FCFA/An": 1500000
      };
      const budgetAnnuel = budgetRanges[payload.budget] || null;

      const reductionPct = Math.max(5, Math.min(25, 30 - score * 0.2));
      const roiPct = Math.max(50, Math.min(200, 250 - score * 1.5));

      return {
        roi: `${Math.round(roiPct)}% (estimation indicative, non contractuelle)`,
        reduction_couts: budgetAnnuel
          ? `~${Math.round(budgetAnnuel * reductionPct / 100 / 12).toLocaleString()} FCFA/mois (estimé sur ${reductionPct.toFixed(0)}% du budget annuel déclaré: ${payload.budget})`
          : "Non calculable — budget non renseigné",
        augmentation_revenus: `${reductionPct.toFixed(0)}% (estimation basée sur la fréquence et le volume de participants déclarés: ${payload.frequence || 'non renseigné'}, ${payload.nb_participants || 'non renseigné'} participants)`
      };
    };

    const generateRealisticRecommandations = (payload) => {
      const recs = [];
      if (payload.blocage_interne === "Le manque d'outils technologiques adaptés") {
        recs.push("Déployer un outil digital de billetterie pour fluidifier les ventes (Timeline: 15 jours)");
      }
      if (payload.problemes_billetterie && payload.problemes_billetterie.includes('Files d\'attente interminables')) {
        recs.push("Mettre en place un contrôle d'accès digital pour réduire les files d'attente");
      }
      if (payload.integrations && payload.integrations.includes('Connexion à un CRM existant')) {
        recs.push(`Intégrer Eventnex au CRM existant (Responsable: ${payload.nom_prenom})`);
      }
      while (recs.length < 3) recs.push("Audit approfondi à planifier avec l'équipe Eventnex");
      return recs.slice(0, 3);
    };

    const generateRealisticConseil = (payload, score) => {
      if (score < 40) return "Situation critique : intervention rapide recommandée sur la billetterie et le suivi financier.";
      if (score < 70) return "Des gains rapides sont possibles en digitalisant les points de friction identifiés.";
      return "Structure globalement saine : l'accent peut être mis sur le pilotage data-driven.";
    };

    const generateRealisticClientMessage = (payload) => {
      const priority = payload.diagnostic_priorite || 'vos priorités';
      const entity = payload.nom_entite || 'votre organisation';
      return `Merci d'avoir partagé les priorités de ${entity}. Nous avons bien noté votre besoin autour de "${priority}" et les points de friction identifiés. Notre équipe prépare une démonstration personnalisée pour répondre concrètement à ces enjeux.`;
    };

    // AI Scoring Pass 1 - with enhanced error handling and data validation
    let analyseScore = {
      score: 50,
      justification: "Analyse en cours - données en cours de traitement",
      conseil_vente: "Notre équipe vous contactera pour une analyse approfondie",
      message_client: "",
      swot: {
        forces: ["À déterminer lors de l'audit complet"],
        faiblesses: ["À déterminer lors de l'audit complet"],
        opportunites: ["À déterminer lors de l'audit complet"],
        menaces: ["À déterminer lors de l'audit complet"]
      },
      projection_financiere: {
        roi: "En cours d'évaluation",
        reduction_couts: "En cours d'évaluation",
        augmentation_revenus: "En cours d'évaluation"
      },
      recommandations: [
        "Analyse complète en cours par notre équipe",
        "Préparation de recommandations stratégiques personnalisées",
        "Plan d'action détaillé à venir"
      ]
    };

    let aiTechnicalFailure = false;

    try {
      // Validate payload has minimum required data for AI analysis
      const requiredFields = [
        'statut_entite', 'nom_entite', 'nom_prenom',
        'diagnostic_priorite', 'mesure_resultats'
      ];
      const hasRequiredData = requiredFields.every(field => payload[field]);

      if (!hasRequiredData) {
        aiTechnicalFailure = true;
        console.log("Données insuffisantes pour l'analyse IA, fallback déterministe activé.");
      }

      if (hasRequiredData) {
        const scoringPrompt = generateAIPrompt(payload, true);
        const rawScoreResponse = await callAI(scoringPrompt, true);
        const cleanJson = rawScoreResponse.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
          const parsedScore = JSON.parse(cleanJson);
          // Merge AI results with our defaults to ensure all fields exist
          analyseScore = {
            ...analyseScore,
            ...parsedScore,
            swot: {
              ...analyseScore.swot,
              ...parsedScore.swot
            },
            projection_financiere: {
              ...analyseScore.projection_financiere,
              ...parsedScore.projection_financiere
            },
            message_client: parsedScore.message_client || analyseScore.message_client
          };

          // Ensure recommendations array exists and has at least 3 items
          if (parsedScore.recommandations && parsedScore.recommandations.length > 0) {
            analyseScore.recommandations = parsedScore.recommandations.slice(0, 3);
          }
        } catch (parseError) {
          console.log("Erreur de parsing JSON IA:", parseError.toString());
          aiTechnicalFailure = true;
        }
      }
    } catch (err) {
      console.log("Erreur IA : " + err.toString());
      aiTechnicalFailure = true;
    }

    // Garde-fou unifié : détecte soit un échec technique de l'IA, soit un score incohérent
    const deterministicScore = calculateRealisticScore(payload);
    const aiFailedTechnically = aiTechnicalFailure || analyseScore.justification.includes('Erreur') || typeof analyseScore.score !== 'number';

    let scoreEcartSuspect = false;
    if (!aiFailedTechnically && typeof analyseScore.score === 'number') {
      const ecart = Math.abs(analyseScore.score - deterministicScore);
      if (ecart > 25) {
        scoreEcartSuspect = true;
        console.log(`Écart suspect détecté: IA=${analyseScore.score}%, Déterministe=${deterministicScore}%`);
      }
    }

    // Un seul indicateur qui décide de TOUT le contenu envoyé (score, SWOT, insights, recommandations, conseil)
    const useRealisticFallback = aiFailedTechnically || scoreEcartSuspect;

    const finalScore = useRealisticFallback ? deterministicScore : analyseScore.score;
    const finalInsights = useRealisticFallback ? generateRealisticInsights(payload, finalScore) : analyseScore.justification;
    const finalSwot = useRealisticFallback ? generateRealisticSWOT(payload) : analyseScore.swot;
    const finalFinancials = useRealisticFallback ? generateRealisticFinancials(finalScore, payload) : analyseScore.projection_financiere;
    const finalRecommandations = useRealisticFallback ? generateRealisticRecommandations(payload) : (analyseScore.recommandations || []);
    const finalConseil = useRealisticFallback ? generateRealisticConseil(payload, finalScore) : analyseScore.conseil_vente;
    const finalClientMessage = useRealisticFallback ? generateRealisticClientMessage(payload) : (analyseScore.message_client || generateRealisticClientMessage(payload));

    const accessToken = await getAccessToken();
    const rowData = buildRow(payload, { ...analyseScore, score: finalScore });
    await appendRowToSheet(accessToken, rowData);

    // Send strategic sales email (PDF removed, focused on AI insights)
    const salesSubject = `STRATÉGIE COMMERCIALE: ${payload.nom_entite} (Score: ${finalScore}%)`;

    // Create comprehensive sales email with real calculated data
    const salesContent = `FICHE STRATÉGIQUE COMMERCIALE - ${payload.nom_entite}
${scoreEcartSuspect ? '\n⚠️ ALERTE: Écart important entre le score IA et le score calculé sur les données réelles. Analyse complète (score, SWOT, recommandations) basculée automatiquement vers le calcul déterministe.\n' : ''}${aiFailedTechnically ? '\n⚠️ ALERTE: L\'IA n\'a pas répondu correctement. Analyse complète générée par calcul déterministe (fallback).\n' : ''}
ANALYSE RAPIDE:
- Score de Maturité: ${finalScore}%
- Secteur: ${payload.statut_entite} / ${payload.sous_statut}
- Taille: ${payload.taille_organisation}
- Responsable: ${payload.nom_prenom} (${payload.fonction})

INSIGHTS CLÉS:
${finalInsights}

ANALYSE SWOT:
Forces: ${finalSwot.forces.join(', ')}
Faiblesses: ${finalSwot.faiblesses.join(', ')}
Opportunités: ${finalSwot.opportunites.join(', ')}
Menaces: ${finalSwot.menaces.join(', ')}

PROJECTIONS FINANCIÈRES (estimation indicative sectorielle, non calculée à partir des dépenses réelles du prospect):
- ROI Estimé: ${finalFinancials.roi}
- Réduction Coûts: ${finalFinancials.reduction_couts}
- Augmentation Revenus: ${finalFinancials.augmentation_revenus}

CONSEIL COMMERCIAL (INTERNE - ne pas partager tel quel avec le client):
${finalConseil}

RECOMMANDATIONS PRIORITAIRES:
${finalRecommandations.map((rec, i) => `${i+1}. ${rec}`).join('\n')}

PROCHAINE ÉTAPE:
Démonstration prévue: ${formatDate(payload.date_demo)} à ${payload.heure_demo || 'Heure à confirmer'}

TEMPS DE REMPLISSAGE:
${payload.telemetrie_temps || 'Non mesuré'}

CONTACT:
${payload.nom_prenom} - ${payload.email}
Tél: ${payload.telephone}

CONTEXTE SUPPLÉMENTAIRE:
- Priorité client: ${payload.diagnostic_priorite}
- Résultats actuels: ${payload.mesure_resultats}
- Outils actuels: ${payload.outils}
- Problèmes identifiés: ${payload.problemes_billetterie}
- Intégrations nécessaires: ${payload.integrations}

ACTION REQUise:
Préparer démonstration ciblée sur:
1. ${finalRecommandations[0] || 'Solution digitale complète'}
2. ${finalRecommandations[1] || 'Intégration CRM'}
3. ${finalRecommandations[2] || 'Formation équipe'}

---
Généré automatiquement par Eventnex AI - ${new Date().toLocaleString()}`;

    try {
      await sendBrevoEmail(ADMIN_EMAIL, salesSubject, salesContent, []);
      console.log('Strategic sales email sent successfully');
    } catch (emailError) {
      console.error('Sales email error:', emailError.message);
    }

    // Send confirmation email to user with summary, time and score
    try {
      const userSubject = `Confirmation de votre audit Eventnex`;
      const userContent = `Bonjour ${payload.nom_prenom},

Merci d'avoir complété l'audit stratégique Eventnex pour ${payload.nom_entite}. Voici votre récapitulatif personnel:

${finalClientMessage}

VOS PRIORITÉS IDENTIFIÉES:
- ${payload.diagnostic_priorite}
- ${Array.isArray(payload.problemes_billetterie) ? payload.problemes_billetterie.join(', ') : payload.problemes_billetterie}

PROCHAINE ÉTAPE:
Votre démonstration est prévue le ${formatDate(payload.date_demo)} à ${payload.heure_demo || 'Heure à confirmer'}

CONTACT SUPPORT:
Équipe Eventnex - eventnex.sn@gmail.com
+221 77 123 45 67

Merci de faire confiance à Eventnex pour optimiser votre gestion événementielle!

---
Généré automatiquement par Eventnex AI - ${new Date().toLocaleString()}`;

      await sendBrevoEmail(payload.email, userSubject, userContent, []);
      console.log('User confirmation email sent successfully');
    } catch (userEmailError) {
      console.error('User confirmation email error:', userEmailError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ result: 'success' }),
    };
  } catch (error) {
    console.error('submitForm error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ result: 'error', error: error.message || String(error) }),
    };
  }
};
