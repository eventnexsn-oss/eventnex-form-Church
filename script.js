document.addEventListener("DOMContentLoaded", () => {

    // Endpoint backend local / Netlify Function
    const BACKEND_URL = "/.netlify/functions/submitForm";

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

    // Détection précise (GPS) - automatique au chargement
    function requestGPSCoordinates() {
        if (!navigator.geolocation) {
            console.log("Géolocalisation non supportée, utilisation de la détection IP seulement.");
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
                        displayLoc.style.color = ""; // suppression de la couleur en dur
                        if(btnUpdate) {
                            btnUpdate.innerText = "Position validée ✓";
                            btnUpdate.style.color = ""; // suppression de la couleur en dur
                            btnUpdate.style.textDecoration = "none";
                        }
                        inputLoc.value = "[GPS] " + affichageFinal;
                    })
                    .catch(() => {
                        displayLoc.innerText = `GPS (Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)})`;
                        inputLoc.value = `[GPS] Lat: ${lat}, Lon: ${lon}`;
                    });
            },
            function() {
                console.log("Accès GPS refusé ou signal faible, utilisation de la détection IP.");
                // Ne pas écraser la détection IP en cas de refus
                if(displayLoc.innerText.includes("Position approximative")) {
                    displayLoc.innerText = "Détection IP (GPS refusé)";
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    // Détection précise (GPS) - automatique au chargement
    if(btnUpdate) {
        btnUpdate.addEventListener("click", requestGPSCoordinates);
        // Déclencher automatiquement au chargement
        requestGPSCoordinates();
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

    // Show organization size question when sous_statut is completed
    const tailleOrganisationContainer = document.getElementById('taille_organisation_container');
    if (sousStatutSelect && tailleOrganisationContainer) {
        sousStatutSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                tailleOrganisationContainer.classList.remove('hidden');
            } else {
                tailleOrganisationContainer.classList.add('hidden');
            }
        });
    }

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

    /* --- VALIDATION TELEPHONE EN TEMPS REEL --- */
    const phoneInput = document.querySelector('input[name="telephone"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            // Remove any non-digit characters as user types
            this.value = this.value.replace(/\D/g, '');

            // Clear previous phone-specific errors
            const container = this.closest('.form-field');
            if (container) {
                const existingError = container.querySelector('.field-error-message');
                if (existingError && existingError.textContent.includes('numéro')) {
                    existingError.remove();
                    container.classList.remove('field-error-highlight');
                }
            }
        });

        phoneInput.addEventListener('blur', function() {
            if (this.value.trim() === '') return;

            const validation = validateSenegalPhone(this.value);
            const container = this.closest('.form-field');
            const existingError = container.querySelector('.field-error-message');

            // Remove any existing phone error
            if (existingError && existingError.textContent.includes('numéro')) {
                existingError.remove();
            }

            if (!validation.valid) {
                container.classList.add('field-error-highlight');
                const message = document.createElement('div');
                message.className = 'field-error-message';
                message.textContent = validation.message;
                container.appendChild(message);
            } else {
                container.classList.remove('field-error-highlight');
            }
        });
    }

    /* --- GESTION DU RÉCAPITULATIF (ÉTAPE 7) --- */
    function generateSummary() {
        const summaryContainer = document.getElementById("summary-container");
        if (!summaryContainer) return;

        const summaryItems = [];
        const labels = {
            statut_entite: "Statut de l'organisation",
            sous_statut: "Précisez votre statut",
            nom_entite: "Nom de l'entité",
            sous_entite: "Sous-entité / Département",
            nom_prenom: "Nom et prénom",
            fonction: "Fonction",
            telephone: "Téléphone",
            email: "Email professionnel"
        };

        Array.from(appForm.elements).forEach((field) => {
            if (!field.name || field.type === "hidden" || field.type === "button" || field.type === "submit") return;
            if ((field.type === "radio" || field.type === "checkbox") && !field.checked) return;
            if ((field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "date" || field.type === "time" || field.type === "textarea" || field.tagName === "SELECT") && field.value.trim() === "") return;

            const label = labels[field.name] || field.name.replace(/_/g, " ");
            summaryItems.push(`<div class="summary-item"><div class="summary-question">${label}</div><div class="summary-answer">${field.value}</div></div>`);
        });

        summaryContainer.innerHTML = summaryItems.length > 0
            ? summaryItems.join("")
            : "<p class='summary-answer'>Aucune donnée saisie pour le moment.</p>";
    }

    /* --- LOGIQUE MULTI-ÉTAPES ET MOTEUR DE VALIDATION --- */
    let activeStepIndex = 1;
    const finalStepIndex = 7;
    let formStartTime = new Date();

    const prevBtn = document.getElementById("prev-step-btn");
    const nextBtn = document.getElementById("next-step-btn");
    const submitBtn = document.getElementById("submit-form-btn");
    const globalErrorToast = document.getElementById("validation-error-toast");
    const appForm = document.getElementById("eventnex-form");

    // Add time tracking field
    const telemetrieInput = document.createElement('input');
    telemetrieInput.type = 'hidden';
    telemetrieInput.name = 'telemetrie_temps';
    appForm.appendChild(telemetrieInput);

    function clearValidationErrors() {
        appForm.querySelectorAll(".field-error-message").forEach((el) => el.remove());
        appForm.querySelectorAll(".field-error-highlight").forEach((el) => el.classList.remove("field-error-highlight"));
    }

    function refreshNavigationControls() {
        prevBtn.classList.toggle("invisible", activeStepIndex === 1);
        nextBtn.classList.toggle("hidden", activeStepIndex === finalStepIndex);
        submitBtn.classList.toggle("hidden", activeStepIndex !== finalStepIndex);
    }

    function executeScrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

    function isFieldVisible(field) {
        if (!field) return false;
        const container = field.closest(".form-field");
        if (container && container.classList.contains("hidden")) return false;
        return field.offsetParent !== null || field.getClientRects().length > 0;
    }

    function validateSenegalPhone(phoneNumber) {
        // Remove any spaces or formatting characters
        const cleaned = phoneNumber.replace(/\s+/g, '');

        // Must be exactly 9 digits
        if (!/^\d{9}$/.test(cleaned)) {
            return { valid: false, message: "Le numéro doit comporter exactement 9 chiffres sans espaces ni tirets." };
        }

        // Must start with valid Senegalese prefixes
        const validPrefixes = ['33', '70', '75', '76', '77', '78'];
        const prefix = cleaned.substring(0, 2);

        if (!validPrefixes.includes(prefix)) {
            return { valid: false, message: "Le numéro doit commencer par 33, 70, 75, 76, 77 ou 78 (numéros sénégalais uniquement)." };
        }

        // Check if user tried to enter French number (+33 removed but starts with 7)
        if (phoneNumber.includes('+33') || phoneNumber.includes('33') && !cleaned.startsWith('33')) {
            return { valid: false, message: "Les numéros français (+33) ne sont pas acceptés. Veuillez entrer un numéro sénégalais." };
        }

        return { valid: true, message: "" };
    }

    function checkStepValidation() {
        clearValidationErrors();
        const activeStep = document.querySelector(".form-step.active");
        const invalidElements = [];
        const errors = [];

        if (!activeStep) return { isValid: true, invalidElements, errors };

        activeStep.querySelectorAll(".choice-group-required").forEach((group) => {
            const inputs = Array.from(group.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
            const hasSelection = inputs.some((field) => field.checked);

            if (!hasSelection) {
                invalidElements.push(group);
                errors.push("Veuillez sélectionner une option.");
                group.classList.add("field-error-highlight");
                const message = document.createElement("div");
                message.className = "field-error-message";
                message.textContent = "Veuillez sélectionner une option.";
                group.appendChild(message);
            }
        });

        activeStep.querySelectorAll("input, select, textarea").forEach((field) => {
            if (field.type === "hidden" || field.type === "radio" || field.type === "checkbox") return;
            if (!isFieldVisible(field)) return;

            const isRequired = field.hasAttribute("required") || field.classList.contains("required-field");
            if (!isRequired) return;

            if (field.value.trim() === "") {
                invalidElements.push(field);
                errors.push("Ce champ est obligatoire.");
                const container = field.closest(".form-field");
                if (container) {
                    container.classList.add("field-error-highlight");
                    const message = document.createElement("div");
                    message.className = "field-error-message";
                    message.textContent = "Ce champ est obligatoire.";
                    container.appendChild(message);
                }
            }

            // Special validation for telephone field
            if (field.name === "telephone" && field.value.trim() !== "") {
                const validation = validateSenegalPhone(field.value);
                if (!validation.valid) {
                    invalidElements.push(field);
                    errors.push(validation.message);
                    const container = field.closest(".form-field");
                    if (container) {
                        container.classList.add("field-error-highlight");
                        const message = document.createElement("div");
                        message.className = "field-error-message";
                        message.textContent = validation.message;
                        container.appendChild(message);
                    }
                }
            }
        });

        activeStep.querySelectorAll(".form-field").forEach((fieldContainer) => {
            const subInput = fieldContainer.querySelector(".input-autre-field");
            if (subInput && subInput.hasAttribute("required") && subInput.value.trim() === "") {
                invalidElements.push(subInput);
                errors.push("Veuillez préciser cette information.");
                fieldContainer.classList.add("field-error-highlight");
                const message = document.createElement("div");
                message.className = "field-error-message";
                message.textContent = "Veuillez préciser cette information.";
                fieldContainer.appendChild(message);
            }
        });

        globalErrorToast.style.display = errors.length > 0 ? "block" : "none";
        return { isValid: errors.length === 0, invalidElements, errors };
    }

    function setActiveStep(stepIndex) {
        activeStepIndex = Math.min(finalStepIndex, Math.max(1, stepIndex));
        document.querySelectorAll(".form-step").forEach((step, index) => {
            step.classList.toggle("active", index + 1 === activeStepIndex);
        });
        document.querySelectorAll(".step-progress-item").forEach((item) => {
            const stepNumber = Number(item.dataset.step);
            item.classList.toggle("active", stepNumber === activeStepIndex);
        });
        refreshNavigationControls();
        executeScrollToTop();
        if (activeStepIndex === finalStepIndex) {
            generateSummary();
        }
    }

    nextBtn.addEventListener("click", () => {
        const validation = checkStepValidation();
        if (!validation.isValid) {
            executeScrollToTop();
            return;
        }
        if (activeStepIndex < finalStepIndex) {
            setActiveStep(activeStepIndex + 1);
        }
    });

    prevBtn.addEventListener("click", () => {
        if (activeStepIndex > 1) {
            setActiveStep(activeStepIndex - 1);
        }
    });

    /* --- TRANSMISSION BACKEND --- */
    appForm.addEventListener("submit", function(e) {
        // Calculate time spent on form
        const duration = new Date() - formStartTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const telemetrieInput = appForm.querySelector('input[name="telemetrie_temps"]');
        if (telemetrieInput) {
            telemetrieInput.value = `${minutes}m ${seconds}s`;
        }
        const validation = checkStepValidation();
        if (!validation.isValid) {
            e.preventDefault();
            executeScrollToTop();
            return;
        }

        e.preventDefault();

        // Désactiver le bouton et afficher le spinner pour empêcher les doubles clics
        const submitBtnText = submitBtn.querySelector('.submit-btn-text');
        const submitSpinner = document.getElementById('submit-spinner');
        submitBtn.disabled = true;
        if (submitSpinner) submitSpinner.classList.remove('hidden');
        if (submitBtnText) submitBtnText.textContent = 'Envoi en cours...';

        const formData = new FormData(appForm);
        const payload = {};

        for (const [rawName, value] of formData.entries()) {
            const name = rawName.endsWith('[]') ? rawName.slice(0, -2) : rawName;

            if (payload[name] === undefined) {
                payload[name] = value;
            } else if (Array.isArray(payload[name])) {
                payload[name].push(value);
            } else {
                payload[name] = [payload[name], value];
            }
        }

        fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(async (response) => {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Erreur de soumission.');
            }
            return response.json();
        })
        .then((result) => {
            if (result.result !== 'success') {
                throw new Error(result.error || 'Erreur backend.');
            }
            const thankYouScreen = document.getElementById('thank-you-screen');
            const countdownElement = document.getElementById('countdown');
            const formContainer = document.getElementById('eventnex-form');

            thankYouScreen.classList.remove('hidden');
            formContainer.classList.add('hidden');

            let countdownValue = 5;
            countdownElement.textContent = countdownValue;

            const countdownInterval = window.setInterval(() => {
                countdownValue -= 1;
                countdownElement.textContent = countdownValue;

                if (countdownValue <= 0) {
                    window.clearInterval(countdownInterval);
                    window.location.assign('https://v2.eventnex.cloud/');
                }
            }, 1000);
        })
        .catch((error) => {
            console.error('Erreur de soumission:', error);
            alert('Une erreur est survenue lors de l’envoi du formulaire. Merci de réessayer plus tard.');
            submitBtn.disabled = false;
            if (submitSpinner) submitSpinner.classList.add('hidden');
            if (submitBtnText) submitBtnText.textContent = 'Activer le processus';
        });
    });

    setActiveStep(1);
});