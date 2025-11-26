// barber.js
// JavaScript pour la page de planning BarberWeb
// - Manipulation du DOM (création de nœuds)
// - Callbacks d'événements
// - Fonctions passées en paramètre
// - AJAX (fetch) vers /api/appointments/ (lecture BDD)
// - Démonstration d'asynchronisme

(function () {
    // Objet de configuration (critère: objets)
    const config = {
        highlightImportantClients: true,
        importantClients: ["Poums", "VIP", "Important"],
    };

    // Sélection des éléments DOM importants
    const tableBody = document.getElementById("appointments-body");
    const refreshButton = document.getElementById("refresh-ajax");
    const asyncDemoButton = document.getElementById("async-demo");

    // Tableau en mémoire pour garder la dernière liste (critère: tableaux)
    let cachedAppointments = [];

    // Sécurité : si la page ne contient pas ces éléments, on ne fait rien
    if (!tableBody || !refreshButton) {
        // Condition (critère: conditions)
        console.warn("barber.js: éléments DOM manquants, script interrompu.");
        return;
    }

    /**
     * Rend tous les rendez-vous dans le DOM.
     * - Supprime les anciennes lignes
     * - Ajoute de nouvelles lignes <tr> / <td> (critère : modification significative du DOM)
     */
    function renderAppointments(appointments) {
        // Mise à jour du cache
        cachedAppointments = appointments;

        // On vide le tbody
        tableBody.innerHTML = "";

        if (appointments.length === 0) {
            // Condition + création de nœuds
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 5;
            cell.textContent = "Aucun rendez-vous (chargés via AJAX).";
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        // Boucle sur le tableau (critère: boucles + tableaux)
        appointments.forEach((appt) => {
            const tr = document.createElement("tr");

            // Client
            const clientTd = document.createElement("td");
            const clientSpan = document.createElement("span");
            clientSpan.classList.add("client-name");
            clientSpan.textContent = appt.client;

            // Exemple de condition + utilisation d'un tableau dans l'objet config
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

            // Actions : ici on met juste un texte indicatif.
            // Les vraies actions (modifier/supprimer) existent déjà dans le HTML côté serveur.
            const actionsTd = document.createElement("td");
            actionsTd.classList.add("actions");
            actionsTd.textContent = "Actions disponibles via le formulaire classique.";
            tr.appendChild(actionsTd);

            // Ajout de la ligne au DOM (critère: ajout de nœuds)
            tableBody.appendChild(tr);
        });
    }

    /**
     * Fonction utilitaire qui prend une fonction en paramètre
     * et la déclenche après avoir loggé une action.
     *
     * -> Critère : "passer des fonctions en paramètre"
     */
    function withLogging(actionName, callback) {
        console.log("[BarberWeb]", actionName);

        // Condition + vérification que callback est bien une fonction
        if (typeof callback === "function") {
            callback();
        } else {
            console.warn("withLogging appelé sans fonction valide.");
        }
    }

    /**
     * Récupère les rendez-vous via AJAX (fetch) puis appelle un callback avec les données.
     * - Critère : AJAX simple (sans jQuery)
     * - Critère : appel AJAX qui dialogue avec la BDD
     */
    function fetchAppointmentsWithCallback(onSuccess) {
        fetch("/api/appointments/")
            .then((response) => response.json())
            .then((data) => {
                // data.appointments est un tableau d'objets JSON
                // Critère : données non triviales structurées (liste d'objets JSON)
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
     * Callback d'événement : déclenché quand l'utilisateur clique sur
     * le bouton "Recharger la liste (AJAX)".
     *
     * -> Critère : modification du DOM en réaction à un événement utilisateur.
     */
    function handleRefreshClick() {
        console.log("Avant l'appel AJAX (A)");

        // Exemple clair de fonctions de rappel (callback) :
        // on passe renderAppointments comme paramètre à fetchAppointmentsWithCallback,
        // encapsulé dans withLogging pour montrer la composition.
        fetchAppointmentsWithCallback(function (appointments) {
            console.log("Réponse AJAX reçue (B)");

            // Exemple de fonction passée en paramètre via withLogging
            withLogging("Rendu des rendez-vous", function () {
                renderAppointments(appointments);
            });
        });

        console.log("Après l'appel fetch (C – s'affiche AVANT B => asynchronisme)");
    }

    /**
     * Démo d'asynchronisme claire.
     * A lancer via le bouton "Démo asynchronisme (console)".
     *
     * Tu pourras montrer en direct dans la console :
     * - "début (1)"
     * - "fin immédiate (3)"
     * - puis "dans le then (2)" lorsque la réponse arrive.
     */
    function handleAsyncDemoClick() {
        console.log("Démo asynchronisme : début (1)");

        fetch("/api/appointments/")
            .then(() => {
                console.log("Démo asynchronisme : dans le then (2)");
            });

        console.log("Démo asynchronisme : fin immédiate (3)");
    }

    // Enregistrement des gestionnaires d'événements (event handlers)
    // -> Critère : au moins une fonction de rappel pour gérer des événements.
    refreshButton.addEventListener("click", handleRefreshClick);

    if (asyncDemoButton) {
        asyncDemoButton.addEventListener("click", handleAsyncDemoClick);
    }

    // Remarque importante :
    // - Ici, on ne modifie pas le DOM au chargement (on se contente d'attacher des événements).
    // - La modification significative du DOM (création de <tr>/<td>) se fait
    //   uniquement après un clic utilisateur sur le bouton AJAX, ce qui respecte le critère.
})();
