document.addEventListener("DOMContentLoaded", () => {
    
    // RENSEIGNEZ VOTRE URL DE DÉPLOIEMENT GOOGLE APPS SCRIPT ICI (Orchestrateur CRM)
    const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyeLQum6GHCey7c0Ak1vCCS9jlW7Rc5UDW9Nzt6QnQHCO1bpCl1F69P31mZVE_4hzvKdg/exec";

    /* --- MODULE DE LOCALISATION & GPS --- */
    const displayLoc = document.getElementById('display_location');
    const inputIp = document.getElementById('ip_address');
    const inputLoc = document.getElementById('localisation_finale');
    const btnUpdate = document.getElementById('btn_update_location');

    // Détection silencieuse (IP)
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
            inputIp.value = data.ip || "Inconnue";
            if(inputLoc.value === "") {
                let ville = data.city ? data.city : "Position approximative";
                displayLoc.innerText = ville + ", " + (data.country_name || "");
                inputLoc.value = "[IP] " + ville;
            }
        })
        .catch(err => console.error("Erreur IP:", err));

    // Détection précise (GPS)
    if(btnUpdate) {
        btnUpdate.addEventListener("click", function() {
            if (!navigator.geolocation) {
                alert("Géolocalisation non supportée.");
                return;
            }
            displayLoc.innerText = "Recherche du signal GPS...";
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
                    
                    fetch(url)
                        .then(res => res.json())
                        .then(data => {
                            let adressePrecise = data.address.suburb || data.address.neighbourhood || data.address.road || data.address.city || "Adresse précise trouvée";
                            let ville = data.address.city || data.address.town || data.address.state || "";
                            let affichageFinal = adressePrecise + (ville ? ", " + ville : "");
                            
                            displayLoc.innerText = affichageFinal;
                            displayLoc.style.color = "#10B981"; 
                            btnUpdate.innerText = "Position validée ✓";
                            btnUpdate.style.color = "#94A3B8";
                            btnUpdate.style.textDecoration = "none";
                            inputLoc.value = "[GPS] " + affichageFinal;
                        })
                        .catch(() => {
                            displayLoc.innerText = `GPS (Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)})`;
                            inputLoc.value = `[GPS] Lat: ${lat}, Lon: ${lon}`;
                        });
                },
                function() {
                    alert("Accès GPS refusé ou signal faible.");
                    displayLoc.innerText = "Échec de la mise à jour.";
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    /* --- SIDEBAR & MENU --- */
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const menuOverlay = document.getElementById("menu-overlay");
    const sidebarMenu = document.getElementById("sidebar-menu");
    const sidebarCloseBtn = document.getElementById("sidebar-close-btn");

    function openSidebar() {
        sidebarMenu.classList.add("visible");
        menuOverlay.classList.add("visible");
        const bars = hamburgerBtn.querySelectorAll("div");
        bars[0].style.transform = "translateY(7px) rotate(45deg)";
        bars[1].style.opacity = "0";
        bars[2].style.transform = "translateY(-7px) rotate(-45deg)";
    }

    function closeSidebar() {
        sidebarMenu.classList.remove("visible");
        menuOverlay.classList.remove("visible");
        const bars = hamburgerBtn.querySelectorAll("div");
        bars[0].style.transform = "none";
        bars[1].style.opacity = "1";
        bars[2].style.transform = "none";
    }

    hamburgerBtn.addEventListener("click", () => {
        if (sidebarMenu.classList.contains("visible")) closeSidebar();
        else openSidebar();
    });

    sidebarCloseBtn.addEventListener("click", closeSidebar);
    menuOverlay.addEventListener("click", closeSidebar);

    /* --- CLUSTERISATION DYNAMIQUE (STATUTS) --- */
    const statutSelect = document.getElementById('statut_entite');
    const sousStatutContainer = document.getElementById('sous_statut_container');
    const sousStatutSelect = document.getElementById('sous_statut');

    const sousStatutsMap = {
        "Institutions religieuses": ["Paroisse", "Diocèse", "Département jeunesse", "Communauté", "Autre"],
        "Entreprises": ["Entreprise individuelle", "TPE", "PME", "Grande entreprise (SA)", "Autre"],
        "Organisations éducatives": ["École primaire/collège", "Lycée", "Université / Institut supérieur", "Centre de formation", "Autre"],
        "ONG": ["Locale", "Internationale", "Fondation", "Autre"],
        "Associations": ["Sportive", "Culturelle", "Caritative", "Autre"]
    };

    statutSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        sousStatutSelect.innerHTML = '<option value="" disabled selected></option>';
        if(sousStatutsMap[val]) {
            sousStatutsMap[val].forEach(opt => {
                sousStatutSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
            });
            sousStatutContainer.classList.remove('hidden');
            sousStatutSelect.setAttribute('required', 'required');
            sousStatutSelect.classList.add('required-field');
        } else {
            sousStatutContainer.classList.add('hidden');
            sousStatutSelect.removeAttribute('required');
            sousStatutSelect.classList.remove('required-field');
            sousStatutSelect.value = "";
        }
    });

    /* --- SYSTÈME DYNAMIQUE POUR LES OPTIONS "AUTRE" --- */
    document.querySelectorAll(".data-autre-trigger").forEach(selectElement => {
        selectElement.addEventListener("change", (e) => {
            const container = e.target.closest(".form-field");
            const subContainer = container.querySelector(".input-autre-container");
            if(!subContainer) return;
            const subInputField = subContainer.querySelector(".input-autre-field");

            if (e.target.value === "Autre") {
                subContainer.classList.remove("hidden");
                subInputField.setAttribute("required", "required");
                subInputField.focus();
            } else {
                subContainer.classList.add("hidden");
                subInputField.removeAttribute("required");
                subInputField.value = "";
            }
        });
    });

    document.querySelectorAll(".option-autre-checkbox").forEach(checkboxElement => {
        const groupContainer = checkboxElement.closest(".options-stack");
        const subContainer = groupContainer.querySelector(".input-autre-container");
        if(!subContainer) return;
        const subInputField = subContainer.querySelector(".input-autre-field");

        groupContainer.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(inputItem => {
            inputItem.addEventListener("change", () => {
                if (checkboxElement.checked) {
                    subContainer.classList.remove("hidden");
                    subInputField.setAttribute("required", "required");
                } else {
                    subContainer.classList.add("hidden");
                    subInputField.removeAttribute("required");
                    subInputField.value = "";
                }
            });
        });
    });

    /* --- GESTION DU RÉCAPITULATIF (ÉTAPE 7) --- */
    function generateSummary() {
        const summaryContainer = document.getElementById('summary-container');
        summaryContainer.innerHTML = '';
        const formData = new FormData(appForm);
        
        const labels = {
            statut_entite: "Statut", statut_autre: "Statut (Précision)", sous_statut: "Sous-statut", sous_statut_autre: "Sous-statut (Précision)",
            nom_entite: "Nom de l'entité", sous_entite: "Département", nom_prenom: "Nom et Prénom",
            fonction: "Fonction", fonction_autre: "Fonction (Précision)", telephone: "Téléphone", email: "Email professionnel",
            diagnostic_priorite: "Priorité absolue (One-Thing)", diagnostic_priorite_autre: "Priorité (Précision)",
            historique_tentative: "Tentatives de résolution passées", element_intouchable: "Élément intouchable", element_intouchable_autre: "Intouchable (Précision)",
            blocage_interne: "Blocage interne principal", blocage_interne_autre: "Blocage (Précision)", mesure_resultats: "Qualification des résultats",
            nb_participants: "Participants moyens", frequence: "Fréquence des événements", frequence_autre: "Fréquence (Précision)", 
            type_evenement: "Type d'événement", type_evenement_autre: "Type (Précision)", vente_billets: "Distribution de billets", vente_billets_autre: "Distribution (Précision)",
            problemes_billetterie: "Problèmes billetterie", problemes_billetterie_autre: "Problèmes billetterie (Précision)",
            controle_entrees: "Contrôle à l'entrée", controle_entrees_autre: "Contrôle (Précision)",
            com_avant: "Communication avant l'événement", com_avant_autre: "Communication (Précision)", 
            difficulte_com: "Faille de communication", difficulte_com_autre: "Faille de com. (Précision)",
            bilan: "Reddition des comptes", bilan_autre: "Bilan (Précision)", outils: "Outils structurels", outils_autre: "Outils (Précision)",
            plannings: "Gestion des équipes", plannings_autre: "Gestion des équipes (Précision)", procedures: "Protocoles documentés",
            archivage: "Archivage / Mémoire", archivage_autre: "Archivage (Précision)", objectif: "Objectif avec Eventnex", objectif_autre: "Objectif (Précision)", 
            date_demo: "Date de la démo", heure_demo: "Heure de la démo", commentaires: "Contexte additionnel"
        };

        const dataMap = new Map();
        for (const [key, value] of formData.entries()) {
            if (!value || key === 'consentement' || key === 'ip_address' || key === 'localisation_finale') continue;
            const cleanKey = key.replace('[]', '');
            if (dataMap.has(cleanKey)) {
                dataMap.set(cleanKey, dataMap.get(cleanKey) + ', ' + value);
            } else {
                dataMap.set(cleanKey, key === 'telephone' ? '+221 ' + value : value);
            }
        }

        dataMap.forEach((val, key) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'summary-item';
            
            const questionDiv = document.createElement('div');
            questionDiv.className = 'summary-question';
            questionDiv.innerText = labels[key] || key;

            const answerDiv = document.createElement('div');
            answerDiv.className = 'summary-answer';
            answerDiv.innerText = val;

            itemDiv.appendChild(questionDiv);
            itemDiv.appendChild(answerDiv);
            summaryContainer.appendChild(itemDiv);
        });
    }

    /* --- LOGIQUE MULTI-ÉTAPES ET MOTEUR DE VALIDATION --- */
    let activeStepIndex = 1;
    const finalStepIndex = 7;

    const prevBtn = document.getElementById("prev-step-btn");
    const nextBtn = document.getElementById("next-step-btn");
    const submitBtn = document.getElementById("submit-form-btn");
    const globalErrorToast = document.getElementById("validation-error-toast");
    const appForm = document.getElementById("eventnex-form");

    function refreshNavigationControls() {
        if (activeStepIndex > 1) prevBtn.classList.remove("invisible");
        else prevBtn.classList.add("invisible");

        if (activeStepIndex === finalStepIndex) {
            nextBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");
        } else {
            nextBtn.classList.remove("hidden");
            submitBtn.classList.add("hidden");
        }
    }

    function executeScrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

    function checkStepValidation() {
        if(activeStepIndex === finalStepIndex) return true;

        const currentStepDOM = document.querySelector(`.form-step[data-step="${activeStepIndex}"]`);
        let stepIsValid = true;

        currentStepDOM.querySelectorAll(".field-error-message").forEach(msg => msg.remove());

        // 1. Validation Standard
        const standardInputs = currentStepDOM.querySelectorAll(".required-field, .input-autre-field[required]");
        standardInputs.forEach(input => {
            if (!input.value.trim() && !input.closest('.hidden')) {
                stepIsValid = false;
                appendValidationError(input.closest(".form-field"), "Ce paramètre est requis.");
            }
        });

        // 2. Validation Numéro Sénégal (9 chiffres)
        const phoneInput = currentStepDOM.querySelector('input[type="tel"]');
        if (phoneInput && phoneInput.value.trim() !== "") {
            const phoneClean = phoneInput.value.replace(/\s+/g, '');
            if (!/^[0-9]{9}$/.test(phoneClean)) {
                stepIsValid = false;
                appendValidationError(phoneInput.closest(".form-field"), "Le format est incorrect (9 chiffres attendus sans l'indicatif).");
            }
        }

        // 3. Validation Horaires (16:00 - 21:30)
        const timeInput = currentStepDOM.querySelector('input[type="time"]');
        if (timeInput && timeInput.value.trim() !== "") {
            const t = timeInput.value;
            if(t < "16:00" || t > "21:30") {
                stepIsValid = false;
                appendValidationError(timeInput.closest(".form-field"), "L'heure doit être comprise entre 16:00 et 21:30.");
            }
        }

        // 4. Validation Groupes (Radio/Check)
        const mandatoryChoiceGroups = currentStepDOM.querySelectorAll(".choice-group-required");
        mandatoryChoiceGroups.forEach(group => {
            if(!group.classList.contains('hidden')) {
                const options = group.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                const hasSelection = Array.from(options).some(opt => opt.checked);
                if (!hasSelection) {
                    stepIsValid = false;
                    appendValidationError(group, "Veuillez sélectionner au moins un paramètre.");
                }
            }
        });

        if (!stepIsValid) globalErrorToast.style.display = "block";
        else globalErrorToast.style.display = "none";

        return stepIsValid;
    }

    function appendValidationError(targetElement, messageText) {
        const errorContainer = document.createElement("span");
        errorContainer.className = "field-error-message";
        errorContainer.innerText = messageText;
        targetElement.appendChild(errorContainer);
    }

    nextBtn.addEventListener("click", () => {
        if (checkStepValidation()) {
            document.querySelector(`.form-step[data-step="${activeStepIndex}"]`).classList.remove("active");
            activeStepIndex++;
            document.querySelector(`.form-step[data-step="${activeStepIndex}"]`).classList.add("active");
            
            if(activeStepIndex === finalStepIndex) generateSummary();

            refreshNavigationControls();
            executeScrollToTop();
        }
    });

    prevBtn.addEventListener("click", () => {
        globalErrorToast.style.display = "none";
        document.querySelector(`.form-step[data-step="${activeStepIndex}"]`).classList.remove("active");
        activeStepIndex--;
        document.querySelector(`.form-step[data-step="${activeStepIndex}"]`).classList.add("active");
        refreshNavigationControls();
        executeScrollToTop();
    });

    /* --- TRANSMISSION BACKEND --- */
    appForm.addEventListener("submit", function(e) {
        e.preventDefault();

        const baseFormData = new FormData(this);
        const urlEncodedParams = new URLSearchParams();

        for (const [key, value] of baseFormData.entries()) {
            if (key.endsWith("[]")) {
                const standardizedKey = key.replace("[]", "");
                const historicalValue = urlEncodedParams.get(standardizedKey);
                urlEncodedParams.set(standardizedKey, historicalValue ? historicalValue + ", " + value : value);
            } else {
                urlEncodedParams.set(key, value);
            }
        }

        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: urlEncodedParams.toString()
        })
        .then(() => {
            appForm.classList.add("hidden");
            document.getElementById("navigation-block").classList.add("hidden");
            document.querySelector(".left-column").classList.add("hidden");
            
            const thankYouSection = document.getElementById("thank-you-screen");
            thankYouSection.classList.remove("hidden");

            let remainingSeconds = 5;
            const timerDisplay = document.getElementById("countdown");
            
            const countdownTracker = setInterval(() => {
                remainingSeconds--;
                timerDisplay.innerText = remainingSeconds;
                if (remainingSeconds === 0) {
                    clearInterval(countdownTracker);
                    window.location.href = "https://eventnex.cloud";
                }
            }, 1000);
        })
        .catch((err) => {
            alert("Erreur réseau. Impossible de contacter le serveur d'orchestration.");
        });
    });
});