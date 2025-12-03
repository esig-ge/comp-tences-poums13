// barber.js
// JavaScript pour la page de planning BarberWeb
// - Manipulation du DOM (création de nœuds)
// - Callbacks d'événements
// - Fonctions passées en paramètre
// - AJAX (fetch) vers /api/appointments/ (lecture BDD + filtres)
// - Démonstration d'asynchronisme via les logs A / C / B

(function () {
    // Objet de configuration (critère: objets)
    const config = {
        highlightImportantClients: true,
        importantClients: ["Poums", "VIP", "Important"],
    };

    // Sélection des éléments DOM importants
    const tableBody = document.getElementById("appointments-body");
    const refreshButton = document.getElementById("refresh-ajax");
    const filterDateInput = document.getElementById("filter-date");
    const filterClientInput = document.getElementById("filter-client");

    // Token CSRF récupéré depuis un formulaire existant
    const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    const csrfToken = csrfInput ? csrfInput.value : null;

    // Tableau en mémoire pour garder la dernière liste (critère: tableaux)
    let cachedAppointments = [];

    // Sécurité : si la page ne contient pas ces éléments, on ne fait rien
    if (!tableBody || !refreshButton) {
        console.warn("barber.js: éléments DOM manquants, script interrompu.");
        return;
    }

    /**
     * Rend tous les rendez-vous dans le DOM.
     * - Supprime les anciennes lignes
     * - Ajoute de nouvelles lignes <tr> / <td>
     * - Reconstruit la colonne "Actions" avec Modifier / Supprimer
     */
    function renderAppointments(appointments) {
        cachedAppointments = appointments;
        tableBody.innerHTML = "";

        if (appointments.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 5;
            cell.textContent = "Aucun rendez-vous trouvé avec ces filtres (AJAX).";
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        appointments.forEach((appt) => {
            const tr = document.createElement("tr");

            // Client
            const clientTd = document.createElement("td");
            const clientSpan = document.createElement("span");
            clientSpan.classList.add("client-name");
            clientSpan.textContent = appt.client;

            if (config.highlightImportantClients &&
                config.importantClients.includes(appt.client)) {
                clientSpan.style.fontWeight = "bold";
            }

            clientTd.appendChild(clientSpan);
            tr.appendChild(clientTd);

            // Date
            const dateTd = document.createElement("td");
            dateTd.textContent = appt.date_display;
            tr.appendChild(dateTd);

            // Heure
            const timeTd = document.createElement("td");
            timeTd.textContent = appt.time;
            tr.appendChild(timeTd);

            // Commentaires
            const notesTd = document.createElement("td");
            notesTd.textContent = appt.notes || "";
            tr.appendChild(notesTd);

            // Actions
            const actionsTd = document.createElement("td");
            actionsTd.classList.add("actions");

            if (!csrfToken) {
                actionsTd.textContent = "Actions disponibles via le formulaire classique.";
            } else {
                // Bouton MODIFIER : réutilise editAppointment (globale définie dans index.html)
                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.classList.add("btn", "small", "ghost");
                editBtn.textContent = "Modifier";

                editBtn.addEventListener("click", function () {
                    if (typeof editAppointment === "function") {
                        editAppointment(
                            appt.id,
                            appt.client,
                            appt.date,       // ISO YYYY-MM-DD
                            appt.time,       // HH:MM
                            appt.notes || ""
                        );
                    } else {
                        console.warn("editAppointment n'est pas défini.");
                    }
                });

                actionsTd.appendChild(editBtn);

                // Formulaire SUPPRIMER (POST classique)
                const deleteForm = document.createElement("form");
                deleteForm.method = "post";
                deleteForm.style.display = "inline";

                const csrfField = document.createElement("input");
                csrfField.type = "hidden";
                csrfField.name = "csrfmiddlewaretoken";
                csrfField.value = csrfToken;
                deleteForm.appendChild(csrfField);

                const deleteIdField = document.createElement("input");
                deleteIdField.type = "hidden";
                deleteIdField.name = "delete_id";
                deleteIdField.value = appt.id;
                deleteForm.appendChild(deleteIdField);

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "submit";
                deleteBtn.classList.add("btn", "small", "danger");
                deleteBtn.textContent = "Supprimer";

                deleteForm.appendChild(deleteBtn);
                actionsTd.appendChild(deleteForm);
            }

            tr.appendChild(actionsTd);
            tableBody.appendChild(tr);
        });
    }

    /**
     * Fonction utilitaire : log + exécution d'un callback.
     */
    function withLogging(actionName, callback) {
        console.log("[BarberWeb]", actionName);

        if (typeof callback === "function") {
            callback();
        } else {
            console.warn("withLogging appelé sans fonction valide.");
        }
    }

    /**
     * Appel AJAX avec filtres (date, client).
     * - Critère : AJAX natif, JSON structuré, BDD
     */
    function fetchAppointmentsWithCallback(onSuccess, filters) {
        let url = "/api/appointments/";
        const params = new URLSearchParams();

        if (filters && filters.date) {
            params.append("date", filters.date);
        }
        if (filters && filters.client) {
            params.append("client", filters.client);
        }

        const queryString = params.toString();
        if (queryString) {
            url += "?" + queryString;
        }

        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                const appointments = data.appointments || [];

                if (typeof onSuccess === "function") {
                    onSuccess(appointments);
                }
            })
            .catch((error) => {
                console.error("Erreur lors du chargement AJAX des rendez-vous:", error);
            });
    }

    /**
     * Callback d'événement : clic sur "Filtrer (AJAX)".
     * - Démo d'asynchronisme : logs A / C / B
     */
    function handleRefreshClick() {
        const filterDate = filterDateInput ? filterDateInput.value : "";
        const filterClient = filterClientInput ? filterClientInput.value.trim() : "";

        console.log("Avant l'appel AJAX (A)");

        fetchAppointmentsWithCallback(function (appointments) {
            console.log("Réponse AJAX reçue (B)");

            withLogging("Rendu des rendez-vous filtrés", function () {
                renderAppointments(appointments);
            });
        }, {
            date: filterDate,
            client: filterClient
        });

        console.log("Après l'appel fetch (C – s'affiche AVANT B => asynchronisme)");
    }

    // Callback d'événement : clic utilisateur
    refreshButton.addEventListener("click", handleRefreshClick);

})();
