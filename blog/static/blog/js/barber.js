(function () {
  // =========================
  // CONFIG
  // =========================
  const config = {
    highlightImportantClients: true,
    importantClients: ["Poumin", "VIP", "Important"],
  };

  // =========================
  // ELEMENTS (planning)
  // =========================
  const tableBody = document.getElementById("appointments-body");
  const refreshButton = document.getElementById("refresh-ajax");
  const filterDateInput = document.getElementById("filter-date");
  const filterClientInput = document.getElementById("filter-client");

  // =========================
  // ELEMENTS (copilot)
  // =========================
  const copilot = document.getElementById("copilot"); // <aside id="copilot">
  const copilotFab = document.getElementById("copilot-fab"); // bouton IA (hors chat)
  const copilotClose = document.getElementById("copilot-close");

  const copilotInput = document.getElementById("copilot-input");
  const copilotSubmit = document.getElementById("copilot-submit"); // ➤ analyser/envoyer
  const copilotFill = document.getElementById("copilot-fill");     // 🧠 remplir
  const copilotSave = document.getElementById("copilot-save");     // 💾 enregistrer
  const copilotOutput = document.getElementById("copilot-output");

  // =========================
  // CSRF
  // =========================
  const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
  const csrfToken = csrfInput ? csrfInput.value : "";

  // =========================
  // STATE
  // =========================
  let lastCopilotData = null;

  // =========================
  // Helpers UI
  // =========================
  function showCopilotError(msg) {
    if (copilotOutput) copilotOutput.textContent = msg;
    lastCopilotData = null;
  }

  function safeText(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  // =========================
  // Date helpers / parsing (EU strict WITH separators ONLY)
  // =========================
  function toYearFrom2Digits(yy) {
    const n = Number(yy);
    return n <= 79 ? 2000 + n : 1900 + n;
  }

  function buildValidDate(dd, mm, yyyy) {
    dd = Number(dd); mm = Number(mm); yyyy = Number(yyyy);
    if (!Number.isInteger(dd) || !Number.isInteger(mm) || !Number.isInteger(yyyy)) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null;

    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== (mm - 1) || d.getDate() !== dd) return null;

    const iso = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    return { iso, dd, mm, yyyy };
  }

  function isIsoDate(s) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());
  }

  // ✅ Autorisés: d/m/yy, d/m/yyyy, dd/mm/yy, dd/mm/yyyy (avec ., /, -)
  // ❌ Refusés: tout ce qui n’a pas de séparateur (101026, 10102025, 010125, 1125, etc.)
  function parseEuropeanDateStrict(input) {
    if (!input) return null;

    const raw = String(input)
      .trim()
      .replace(/[,;]+$/g, ""); // enlève ponctuation finale

    // ISO (si jamais le backend renvoie déjà ça)
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) return buildValidDate(m[3], m[2], m[1]);

    // d[./-]m[./-]yyyy
    m = /^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/.exec(raw);
    if (m) return buildValidDate(m[1], m[2], m[3]);

    // d[./-]m[./-]yy
    m = /^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2})$/.exec(raw);
    if (m) return buildValidDate(m[1], m[2], toYearFrom2Digits(m[3]));

    return null;
  }

  function formatDateFrench(iso) {
    if (!iso || !isIsoDate(iso)) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const months = [
      "janvier","février","mars","avril","mai","juin",
      "juillet","août","septembre","octobre","novembre","décembre"
    ];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  // =========================
  // Time parsing (EU strict)
  // =========================
  function buildValidTime(hh, mm) {
    hh = Number(hh); mm = Number(mm);
    if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
    if (hh < 0 || hh > 23) return null;
    if (mm < 0 || mm > 59) return null;
    return { hh, min: mm, hm: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` };
  }

  // ✅ Autorisés: 13H, 13h, 13, 01, 1 | 1300, 0100 | 13:00, 1:00 | 13H00
  // ❌ Interdit: 3 chiffres
  function parseEuropeanTimeStrict(input) {
    if (!input) return null;
    const s = String(input).trim();

    // 3 chiffres interdits
    if (/^\d{3}$/.test(s)) return null;

    // H:MM / HH:MM
    let m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (m) return buildValidTime(m[1], m[2]);

    // HhMM / HHhMM
    m = /^(\d{1,2})[hH](\d{2})$/.exec(s);
    if (m) return buildValidTime(m[1], m[2]);

    // HHMM (4 chiffres)
    m = /^(\d{4})$/.exec(s);
    if (m) {
      const hh = s.slice(0, 2);
      const mm = s.slice(2, 4);
      return buildValidTime(hh, mm);
    }

    // H / HH / Hh / HHh -> minutes = 00
    m = /^(\d{1,2})(?:[hH])?$/.exec(s);
    if (m) return buildValidTime(m[1], 0);

    return null;
  }

  // =========================
  // Date/Time validation (past)
  // =========================
  function todayIso() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isPastDateIso(dateIso) {
    return dateIso < todayIso(); // compare ISO OK
  }

  function isPastTimeForDate(dateIso, timeHm) {
    if (dateIso !== todayIso()) return false;
    const now = new Date();
    const [hh, mm] = timeHm.split(":").map(Number);
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    return candidate.getTime() < now.getTime();
  }

  // =========================
  // Copilot output (human)
  // =========================
  function renderCopilotHuman(data) {
    if (!copilotOutput) return;

    const client = safeText(data.client) || "—";
    const dateIso = isIsoDate(data.date) ? data.date : "";
    const dateHuman = dateIso ? formatDateFrench(dateIso) : "—";
    const time = safeText(data.time) || "—";
    const notes = safeText(data.notes) || "—";

    copilotOutput.textContent =
      `Client : ${client}\n` +
      `Date   : ${dateHuman}\n` +
      `Heure  : ${time}\n` +
      `Notes  : ${notes}`;
  }

  // =========================================================
  // RENDER TABLE (AJAX)
  // =========================================================
  function renderAppointments(appointments) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

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

      if (config.highlightImportantClients && config.importantClients.includes(appt.client)) {
        clientSpan.style.fontWeight = "bold";
      }

      clientTd.appendChild(clientSpan);
      tr.appendChild(clientTd);

      const dateTd = document.createElement("td");
      dateTd.textContent = appt.date_display || appt.date || "";
      tr.appendChild(dateTd);

      const timeTd = document.createElement("td");
      timeTd.textContent = appt.time || "";
      tr.appendChild(timeTd);

      const notesTd = document.createElement("td");
      notesTd.textContent = appt.notes || "";
      tr.appendChild(notesTd);

      const actionsTd = document.createElement("td");
      actionsTd.classList.add("actions");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.classList.add("btn", "small", "ghost");
      editBtn.textContent = "Modifier";
      editBtn.addEventListener("click", () => {
        if (typeof window.editAppointment === "function") {
          window.editAppointment(appt.id, appt.client, appt.date, appt.time, appt.notes || "");
        }
      });
      actionsTd.appendChild(editBtn);

      if (csrfToken) {
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

  // =========================================================
  // FILTRAGE AJAX (FETCH)
  // =========================================================
  function fetchAppointments(filters) {
    let url = "/api/appointments/";
    const params = new URLSearchParams();
    if (filters?.date) params.append("date", filters.date);
    if (filters?.client) params.append("client", filters.client);
    const qs = params.toString();
    if (qs) url += "?" + qs;
    return fetch(url).then((res) => res.json());
  }

  function handleRefreshClick() {
    const date = filterDateInput ? filterDateInput.value : "";
    const client = filterClientInput ? filterClientInput.value.trim() : "";

    fetchAppointments({ date, client })
      .then((data) => renderAppointments(data.appointments || []))
      .catch((err) => console.error("[BarberWeb] Erreur AJAX:", err));
  }

  if (refreshButton) refreshButton.addEventListener("click", handleRefreshClick);

  // =========================================================
  // COPILOT UI (toggle)
  // =========================================================
  function openCopilot() {
    document.body.classList.add("copilot-open");
    if (copilot) copilot.setAttribute("aria-hidden", "false");
    if (copilotFab) copilotFab.setAttribute("aria-expanded", "true");
  }

  function closeCopilot() {
    document.body.classList.remove("copilot-open");
    if (copilot) copilot.setAttribute("aria-hidden", "true");
    if (copilotFab) copilotFab.setAttribute("aria-expanded", "false");
  }

  function toggleCopilot() {
    document.body.classList.contains("copilot-open") ? closeCopilot() : openCopilot();
  }

  if (copilotFab) copilotFab.addEventListener("click", toggleCopilot);
  if (copilotClose) copilotClose.addEventListener("click", closeCopilot);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("copilot-open")) closeCopilot();
  });

  // =========================================================
  // COPILOT PARSE (FETCH) + VALIDATION EU
  // =========================================================
  function copilotParse(text) {
    if (!text) return;

    lastCopilotData = null;
    if (copilotOutput) copilotOutput.textContent = "Analyse en cours…";

    fetch("/copilot/parse/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken
      },
      body: JSON.stringify({ text })
    })
      .then((res) => res.json())
      .then((data) => {
        // --- DATE ---
        if (data.date != null) {
          if (isIsoDate(data.date)) {
            if (isPastDateIso(data.date)) {
              showCopilotError("Date invalide : elle est dans le passé.");
              return;
            }
          } else {
            const parsedDate = parseEuropeanDateStrict(data.date);
            if (!parsedDate) {
              showCopilotError(
                "Date invalide. Utilise un format avec séparateurs : 10/10/26, 10.10.2026 ou 10-10-2026. (Sans séparateurs = refusé)"
              );
              return;
            }
            if (isPastDateIso(parsedDate.iso)) {
              showCopilotError("Date invalide : elle est dans le passé.");
              return;
            }
            data.date = parsedDate.iso;
          }
        }

        // --- TIME ---
        if (data.time != null) {
          const parsedTime = parseEuropeanTimeStrict(data.time);
          if (!parsedTime) {
            showCopilotError(
              "Heure invalide. Exemples : 13, 13h, 13:00, 1:00, 1300, 13h00. (3 chiffres interdits)"
            );
            return;
          }

          const dateToCheck = (data.date && isIsoDate(data.date))
            ? data.date
            : (document.getElementById("id_date")?.value || "");

          if (dateToCheck && isPastTimeForDate(dateToCheck, parsedTime.hm)) {
            showCopilotError("Heure invalide : elle est dans le passé.");
            return;
          }

          data.time = parsedTime.hm;
        }

        lastCopilotData = data;
        renderCopilotHuman(data);
      })
      .catch((err) => {
        console.error("[Copilot] Erreur:", err);
        showCopilotError("Erreur Copilot");
      });
  }

  function fillFormFromCopilot(data) {
    if (!data) return;

    const elClient = document.getElementById("id_client");
    const elDate = document.getElementById("id_date");
    const elTime = document.getElementById("id_time");
    const elNotes = document.getElementById("id_notes");

    if (data.client != null && elClient) elClient.value = data.client;
    if (data.date != null && elDate) elDate.value = data.date;
    if (data.time != null && elTime) elTime.value = data.time;
    if (data.notes != null && elNotes) elNotes.value = data.notes;

    document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function runCopilotFromInput() {
    const text = (copilotInput ? copilotInput.value : "").trim();
    copilotParse(text);
  }

  // ➤ analyser = envoyer
  if (copilotSubmit) copilotSubmit.addEventListener("click", runCopilotFromInput);

  // Enter dans l’input = analyser
  if (copilotInput) {
    copilotInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runCopilotFromInput();
      }
    });
  }

  // 🧠 remplir
  if (copilotFill) {
    copilotFill.addEventListener("click", () => {
      if (!lastCopilotData) {
        showCopilotError("Analyse d’abord le texte.");
        return;
      }
      fillFormFromCopilot(lastCopilotData);
      renderCopilotHuman(lastCopilotData);
    });
  }

  // 💾 enregistrer
  if (copilotSave) {
    copilotSave.addEventListener("click", () => {
      const form = document.getElementById("appointment-form");
      if (!form) return;

      const client = document.getElementById("id_client")?.value?.trim();
      const date = document.getElementById("id_date")?.value?.trim();
      const time = document.getElementById("id_time")?.value?.trim();

      if (!client || !date || !time) {
        showCopilotError("Formulaire incomplet : client, date et heure sont obligatoires.");
        return;
      }

      if (!isIsoDate(date)) {
        showCopilotError("Date invalide : utilise le sélecteur ou un format reconnu via l’IA.");
        return;
      }

      if (isPastDateIso(date)) {
        showCopilotError("Date invalide : elle est dans le passé.");
        return;
      }

      if (isPastTimeForDate(date, time)) {
        showCopilotError("Heure invalide : elle est dans le passé.");
        return;
      }

      form.submit();
    });
  }
})();
