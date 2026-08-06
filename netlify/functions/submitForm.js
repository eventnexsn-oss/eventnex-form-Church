const crypto = require('crypto');

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME || 'Feuille 1';

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

const buildRow = (payload) => {
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

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SHEET_ID)}/values/${encodeURIComponent(SHEET_TAB_NAME)}!A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
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
    const accessToken = await getAccessToken();
    const rowData = buildRow(payload);
    await appendRowToSheet(accessToken, rowData);

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
