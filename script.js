document.addEventListener("DOMContentLoaded", () => {
    
    // RENSEIGNEZ VOTRE URL DE DÉPLOIEMENT GOOGLE APPS SCRIPT ICI
    const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXWr7DY_JQf2YE6hQVPaIYP7hxZ8jnlU9qzls8fXAI7ybz7VoCfDBIjjLYFqH3eFX3Aw/exec";

    /* --- COMPOSANTS DE L'INTERFACE & SIDEBAR --- */
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const menuOverlay = document.getElementById("menu-overlay");
    const sidebarMenu = document.getElementById("sidebar-menu");
    const sidebarCloseBtn = document.getElementById("sidebar-close-btn");

    function openSidebar() {
        sidebarMenu.classList.add("visible");
        menuOverlay.classList.add("visible");
        
        // Animation du bouton hamburger vers une croix (X)
        const bars = hamburgerBtn.querySelectorAll("div");
        bars[0].style.transform = "translateY(7px) rotate(45deg)";
        bars[1].style.opacity = "0";
        bars[2].style.transform = "translateY(-7px) rotate(-45deg)";
    }

    function closeSidebar() {
        sidebarMenu.classList.remove("visible");
        menuOverlay.classList.remove("visible");
        
        // Rétablissement des barres du hamburger
        const bars = hamburgerBtn.querySelectorAll("div");
        bars[0].style.transform = "none";
        bars[1].style.opacity = "1";
        bars[2].style.transform = "none";
    }

    hamburgerBtn.addEventListener("click", () => {
        if (sidebarMenu.classList.contains("visible")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarCloseBtn.addEventListener("click", closeSidebar);
    menuOverlay.addEventListener("click", closeSidebar);


    /* --- SYSTÈME DYNAMIQUE POUR LES OPTIONS "AUTRE" --- */
    
    // Gérer les balises de sélection <select>
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

    // Gérer les boutons radio et les cases à cocher <input>
    document.querySelectorAll(".option-autre-checkbox").forEach(checkboxElement => {
        const groupContainer = checkboxElement.closest(".options-stack");
        const subContainer = groupContainer.querySelector(".input-autre-container");
        const subInputField = subContainer.querySelector(".input-autre-field");

        // Écouter les changements sur tout le groupe d'options
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


    /* --- LOGIQUE MULTI-ÉTAPES ET MOTEUR DE VALIDATION --- */
    let activeStepIndex = 1;
    const finalStepIndex = 9;

    const prevBtn = document.getElementById("prev-step-btn");
    const nextBtn = document.getElementById("next-step-btn");
    const submitBtn = document.getElementById("submit-form-btn");
    const globalErrorToast = document.getElementById("validation-error-toast");
    const appForm = document.getElementById("eventnex-form");

    function refreshNavigationControls() {
        // Gérer la visibilité du bouton Précédent
        if (activeStepIndex > 1) {
            prevBtn.classList.remove("invisible");
        } else {
            prevBtn.classList.add("invisible");
        }

        // Basculer entre Suivant et Soumettre à l'étape finale
        if (activeStepIndex === finalStepIndex) {
            nextBtn.classList.add("hidden");
            submitBtn.classList.remove("hidden");
        } else {
            nextBtn.classList.remove("hidden");
            submitBtn.classList.add("hidden");
        }
    }

    function executeScrollToTop() {
        // Remonte obligatoirement la page vers le haut
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function checkStepValidation() {
        const currentStepDOM = document.querySelector(`.form-step[data-step="${activeStepIndex}"]`);
        let stepIsValid = true;

        // Effacer les erreurs précédentes de l'étape active
        currentStepDOM.querySelectorAll(".field-error-message").forEach(msg => msg.remove());

        // 1. Validation des champs de texte, sélections et dates obligatoires
        const standardInputs = currentStepDOM.querySelectorAll(".required-field, .input-autre-field[required]");
        standardInputs.forEach(input => {
            if (!input.value.trim()) {
                stepIsValid = false;
                appendValidationError(input.closest(".form-field"), "Ce champ est requis.");
            }
        });

        // 2. Validation des groupes d'options obligatoires (Radio / Checkbox)
        const mandatoryChoiceGroups = currentStepDOM.querySelectorAll(".choice-group-required");
        mandatoryChoiceGroups.forEach(group => {
            const options = group.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            const hasSelection = Array.from(options).some(opt => opt.checked);
            
            if (!hasSelection) {
                stepIsValid = false;
                appendValidationError(group, "Veuillez sélectionner au moins une option.");
            }
        });

        // Affichage du toast d'avertissement général
        if (!stepIsValid) {
            globalErrorToast.style.display = "block";
        } else {
            globalErrorToast.style.display = "none";
        }

        return stepIsValid;
    }

    function appendValidationError(targetElement, messageText) {
        const errorContainer = document.createElement("span");
        errorContainer.className = "field-error-message";
        errorContainer.innerText = messageText;
        targetElement.appendChild(errorContainer);
    }

    // Gestion des clics de navigation
    nextBtn.addEventListener("click", () => {
        if (checkStepValidation()) {
            document.querySelector(`.form-step[data-step="${activeStepIndex}"]`).classList.remove("active");
            activeStepIndex++;
            document.querySelector(`.form-step[data-step="${activeStepIndex}"]`).classList.add("active");
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


    /* --- PROCESSUS DE SOUMISSION VIA APPS SCRIPT & REDIRECTION --- */
    appForm.addEventListener("submit", function(e) {
        e.preventDefault();

        // Contrôle ultime de l'étape de consentement finale
        const consentCheck = document.getElementById("consentement-check");
        if (!consentCheck.checked) {
            alert("Vous devez accepter les conditions de traitement pour soumettre le formulaire.");
            return;
        }

        if (!checkStepValidation()) return;

        const baseFormData = new FormData(this);
        const urlEncodedParams = new URLSearchParams();

        // Traduction du FormData en chaîne structurée pour l'API Google Sheets
        for (const [key, value] of baseFormData.entries()) {
            if (key.endsWith("[]")) {
                const standardizedKey = key.replace("[]", "");
                const historicalValue = urlEncodedParams.get(standardizedKey);
                urlEncodedParams.set(standardizedKey, historicalValue ? historicalValue + ", " + value : value);
            } else {
                urlEncodedParams.set(key, value);
            }
        }

        // Transmission des paquets à l'infrastructure Google Apps Script
        fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: urlEncodedParams.toString()
        })
        .then(() => {
            // Dissimulation des blocs opérationnels et affichage de la confirmation
            appForm.classList.add("hidden");
            document.getElementById("navigation-block").classList.add("hidden");
            document.querySelector(".left-column").classList.add("hidden");
            
            const thankYouSection = document.getElementById("thank-you-screen");
            thankYouSection.classList.remove("hidden");

            // Amorçage du compte à rebours de 5 secondes avant redirection sécurisée
            let remainingSeconds = 5;
            const timerDisplay = document.getElementById("countdown");
            
            const countdownTracker = setInterval(() => {
                remainingSeconds--;
                timerDisplay.innerText = remainingSeconds;
                if (remainingSeconds === 0) {
                    clearInterval(countdownTracker);
                    window.location.href = "https://eventnex.cloud"; // Redirection absolue plateforme
                }
            }, 1000);
        })
        .catch((err) => {
            alert("Une erreur de communication est survenue. Veuillez valider votre connexion.");
            console.error("Transmission Failure:", err);
        });
    });
});