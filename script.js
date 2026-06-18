document.addEventListener("DOMContentLoaded", () => {
    
    // RENSEIGNEZ VOTRE URL DE DÉPLOIEMENT GOOGLE APPS SCRIPT ICI
    const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7jiEiEmJLMRbWcyYjSDRHF5_ih1GSd4q6KRR1l0OXp3zO8rJWHFcdAYEnUp4LruXkBg/exec";

    /* --- COMPOSANTS DE L'INTERFACE & SIDEBAR --- */
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

    /* --- SYSTÈME DYNAMIQUE POUR LES OPTIONS "AUTRE" --- */
    document.querySelectorAll(".data-autre-trigger").forEach(selectElement => {
        selectElement.addEventListener("change", (e) => {
            const container = e.target.closest(".form-field");
            const subContainer = container.querySelector(".input-autre-container");
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

    /* --- GESTION DU RÉCAPITULATIF (ÉTAPE 10) --- */
    function generateSummary() {
        const summaryContainer = document.getElementById('summary-container');
        summaryContainer.innerHTML = '';
        const formData = new FormData(appForm);
        
        // Dictionnaire des questions
        const labels = {
            nom_eglise: "Nom de l'église / paroisse", sous_entite: "Sous-entité", nom_responsable: "Nom du responsable",
            fonction: "Fonction", fonction_autre: "Fonction (Précision)", telephone: "Téléphone", email: "Email",
            ville: "Ville / Quartier", ville_autre: "Ville (Précision)", nb_participants: "Nombre moyen de participants",
            frequence: "Fréquence des événements", frequence_autre: "Fréquence (Précision)", vente_billets: "Vente de billets",
            vente_billets_autre: "Vente de billets (Précision)", type_evenement: "Type d'événement", prix_moyen: "Prix moyen du billet",
            problemes_billetterie: "Problèmes billetterie", problemes_billetterie_autre: "Problèmes billetterie (Précision)",
            controle_entrees: "Contrôle des entrées", controle_entrees_autre: "Contrôle des entrées (Précision)",
            internet: "Connexion Internet", membres_entrees: "Membres mobilisables", com_avant: "Communication avant l'événement",
            com_avant_autre: "Communication (Précision)", difficulte_com: "Difficultés de communication", difficulte_com_autre: "Difficultés de com. (Précision)",
            bilan: "Bilan après événement", bilan_autre: "Bilan (Précision)", outils: "Outils de travail", outils_autre: "Outils (Précision)",
            plannings: "Gestion des plannings", plannings_autre: "Gestion des plannings (Précision)", procedures: "Procédures et checklists",
            procedures_autre: "Procédures (Précision)", archivage: "Archivage", archivage_autre: "Archivage (Précision)",
            difficultes_actuelles: "Difficultés actuelles", difficultes_actuelles_autre: "Difficultés (Précision)", objectif: "Objectif avec Eventnex",
            objectif_autre: "Objectif (Précision)", lieu_demo: "Lieu de la démonstration", disponibilites: "Disponibilités",
            accompagnement: "Accompagnement souhaité", commentaires: "Commentaires"
        };

        const dataMap = new Map();
        for (const [key, value] of formData.entries()) {
            if (!value || key === 'consentement') continue;
            const cleanKey = key.replace('[]', '');
            if (dataMap.has(cleanKey)) {
                dataMap.set(cleanKey, dataMap.get(cleanKey) + ', ' + value);
            } else {
                dataMap.set(cleanKey, value);
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
    const finalStepIndex = 10; // Passé à 10

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
        if(activeStepIndex === finalStepIndex) return true; // Pas de validation sur le récapitulatif

        const currentStepDOM = document.querySelector(`.form-step[data-step="${activeStepIndex}"]`);
        let stepIsValid = true;

        currentStepDOM.querySelectorAll(".field-error-message").forEach(msg => msg.remove());

        const standardInputs = currentStepDOM.querySelectorAll(".required-field, .input-autre-field[required]");
        standardInputs.forEach(input => {
            if (!input.value.trim()) {
                stepIsValid = false;
                appendValidationError(input.closest(".form-field"), "Ce champ est requis.");
            }
        });

        const mandatoryChoiceGroups = currentStepDOM.querySelectorAll(".choice-group-required");
        mandatoryChoiceGroups.forEach(group => {
            const options = group.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            const hasSelection = Array.from(options).some(opt => opt.checked);
            if (!hasSelection) {
                stepIsValid = false;
                appendValidationError(group, "Veuillez sélectionner au moins une option.");
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
            
            if(activeStepIndex === finalStepIndex) {
                generateSummary(); // Génère le texte quand on arrive à l'étape 10
            }

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

    /* --- PROCESSUS DE SOUMISSION VIA APPS SCRIPT --- */
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
            alert("Une erreur de communication est survenue. Veuillez valider votre connexion.");
            console.error("Transmission Failure:", err);
        });
    });
});