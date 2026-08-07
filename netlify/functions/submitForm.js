const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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
    return `Tu es l'unité stratégique d'Eventnex. Analyse approfondie ce lead avec méthodologie SWOT et projection financière.
    RÉPONDS EN JSON VALIDE AVEC ANALYSE COMPLÈTE:
    {
      "score": 85,
      "justification": "Analyse détaillée avec données contextuelles",
      "conseil_vente": "Stratégie prioritaire avec ROI estimé",
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
    DONNÉES COMPLÈTES: Entreprise: ${payload.nom_entite}, Secteur: ${payload.statut_entite}, Taille: ${payload.taille_organisation}, Priorité: ${getVal(payload.diagnostic_priorite, payload.diagnostic_priorite_autre)}, Résultats: ${payload.mesure_resultats}, Outils: ${getVal(payload.outils, payload.outils_autre)}, Problèmes: ${getVal(payload.problemes_billetterie, payload.problemes_billetterie_autre)}, Fréquence: ${getVal(payload.frequence, payload.frequence_autre)}, Participants: ${payload.nb_participants}, Archivage: ${getVal(payload.archivage, payload.archivage_autre)}, Intégrations: ${getVal(payload.integrations, payload.integrations_autre)}`;
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
// PDF Generation Function
const generatePDF = async (payload, analyseScore) => {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    // Embed the font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw header
    page.drawText('EVENTNEX - ANALYSE STRATÉGIQUE APPROFONDIE', {
      x: 50,
      y: 800,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    // Draw client info
    page.drawText(`Client: ${payload.nom_entite}`, {
      x: 50,
      y: 770,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });

    page.drawText(`Responsable: ${payload.nom_prenom}`, {
      x: 50,
      y: 750,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: 730,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Draw AI score section
    const scoreColor = analyseScore.score >= 80 ? rgb(0.8, 0, 0) :
                      analyseScore.score >= 50 ? rgb(0.8, 0.5, 0) :
                      rgb(0, 0, 0.8);

    page.drawText('SCORE DE MATURITÉ EVENTNEX', {
      x: 50,
      y: 700,
      size: 16,
      font: boldFont,
      color: scoreColor
    });

    page.drawText(`${analyseScore.score}%`, {
      x: 50,
      y: 670,
      size: 48,
      font: boldFont,
      color: scoreColor
    });

    // Draw score description
    const scoreDescription = analyseScore.score >= 80 ? "Excellent - Système optimisé" :
                          analyseScore.score >= 60 ? "Bon - Améliorations possibles" :
                          analyseScore.score >= 40 ? "Critique - Intervention requise" :
                          "Urgent - Risque opérationnel élevé";
    page.drawText(`"${scoreDescription}"`, {
      x: 50,
      y: 640,
      size: 12,
      font: boldFont,
      color: scoreColor
    });

    // Draw key metrics
    page.drawText('MÉTRIQUES CLÉS', {
      x: 50,
      y: 600,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    const metrics = [
      `Priorité: ${payload.diagnostic_priorite || 'Non spécifié'}`,
      `Résultats Actuels: ${payload.mesure_resultats || 'Non spécifié'}`,
      `Outils: ${Array.isArray(payload.outils) ? payload.outils.join(', ') : payload.outils || 'Non spécifié'}`,
      `Problèmes: ${Array.isArray(payload.problemes_billetterie) ? payload.problemes_billetterie.join(', ') : payload.problemes_billetterie || 'Aucun'}`
    ];

    metrics.forEach((metric, index) => {
      page.drawText(`• ${metric}`, {
        x: 50,
        y: 580 - (index * 20),
        size: 10,
        font: font,
        color: rgb(0, 0, 0)
      });
    });

    // Draw footer
    page.drawText('Eventnex Data Core - Rapport Généré Automatiquement', {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return null;
  }
};

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

    // AI Scoring Pass 1
    let analyseScore = { score: 50, justification: "Erreur IA", conseil_vente: "Gérer manuellement." };

    try {
      const scoringPrompt = generateAIPrompt(payload, true);
      const rawScoreResponse = await callAI(scoringPrompt, true);
      const cleanJson = rawScoreResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      analyseScore = JSON.parse(cleanJson);
    } catch (err) {
      console.log("Erreur IA : " + err.toString());
    }

    const accessToken = await getAccessToken();
    const rowData = buildRow(payload, analyseScore);
    await appendRowToSheet(accessToken, rowData);

    // Send strategic sales email (PDF removed, focused on AI insights)
    const priorityEmoji = analyseScore.score >= 80 ? "🔥" : (analyseScore.score >= 50 ? "⚡" : "🧊");
    const salesSubject = `${priorityEmoji} STRATÉGIE COMMERCIALE: ${payload.nom_entite} (Score: ${analyseScore.score}%)`;

    // Create comprehensive sales email with all AI insights
    const salesContent = `🎯 FICHE STRATÉGIQUE COMMERCIALE - ${payload.nom_entite}

📊 ANALYSE RAPIDE:
- Score de Maturité: ${analyseScore.score}%
- Secteur: ${payload.statut_entite} / ${payload.sous_statut}
- Taille: ${payload.taille_organisation}
- Responsable: ${payload.nom_prenom} (${payload.fonction})

🔍 INSIGHTS CLÉS:
${analyseScore.justification}

💼 ANALYSE SWOT:
Forces: ${(analyseScore.swot?.forces || []).join(', ') || 'Non spécifié'}
Faiblesses: ${(analyseScore.swot?.faiblesses || []).join(', ') || 'Non spécifié'}
Opportunités: ${(analyseScore.swot?.opportunites || []).join(', ') || 'Non spécifié'}
Menaces: ${(analyseScore.swot?.menaces || []).join(', ') || 'Non spécifié'}

💰 PROJECTIONS FINANCIÈRES:
- ROI Estimé: ${analyseScore.projection_financiere?.roi || 'Calcul en cours'}%
- Réduction Coûts: ${analyseScore.projection_financiere?.reduction_couts || 'Calcul en cours'}
- Augmentation Revenus: ${analyseScore.projection_financiere?.augmentation_revenus || 'Calcul en cours'}

🎯 RECOMMANDATIONS PRIORITAIRES:
${(analyseScore.recommandations || []).map((rec, i) => `${i+1}. ${rec}`).join('\n')}

📅 PROCHAINE ÉTAPE:
Démonstration prévue: ${payload.date_demo} à ${payload.heure_demo}

📧 CONTACT:
${payload.nom_prenom} - ${payload.email}
Tél: ${payload.telephone}

🔗 CONTEXTE SUPPLÉMENTAIRE:
- Priorité client: ${payload.diagnostic_priorite}
- Résultats actuels: ${payload.mesure_resultats}
- Outils actuels: ${payload.outils}
- Problèmes identifiés: ${payload.problemes_billetterie}
- Intégrations nécessaires: ${payload.integrations}

⚡ ACTION REQUise:
Préparer démonstration ciblée sur:
1. ${(analyseScore.recommandations || [])[0] || 'Solution digitale complète'}
2. ${(analyseScore.recommandations || [])[1] || 'Intégration CRM'}
3. ${(analyseScore.recommandations || [])[2] || 'Formation équipe'}

---
Généré automatiquement par Eventnex AI - ${new Date().toLocaleString()}`;

    try {
      await sendBrevoEmail(ADMIN_EMAIL, salesSubject, salesContent, []);
      console.log('Strategic sales email sent successfully');
    } catch (emailError) {
      console.error('Sales email error:', emailError.message);
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
