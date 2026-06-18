from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# --- CONFIGURATION DU NAVIGATEUR ---
options = webdriver.ChromeOptions()
options.add_experimental_option("detach", True) # Garde le navigateur ouvert à la fin
driver = webdriver.Chrome(options=options)

# Aller sur votre site
driver.get("https://predemonstration.netlify.app/") 
driver.maximize_window()
time.sleep(2) # Laisse le temps à l'animation de la page de se terminer

# --- FONCTIONS UTILES ---
def click_next():
    # Clique sur le bouton "Suivant" et attend une demi-seconde
    btn = driver.find_element(By.ID, "next-step-btn")
    driver.execute_script("arguments[0].click();", btn)
    time.sleep(0.5)

def check_option(name, value):
    # Coche un bouton radio ou une checkbox de manière forcée (évite les bugs d'affichage CSS)
    element = driver.find_element(By.CSS_SELECTOR, f"input[name='{name}'][value=\"{value}\"]")
    driver.execute_script("arguments[0].click();", element)

# ==========================================
# EXÉCUTION DU PARCOURS UTILISATEUR
# ==========================================

try:
    print("Démarrage du test automatisé Eventnex...")

    # ÉTAPE 1 : Informations générales
    driver.find_element(By.NAME, "nom_eglise").send_keys("Église Test Automation")
    driver.find_element(By.NAME, "nom_responsable").send_keys("Robot Testeur")
    Select(driver.find_element(By.NAME, "fonction")).select_by_value("Responsable événementiel")
    driver.find_element(By.NAME, "telephone").send_keys("+221771234567")
    driver.find_element(By.NAME, "email").send_keys("jaimalklyde@gmail.com")
    Select(driver.find_element(By.NAME, "ville")).select_by_value("Dakar")
    click_next()

    # ÉTAPE 2 : Vos événements
    check_option("nb_participants", "100 – 300")
    check_option("frequence", "1 fois par mois")
    click_next()

    # ÉTAPE 3 : Billetterie et paiements
    check_option("vente_billets[]", "Sur place le jour J")
    check_option("type_evenement", "Payants")
    check_option("problemes_billetterie[]", "Files d'attente trop longues")
    click_next()

    # ÉTAPE 4 : Contrôle d'accès et logistique
    check_option("controle_entrees[]", "Tickets papier")
    check_option("internet[]", "Pas de Wi-Fi, uniquement la 4G")
    check_option("membres_entrees", "3 – 4")
    click_next()

    # ÉTAPE 5 : Communication et bilan
    check_option("com_avant[]", "WhatsApp")
    check_option("difficulte_com[]", "Messages non lus sur WhatsApp")
    check_option("bilan[]", "Calcul des recettes sur Excel")
    click_next()

    # ÉTAPE 6 : Gouvernance et outils de travail
    check_option("outils[]", "Excel / Google Sheets")
    check_option("plannings[]", "De manière informelle (à l'oral)")
    check_option("procedures", "Non, tout est fait au fur et à mesure")
    check_option("archivage[]", "Aucun archivage")
    click_next()

    # ÉTAPE 7 : Vos attentes
    check_option("difficultes_actuelles[]", "Temps de préparation trop long")
    check_option("objectif[]", "Gagner du temps")
    click_next()

    # ÉTAPE 8 : Organisation de la démonstration
    check_option("lieu_demo", "Par Google Meet")
    # Pour le champ date-heure, on envoie directement les touches
    driver.find_element(By.NAME, "disponibilites").send_keys("15072026", "\t", "1430") 
    check_option("accompagnement", "Oui, aide à la création des événements")
    click_next()

    # ÉTAPE 9 : Informations complémentaires (Le consentement est déjà checked par défaut dans votre HTML)
    driver.find_element(By.NAME, "commentaires").send_keys("Ceci est un test automatisé généré par Selenium.")
    click_next()

    # ÉTAPE 10 : Récapitulatif et Soumission
    print("Formulaire rempli. Validation en cours...")
    time.sleep(1) # Laisse le temps de générer le récapitulatif visuel
    
    # Clique sur le bouton de soumission final
    submit_btn = driver.find_element(By.ID, "submit-form-btn")
    driver.execute_script("arguments[0].click();", submit_btn)
    
    print("Test terminé avec succès ! Vérifiez votre base de données et vos e-mails.")

except Exception as e:
    print(f"❌ Erreur lors du test : {e}")