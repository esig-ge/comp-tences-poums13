(function () {
    const config = {
        highlightImportantClients: true,
        importantClients: ["Poums", "VIP", "Important"],
    };

    const tableBody = document.getElementById("appointments-body");
    const refreshButton = document.getElementById("refresh-ajax");
    const filterDateInput = document.getElementById("filter-date");
    const filterClientInput = document.getElementById("filter-client");

    const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    const csrfToken = csrfInput ? csrfInput.value : null;

    let cachedAppointments = [];

    if (!tableBody || !refreshButton) {
        console.warn("barber.js: éléments DOM manquants, script interrompu.");
        return;
    }

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

            const dateTd = document.createElement("td");
            dateTd.textContent = appt.date_display;
            tr.appendChild(dateTd);

            const timeTd = document.createElement("td");
            timeTd.textContent = appt.time;
            tr.appendChild(timeTd);

            const notesTd = document.createElement("td");
            notesTd.textContent = appt.notes || "";
            tr.appendChild(notesTd);

            const actionsTd = document.createElement("td");
            actionsTd.classList.add("actions");

            if (!csrfToken) {
                actionsTd.textContent = "Actions disponibles via le formulaire classique.";
            } else {
                const editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.classList.add("btn", "small", "ghost");
                editBtn.textContent = "Modifier";

                editBtn.addEventListener("click", function () {
                    if (typeof editAppointment === "function") {
                        editAppointment(
                            appt.id,
                            appt.client,
                            appt.date,
                            appt.time,
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

    function withLogging(actionName, callback) {
        console.log("[BarberWeb]", actionName);

        if (typeof callback === "function") {
            callback();
        } else {
            console.warn("withLogging appelé sans fonction valide.");
        }
    }

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

    refreshButton.addEventListener("click", handleRefreshClick);

})();
