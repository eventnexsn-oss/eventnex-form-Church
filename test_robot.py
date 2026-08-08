from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# --- CONFIGURATION DU NAVIGATEUR ---
options = webdriver.ChromeOptions()
options.add_experimental_option("detach", True)
# Pré-autoriser les permissions de géolocalisation
options.add_experimental_option("prefs", {
    "profile.default_content_setting_values.geolocation": 1,  # 1 = autoriser, 2 = bloquer
    "profile.managed_default_content_settings.geolocation": 1
})
driver = webdriver.Chrome(options=options)

driver.get("http://localhost:8888/") 
driver.maximize_window()
time.sleep(3)  # Augmentation du temps d'attente initial pour le chargement complet

# --- FONCTIONS UTILES ---
def click_next():
    # Attendre que le bouton soit visible et cliquable
    try:
        btn = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.ID, "next-step-btn"))
        )
        # Essayer d'abord un clic normal
        try:
            btn.click()
        except:
            # Si le clic normal échoue, utiliser JavaScript
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
            driver.execute_script("arguments[0].click();", btn)
        print("Bouton 'Suivant' cliqué avec succès")
        time.sleep(1.5)  # Temps d'attente augmenté pour la transition
    except Exception as e:
        print(f"❌ Impossible de cliquer sur le bouton Suivant : {e}")
        raise

def check_option(name, value):
    # Attendre que l'élément soit visible et cliquable
    element = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, f"input[name='{name}'][value=\"{value}\"]"))
    )
    driver.execute_script("arguments[0].click();", element)
    time.sleep(0.3)  # Petit délai pour la mise à jour de l'interface

# ==========================================
# EXÉCUTION DU PARCOURS UTILISATEUR
# ==========================================

try:
    print("Démarrage du test automatisé CRM Eventnex...")

    # Attendre que le premier élément soit disponible
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.NAME, "statut_entite"))
    )
    print("Page chargée avec succès, début du test...")

    # ÉTAPE 1 : IDENTIFICATION
    statut_select = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.NAME, "statut_entite"))
    )
    select_obj = Select(statut_select)
    select_obj.select_by_value("Entreprises")
    print("Statut sélectionné: Entreprises")

    # Attendre que le sous-statut soit visible (il est initialement caché)
    time.sleep(1) # Temps augmenté pour permettre l'animation CSS

    sous_statut_select = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.NAME, "sous_statut"))
    )
    Select(sous_statut_select).select_by_value("PME")
    print("Sous-statut sélectionné: PME")

    # Attendre que le champ taille d'organisation soit visible et le sélectionner
    time.sleep(0.5)  # Petit délai pour permettre l'affichage
    try:
        taille_select = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.NAME, "taille_organisation"))
        )
        Select(taille_select).select_by_value("11-50")
        print("Taille d'organisation sélectionnée: 11-50 collaborateurs")
    except:
        print("Champ taille d'organisation non trouvé ou non visible")

    driver.find_element(By.NAME, "nom_entite").send_keys("TechCorp Sénégal")
    driver.find_element(By.NAME, "sous_entite").send_keys("Direction Marketing")
    driver.find_element(By.NAME, "nom_prenom").send_keys("Klyde Jamal")
    Select(driver.find_element(By.NAME, "fonction")).select_by_value("Direction / Présidence")
    # Le numéro doit faire 9 chiffres sans le +221
    driver.find_element(By.NAME, "telephone").send_keys("771234567")
    # Ajout de l'adresse complète pour le géomarketing
    # Attendre que le champ adresse soit visible et cliquable
    adresse_input = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.NAME, "adresse"))
    )

    # Cliquer sur le champ pour déclencher la triangulation GPS
    adresse_input.click()
    time.sleep(2)  # Attendre que la triangulation GPS se termine

    # Vérifier si le champ a été rempli automatiquement par GPS
    current_address = adresse_input.get_attribute("value")
    if current_address and len(current_address) > 10:  # Si GPS a rempli le champ
        print(f"Adresse automatiquement remplie par GPS: {current_address}")
    else:  # Sinon, remplir manuellement
        adresse_input.send_keys("123 Rue Principal, Dakar, Sénégal")
        print("Adresse remplie manuellement")
    driver.find_element(By.NAME, "email").send_keys("jaimalklyde@gmail.com")
    click_next()

    # ÉTAPE 2 : CADRAGE (SPIN)
    check_option("diagnostic_priorite", "Sécuriser les flux financiers et la billetterie")
    check_option("historique_tentative", "Oui, avec un succès partiel")
    check_option("element_intouchable", "La hiérarchie et les processus de validation internes")
    check_option("blocage_interne", "Le manque d'outils technologiques adaptés")
    check_option("mesure_resultats", "Médiocres (Beaucoup de frictions et de stress)")

    # Nouveaux champs Q14 et Q15
    check_option("budget", "500 000 - 1 000 000 FCFA/An")
    check_option("decideurs[]", "Direction / Comité de direction")

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
    check_option("integrations[]", "Connexion à un CRM existant")
    check_option("objectif[]", "Sécuriser les recettes financières à 100%")
    click_next()

    # ÉTAPE 6 : DÉMO
    driver.find_element(By.NAME, "date_demo").send_keys("2026-07-15")
    # Heure forcée entre 16:00 et 21:30
    driver.find_element(By.NAME, "heure_demo").send_keys("1730")
    driver.find_element(By.NAME, "commentaires").send_keys("Ceci est un audit automatisé généré par Selenium.")
    click_next()

    # ÉTAPE 7 : RÉCAPITULATIF ET SOUMISSION
    print("Moteur de validation atteint. Préparation de l'envoi...")
    submit_btn = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.ID, "submit-form-btn"))
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)

    print("Attente visuelle...")
    time.sleep(3)

    # Essayer d'abord un clic normal, puis JavaScript si nécessaire
    try:
        submit_btn.click()
    except:
        driver.execute_script("arguments[0].click();", submit_btn)

    print("Formulaire soumis avec succès!")
    print("Test terminé ! Les données sont parties vers l'orchestrateur Apps Script.")

except Exception as e:
    print(f"❌ Erreur critique lors de l'exécution : {e}")
    print("Conseil: Vérifiez que le serveur local est bien démarré et accessible à http://localhost:8888/")
    print("Assurez-vous aussi que tous les champs du formulaire sont visibles et non masqués par d'autres éléments")