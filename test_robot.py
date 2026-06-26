from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# --- CONFIGURATION DU NAVIGATEUR ---
options = webdriver.ChromeOptions()
options.add_experimental_option("detach", True)
driver = webdriver.Chrome(options=options)

driver.get("https://predemonstration.netlify.app/") 
driver.maximize_window()
time.sleep(2)

# --- FONCTIONS UTILES ---
def click_next():
    btn = driver.find_element(By.ID, "next-step-btn")
    driver.execute_script("arguments[0].click();", btn)
    time.sleep(0.5)

def check_option(name, value):
    element = driver.find_element(By.CSS_SELECTOR, f"input[name='{name}'][value=\"{value}\"]")
    driver.execute_script("arguments[0].click();", element)

# ==========================================
# EXÉCUTION DU PARCOURS UTILISATEUR
# ==========================================

try:
    print("Démarrage du test automatisé CRM Eventnex...")

    # ÉTAPE 1 : IDENTIFICATION
    Select(driver.find_element(By.NAME, "statut_entite")).select_by_value("Entreprises")
    time.sleep(0.5) # Laisse le temps au DOM d'afficher le sous-statut
    Select(driver.find_element(By.NAME, "sous_statut")).select_by_value("PME")
    driver.find_element(By.NAME, "nom_entite").send_keys("TechCorp Sénégal")
    driver.find_element(By.NAME, "sous_entite").send_keys("Direction Marketing")
    driver.find_element(By.NAME, "nom_prenom").send_keys("Klyde Jamal")
    Select(driver.find_element(By.NAME, "fonction")).select_by_value("Direction / Présidence")
    # Le numéro doit faire 9 chiffres sans le +221
    driver.find_element(By.NAME, "telephone").send_keys("771234567")
    driver.find_element(By.NAME, "email").send_keys("jaimalklyde@gmail.com")
    click_next()

    # ÉTAPE 2 : CADRAGE (SPIN)
    check_option("diagnostic_priorite", "Sécuriser les flux financiers et la billetterie")
    check_option("historique_tentative", "Oui, avec un succès partiel")
    check_option("element_intouchable", "La hiérarchie et les processus de validation internes")
    check_option("blocage_interne", "Le manque d'outils technologiques adaptés")
    check_option("mesure_resultats", "Médiocres (Beaucoup de frictions et de stress)")
    click_next()

    # ÉTAPE 3 : ÉVÉNEMENTS
    check_option("nb_participants", "100 – 300")
    check_option("frequence", "Trimestriel / Semestriel")
    check_option("type_evenement", "Totalement payants")
    check_option("vente_billets[]", "Sur place le jour J")
    check_option("problemes_billetterie[]", "Files d'attente interminables")
    click_next()

    # ÉTAPE 4 : LOGISTIQUE
    check_option("controle_entrees[]", "Déchirure de tickets papier")
    check_option("com_avant[]", "Emailing")
    check_option("difficulte_com[]", "Base de données contacts obsolète ou inexistante")
    check_option("bilan[]", "Ressaisie et formules sur Excel")
    click_next()

    # ÉTAPE 5 : ORGANISATION
    check_option("outils[]", "Excel / Sheets")
    check_option("plannings[]", "Attribution informelle (à l'oral)")
    check_option("procedures", "Gestion de crise au fur et à mesure")
    check_option("archivage[]", "Aucune mémoire conservée")
    check_option("objectif[]", "Sécuriser les recettes financières à 100%")
    click_next()

    # ÉTAPE 6 : DÉMO
    driver.find_element(By.NAME, "date_demo").send_keys("15072026")
    # Heure forcée entre 16:00 et 21:30
    driver.find_element(By.NAME, "heure_demo").send_keys("1730")
    driver.find_element(By.NAME, "commentaires").send_keys("Ceci est un audit automatisé généré par Selenium.")
    click_next()

    # ÉTAPE 7 : RÉCAPITULATIF ET SOUMISSION
    print("Moteur de validation atteint. Préparation de l'envoi...")
    submit_btn = driver.find_element(By.ID, "submit-form-btn")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)
    
    print("Attente visuelle...")
    time.sleep(3) 
    
    driver.execute_script("arguments[0].click();", submit_btn)
    print("Test terminé ! Les données sont parties vers l'orchestrateur Apps Script.")

except Exception as e:
    print(f"❌ Erreur critique lors de l'exécution : {e}")