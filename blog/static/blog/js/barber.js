(function () {
    const config = {
        highlightImportantClients: true,
        importantClients: ["Poumin", "VIP", "Important"],
    };

    const tableBody = document.getElementById("appointments-body");
    const refreshButton = document.getElementById("refresh-ajax");
    const filterDateInput = document.getElementById("filter-date");
    const filterClientInput = document.getElementById("filter-client");

    const modeButton = document.getElementById("toggle-async-sync");
    const modeLabel = document.getElementById("mode-label");

    const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    const csrfToken = csrfInput ? csrfInput.value : null;

    let cachedAppointments = [];
    let requestMode = "async"; 

    if (!tableBody || !refreshButton) {
        console.warn("barber.js: éléments DOM manquants, script interrompu.");
        return;
    }

    function clearTableBody() {
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
    }

    function renderAppointments(appointments) {
        cachedAppointments = appointments;
        clearTableBody();

        if (!appointments || appointments.length === 0) {
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

            if (
                config.highlightImportantClients &&
                config.importantClients.includes(appt.client)
            ) {
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

                // callback (event)
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
        if (typeof callback === "function") callback();
        else console.warn("withLogging appelé sans fonction valide.");
    }

    function buildAppointmentsUrl(filters) {
        let url = "/api/appointments/";
        const params = new URLSearchParams();

        if (filters && filters.date) params.append("date", filters.date);
        if (filters && filters.client) params.append("client", filters.client);

        const qs = params.toString();
        if (qs) url += "?" + qs;
        return url;
    }

    function fetchAppointmentsAsync(onSuccess, filters) {
        const url = buildAppointmentsUrl(filters);

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                let data = {};
                try {
                    data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                } catch (e) {
                    console.error("JSON invalide:", e, xhr.responseText);
                    return;
                }

                const appointments = data.appointments || [];
                if (typeof onSuccess === "function") onSuccess(appointments);
            } else {
                console.error("Erreur AJAX async:", xhr.status, xhr.responseText);
            }
        };

        xhr.onerror = function () {
            console.error("Erreur réseau AJAX async (XHR).");
        };

        xhr.send(null);
    }
    function fetchAppointmentsSync(filters) {
        const url = buildAppointmentsUrl(filters);

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        try {
            xhr.send(null);
        } catch (e) {
            console.error("Erreur AJAX sync:", e);
            return [];
        }

        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                return data.appointments || [];
            } catch (e) {
                console.error("JSON invalide (sync):", e, xhr.responseText);
                return [];
            }
        } else {
            console.error("Erreur AJAX sync:", xhr.status, xhr.responseText);
            return [];
        }
    }

    function updateModeUI() {
        if (modeLabel) {
            modeLabel.textContent = requestMode.toUpperCase();
        }
        if (modeButton) {
            modeButton.textContent =
                requestMode === "async"
                    ? "Passer en SYNC (démo)"
                    : "Passer en ASYNC";
        }
        console.log("[BarberWeb] Mode actuel =", requestMode.toUpperCase());
    }

    function handleToggleModeClick() {
        requestMode = requestMode === "async" ? "sync" : "async";
        updateModeUI();
    }

    if (modeButton) {
        modeButton.addEventListener("click", handleToggleModeClick);
    }

    updateModeUI();

    function handleRefreshClick() {
        const filterDate = filterDateInput ? filterDateInput.value : "";
        const filterClient = filterClientInput ? filterClientInput.value.trim() : "";

        const filters = { date: filterDate, client: filterClient };

        if (requestMode === "async") {
            console.log("ASYNC: A (avant appel XHR)");
            fetchAppointmentsAsync(function (appointments) {
                console.log("ASYNC: C (callback - réponse reçue)");

                withLogging("Rendu des rendez-vous filtrés (async)", function () {
                    renderAppointments(appointments);
                });
            }, filters);
            console.log("ASYNC: B (après appel XHR) => s'affiche AVANT C");
        } else {
            console.log("SYNC: A (avant appel XHR - bloquant)");
            const appointments = fetchAppointmentsSync(filters);
            console.log("SYNC: B (après appel XHR) => s'affiche APRÈS la réponse");

            withLogging("Rendu des rendez-vous filtrés (sync)", function () {
                renderAppointments(appointments);
            });

            console.log("SYNC: C (fin) => tout arrive après B");
        }
    }

    refreshButton.addEventListener("click", handleRefreshClick);

})();
