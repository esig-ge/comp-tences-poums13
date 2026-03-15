(function () {

  /* accès au DOM */
  var tableBody = document.getElementById("appointments-body");
  var refreshButton = document.getElementById("refresh-ajax");
  var filterDateInput = document.getElementById("filter-date");
  var filterClientInput = document.getElementById("filter-client");
  var modeButton = document.getElementById("toggle-async-sync");
  var modeLabel = document.getElementById("mode-label");

  var csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
  var csrfToken = csrfInput ? csrfInput.value : null;

  if (!tableBody || !refreshButton) {
    console.warn("barber.js: éléments DOM manquants");
    return;
  }

  /* état mode */
  var requestMode = "async";

  function clearTableBody() {
    while (tableBody.firstChild) {
      tableBody.removeChild(tableBody.firstChild);
    }
  }

  function buildAppointmentsUrl(filters) {
    var url = "/api/appointments/";
    var params = new URLSearchParams();

    if (filters && filters.date) {
      params.append("date", filters.date);
    }
    if (filters && filters.client) {
      params.append("client", filters.client);
    }

    var queryString = params.toString();
    if (queryString) {
      url += "?" + queryString;
    }

    return url;
  }

  /* JSON réponse parse */
  function parseAppointments(responseText) {
    var data = responseText ? JSON.parse(responseText) : {};
    return data.appointments || [];
  }

  /* DOM créer ligne */
  function createRow(appointment) {
    var tr = document.createElement("tr");

    var clientTd = document.createElement("td");
    clientTd.textContent = appointment.client;
    tr.appendChild(clientTd);

    var dateTd = document.createElement("td");
    dateTd.textContent = appointment.date_display;
    tr.appendChild(dateTd);

    var timeTd = document.createElement("td");
    timeTd.textContent = appointment.time;
    tr.appendChild(timeTd);

    var notesTd = document.createElement("td");
    // XSS — exécute le HTML brut
    notesTd.innerHTML = appointment.notes || "";
    // FIX XSS — utiliser textContent
    // notesTd.textContent = appointment.notes || "";
    tr.appendChild(notesTd);

    var actionsTd = document.createElement("td");

    if (csrfToken) {
      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Modifier";

      /* event callback */
      editBtn.addEventListener("click", function () {
        if (typeof editAppointment === "function") {
          editAppointment(
            appointment.id,
            appointment.client,
            appointment.date,
            appointment.time,
            appointment.notes || ""
          );
        }
      });

      actionsTd.appendChild(editBtn);
    } else {
      actionsTd.textContent = "Actions via formulaire classique";
    }

    tr.appendChild(actionsTd);
    return tr;
  }

  /* rendu DOM */
  function renderAppointments(appointments) {
    clearTableBody();

    if (!appointments || appointments.length === 0) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "Aucun rendez-vous trouvé (AJAX)";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }
    appointments.forEach(function (appointment) {
      var row = createRow(appointment);
      tableBody.appendChild(row);
    });
  }

  /* async */
  function fetchAppointmentsAsync(filters, callback) {
    var url = buildAppointmentsUrl(filters);
    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        var appointments = parseAppointments(xhr.responseText);
        if (typeof callback === "function") {
          callback(appointments);
        }
      } else {
        console.error("Erreur AJAX async", xhr.status);
      }
    };

    xhr.send(null);
  }

  /* sync */
  function fetchAppointmentsSync(filters) {
    var url = buildAppointmentsUrl(filters);
    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, false);

    try {
      xhr.send(null);
    } catch (e) {
      console.error("Erreur AJAX sync");
      return [];
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      return parseAppointments(xhr.responseText);
    }

    return [];
  }

  /* UI async sync */
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
  }

  function handleToggleModeClick() {
    requestMode = requestMode === "async" ? "sync" : "async";
    updateModeUI();
  }

  if (modeButton) {
    modeButton.addEventListener("click", handleToggleModeClick);
  }

  updateModeUI();

  /*évenement*/
  function handleRefreshClick() {
    var filters = {
      date: filterDateInput ? filterDateInput.value : "",
      client: filterClientInput ? filterClientInput.value.trim() : ""
    };

    if (requestMode === "async") {
      console.log("ASYNC A");
      fetchAppointmentsAsync(filters, function (appointments) {
        console.log("ASYNC C");
        renderAppointments(appointments);
      });
      console.log("ASYNC B");
    } else {
      console.log("SYNC A");
      var appointments = fetchAppointmentsSync(filters);
      console.log("SYNC B");
      renderAppointments(appointments);
    }
  }

  /* callback d’événement utilisateur */
  refreshButton.addEventListener("click", handleRefreshClick);

})();
