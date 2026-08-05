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
                            displayLoc.style.color = ""; // suppression de la couleur en dur
                            btnUpdate.innerText = "Position validée ✓";
                            btnUpdate.style.color = ""; // suppression de la couleur en dur
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
        // ... reste du code ...
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
        // ... reste du code ...
    }

    function executeScrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

    function checkStepValidation() {
        // ... reste du code ...
    }

    function appendValidationError(targetElement, messageText) {
        // ... reste du code ...
    }

    nextBtn.addEventListener("click", () => {
        // ... reste du code ...
    });

    prevBtn.addEventListener("click", () => {
        // ... reste du code ...
    });

    /* --- TRANSMISSION BACKEND --- */
    appForm.addEventListener("submit", function(e) {
        // ... reste du code ...
    });
});