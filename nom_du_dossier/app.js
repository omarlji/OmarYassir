/**
 * BIBLIOTHECA - Logique métier améliorée
 * Gestion : Livres (Stock), Auteurs, Éditions (Détails) et Emprunts (Téléphone)
 */

// --- MODULE AUTHENTIFICATION ---
const ADMIN_USER = { email: "admin@emsi.ma", pass: "12345" };
const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('login-section');
const appWrapper = document.getElementById('wrapper');
let instanceProgress = null;
let instanceLoanStatus = null; 

// Directions de tri (true = A-Z, false = Z-A)
let sortDirections = {
    books: true,
    authors: true,
    publishers: true,
    loans: true
};

if (loginForm) {
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;

        if (email === ADMIN_USER.email && pass === ADMIN_USER.pass) {
            sessionStorage.setItem('isLoggedIn', 'true');
            loginSection.classList.add('d-none');
            appWrapper.classList.remove('d-none');
            initialiserApplication();
        } else {
            const errorMsg = document.getElementById('loginError');
            errorMsg.classList.remove('d-none');
            setTimeout(() => errorMsg.classList.add('d-none'), 3000);
        }
    };
}

function deconnexion() {
    if(confirm("Voulez-vous vous déconnecter ?")) {
        sessionStorage.removeItem('isLoggedIn');
        window.location.reload();
    }
}

// --- LOGIQUE MÉTIER ---
let listeLivres = JSON.parse(localStorage.getItem('bibliotheca_livres')) || [];
let listeAuteurs = JSON.parse(localStorage.getItem('bibliotheca_auteurs')) || [{id: 1, nom: "Victor Hugo", nation: "Française", bio: "Écrivain célèbre", photo: ""}];
let listePublishers = JSON.parse(localStorage.getItem('bibliotheca_publishers')) || [];
let listeLoans = JSON.parse(localStorage.getItem('bibliotheca_loans')) || [];

let instanceGraphique = null; 
let modalModif = null;

function afficherSection(idSection) {
    document.querySelectorAll('.app-section').forEach(section => section.classList.add('d-none'));
    const sectionCible = document.getElementById(`${idSection}-section`);
    if (sectionCible) sectionCible.classList.remove('d-none');
    
    if(idSection === 'dashboard') mettreAJourStatistiques();
    if(idSection === 'publishers') afficherPublishers();
    if(idSection === 'loans') afficherLoans();
    if(idSection === 'authors') afficherAuteurs();
    if(idSection === 'books') {
        afficherLivres();
        mettreAJourSelects();
        injecterBoutonRechercheAPI(); 
    }
}

function lireImage(input) {
    return new Promise((resolve) => {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(input.files[0]);
        } else {
            resolve("");
        }
    });
}

function mettreAJourSelects() {
    const selAuteur = document.getElementById('bookAuthor');
    const selEditeur = document.getElementById('bookEditor');
    const selLoanBook = document.getElementById('loanBook');

    if (selAuteur) {
        selAuteur.innerHTML = '<option value="">Choisir un auteur...</option>' + 
            listeAuteurs.map(a => `<option value="${a.nom}">${a.nom}</option>`).join('');
    }
    if (selEditeur) {
        selEditeur.innerHTML = '<option value="">Choisir un éditeur...</option>' + 
            listePublishers.map(p => `<option value="${p.nom}">${p.nom}</option>`).join('');
    }
    if (selLoanBook) {
        selLoanBook.innerHTML = listeLivres.length > 0 
            ? listeLivres.map(l => `<option value="${l.titre}" ${l.stock <= 0 ? 'disabled' : ''}>${l.titre} (${l.stock} dispo)</option>`).join('')
            : '<option value="">Aucun livre disponible</option>';
    }
}

// --- FONCTIONS DE TRI ---
function toggleSort(section) {
    sortDirections[section] = !sortDirections[section];
    if (section === 'books') afficherLivres(document.getElementById('searchBar').value);
    if (section === 'authors') afficherAuteurs();
    if (section === 'publishers') afficherPublishers(document.getElementById('searchPublisher').value);
    if (section === 'loans') afficherLoans(document.getElementById('searchLoan')?.value || "");
}

/* =========================
   ✅ MODAL INSPECT 
========================= */
function ensureInspectModalExists(){
    if (document.getElementById('inspectBookModal')) return;

    const modalHtml = `
    <div class="modal fade" id="inspectBookModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title">
              <i class="fas fa-book-open me-2"></i>Détails du livre
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div id="inspectBookContent" class="row g-3"></div>
          </div>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/* =========================
   ✅ INSPECT LIVRE
========================= */
function inspectLivre(id){
    ensureInspectModalExists();

    const livre = listeLivres.find(l => l.id === id);
    if (!livre) return;

    const container = document.getElementById('inspectBookContent');
    if (!container) return;

    container.innerHTML = `
        <div class="col-md-6">
            <strong>Titre</strong>
            <p class="mb-2">${livre.titre}</p>
        </div>

        <div class="col-md-6">
            <strong>Auteur</strong>
            <p class="mb-2">${livre.auteur || 'N/A'}</p>
        </div>

        <div class="col-md-6">
            <strong>Maison d’édition</strong>
            <p class="mb-2">${livre.editeur || 'N/A'}</p>
        </div>

        <div class="col-md-6">
            <strong>Année de publication</strong>
            <p class="mb-2">${livre.date || 'N/A'}</p>
        </div>

        <div class="col-md-6">
            <strong>Stock</strong>
            <p class="mb-2">
                <span class="badge ${livre.stock > 0 ? 'bg-success' : 'bg-danger'}">
                    ${parseInt(livre.stock) || 0} en stock
                </span>
            </p>
        </div>

        <div class="col-12">
            <strong>Description</strong>
            <p class="text-muted mb-0">${livre.desc || 'Aucune description'}</p>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('inspectBookModal'));
    modal.show();
}

/* =========================
   🚀 RECHERCHE EXTERNE (Open Library)
========================= */
function injecterBoutonRechercheAPI() {
    const titleInput = document.getElementById('bookTitle');
    if (titleInput && !document.getElementById('btnSearchAPI')) {
        const btn = document.createElement('button');
        btn.id = 'btnSearchAPI';
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-secondary mt-1';
        btn.innerHTML = '<i class="fas fa-search"></i> Rechercher';
        btn.onclick = rechercherLivreExterne;
        titleInput.parentNode.appendChild(btn);

        const resultDiv = document.createElement('div');
        resultDiv.id = 'apiResults';
        resultDiv.className = 'list-group mt-2 shadow-sm';
        btn.parentNode.appendChild(resultDiv);
    }
}

async function rechercherLivreExterne() {
    const query = document.getElementById('bookTitle').value;
    const resultDiv = document.getElementById('apiResults');
    if (!query) return alert("Entrez un titre pour rechercher");

    resultDiv.innerHTML = '<div class="p-2 small">Recherche en cours...</div>';

    try {
        const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        
        resultDiv.innerHTML = "";
        if (data.docs.length === 0) {
            resultDiv.innerHTML = '<div class="p-2 small text-danger">Aucun résultat trouvé</div>';
            return;
        }

        data.docs.forEach(doc => {
            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = "list-group-item list-group-item-action small";
            btn.innerHTML = `<strong>${doc.title}</strong> - ${doc.author_name ? doc.author_name[0] : 'Inconnu'} (${doc.first_publish_year || '?'})`;
            btn.onclick = () => remplirChampsAPI(doc);
            resultDiv.appendChild(btn);
        });
    } catch (e) {
        resultDiv.innerHTML = '<div class="p-2 small text-danger">Erreur de connexion</div>';
    }
}

/**
 * Modification : On ne garde que l'année
 */
function remplirChampsAPI(doc) {
    document.getElementById('bookTitle').value = doc.title;
    
    const authorName = doc.author_name ? doc.author_name[0] : "";
    const selAuteur = document.getElementById('bookAuthor');
    
    if (authorName) {
        const existe = Array.from(selAuteur.options).some(opt => opt.value === authorName);
        if (!existe) {
            const opt = new Option(authorName, authorName);
            selAuteur.add(opt);
        }
        selAuteur.value = authorName;
    }

    // ON GARDE JUSTE L'ANNEE ICI
    if (doc.first_publish_year) {
        document.getElementById('bookDate').value = doc.first_publish_year;
    }

    document.getElementById('bookDesc').value = `Publié par : ${doc.publisher ? doc.publisher[0] : 'N/A'}. Langue : ${doc.language ? doc.language[0] : 'N/A'}`;
    document.getElementById('apiResults').innerHTML = "";
}


// --- MODULE : GESTION DES AUTEURS ---
const formulaireAuteur = document.getElementById('authorForm');
if (formulaireAuteur) {
    formulaireAuteur.onsubmit = async (e) => {
        e.preventDefault(); 
        const photoData = await lireImage(document.getElementById('authorPhoto'));
        const nouvelAuteur = { 
            id: Date.now(), 
            nom: document.getElementById('authorName').value.trim(),
            nation: document.getElementById('authorNation').value.trim(),
            bio: document.getElementById('authorBio').value.trim(),
            photo: photoData 
        };
        listeAuteurs.push(nouvelAuteur);
        sauvegarderAuteurs();
        formulaireAuteur.reset(); 
        bootstrap.Modal.getInstance(document.getElementById('authorModal')).hide();
    };
}

function sauvegarderAuteurs() {
    localStorage.setItem('bibliotheca_auteurs', JSON.stringify(listeAuteurs));
    afficherAuteurs();
    mettreAJourSelects();
}

function afficherAuteurs() {
    const conteneurListe = document.getElementById('authorsList');
    if (!conteneurListe) return;
    conteneurListe.innerHTML = "";
    
    const auteursTries = [...listeAuteurs].sort((a, b) => {
        return sortDirections.authors 
            ? a.nom.localeCompare(b.nom) 
            : b.nom.localeCompare(a.nom);
    });

    auteursTries.forEach(auteur => {
        const imgHtml = auteur.photo 
            ? `<img src="${auteur.photo}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; margin-right:15px;">`
            : `<div style="width:45px; height:45px; border-radius:50%; background:#e9ecef; display:inline-flex; align-items:center; justify-content:center; margin-right:15px;"><i class="fas fa-user text-muted"></i></div>`;

        conteneurListe.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    ${imgHtml}
                    <div>
                        <strong>${auteur.nom}</strong> <small class="text-muted">(${auteur.nation || 'N/A'})</small>
                        <p class="mb-0 small text-secondary italic">${auteur.bio || ''}</p>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="ouvrirModale(${auteur.id}, 'auteur')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="supprimerAuteur(${auteur.id})"><i class="fas fa-trash"></i></button>
                </div>
            </li>`;
    });
    mettreAJourSelects();
}

function supprimerAuteur(id) {
    if(confirm("Supprimer cet auteur ?")) {
        listeAuteurs = listeAuteurs.filter(a => a.id !== id);
        sauvegarderAuteurs();
    }
}

// --- MODULE : GESTION DES LIVRES ---
const formulaireLivre = document.getElementById('bookForm');
if (formulaireLivre) {
    formulaireLivre.onsubmit = (e) => {
        e.preventDefault();
        const nouveauLivre = { 
            id: Date.now(), 
            titre: document.getElementById('bookTitle').value.trim(), 
            auteur: document.getElementById('bookAuthor').value,
            date: document.getElementById('bookDate').value,
            editeur: document.getElementById('bookEditor').value,
            stock: parseInt(document.getElementById('bookStock').value) || 0,
            desc: document.getElementById('bookDesc').value.trim()
        };
        listeLivres.push(nouveauLivre);
        sauvegarderLivres();
        formulaireLivre.reset();
        document.getElementById('apiResults').innerHTML = ""; 
        bootstrap.Modal.getInstance(document.getElementById('bookModal')).hide();
    };
}

function sauvegarderLivres() {
    localStorage.setItem('bibliotheca_livres', JSON.stringify(listeLivres));
    afficherLivres();
    mettreAJourStatistiques();
    mettreAJourSelects();
}

function afficherLivres(filtre = "") {
    const corpsTableau = document.getElementById('booksList');
    if (!corpsTableau) return;
    corpsTableau.innerHTML = "";
    
    const livresFiltrés = listeLivres
        .filter(livre => livre.titre.toLowerCase().includes(filtre.toLowerCase()))
        .sort((a, b) => {
            return sortDirections.books 
                ? a.titre.localeCompare(b.titre) 
                : b.titre.localeCompare(a.titre);
        });

    livresFiltrés.forEach(livre => {
        const stockBadge = livre.stock > 0 ? 'bg-success' : 'bg-danger';
        
        // On s'assure de n'afficher que les 4 premiers caractères si c'est une date complète
        const anneeAffiche = livre.date ? livre.date.toString().substring(0, 4) : 'N/A';

        corpsTableau.innerHTML += `
            <tr>
                <td><strong>${livre.titre}</strong><br><small class="text-muted">${livre.desc || ''}</small></td>
                <td>${livre.auteur}</td>
                <td>${livre.editeur || 'N/A'} <br> <span class="badge bg-light text-dark">${anneeAffiche}</span></td>
                <td><span class="badge ${stockBadge}">${livre.stock} en stock</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-info text-white me-1" onclick="inspectLivre(${livre.id})" title="Inspecter le livre">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1 text-white" onclick="ouvrirModale(${livre.id}, 'livre')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="supprimerLivre(${livre.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

function supprimerLivre(id) {
    if(confirm("Voulez-vous supprimer ce livre ?")) {
        listeLivres = listeLivres.filter(l => l.id !== id);
        sauvegarderLivres();
    }
}

// --- MODULE : MAISONS D'ÉDITION ---
const publisherForm = document.getElementById('publisherForm');
if (publisherForm) {
    publisherForm.onsubmit = (e) => {
        e.preventDefault();
        const pub = { 
            id: Date.now(), 
            nom: document.getElementById('pubName').value.trim(),
            adresse: document.getElementById('pubAddress').value.trim(),
            contact: document.getElementById('pubContact').value.trim()
        };
        listePublishers.push(pub);
        localStorage.setItem('bibliotheca_publishers', JSON.stringify(listePublishers));
        publisherForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('publisherModal')).hide();
        afficherPublishers();
        mettreAJourSelects();
    };
}

function afficherPublishers(filtre = "") {
    const list = document.getElementById('publishersList');
    if(!list) return;

    const publishersFiltrés = listePublishers
        .filter(p => p.nom.toLowerCase().includes(filtre.toLowerCase()))
        .sort((a, b) => {
            return sortDirections.publishers 
                ? a.nom.localeCompare(b.nom) 
                : b.nom.localeCompare(a.nom);
        });

    list.innerHTML = publishersFiltrés.map(p => `
        <div class="col-md-6 mb-3">
            <div class="card p-3 shadow-sm border-0">
                <div class="d-flex justify-content-between">
                    <div>
                        <h5 class="mb-1 text-primary">${p.nom}</h5>
                        <p class="mb-0 small text-muted"><i class="fas fa-map-marker-alt me-2"></i>${p.adresse || 'Sans adresse'}</p>
                        <p class="mb-0 small text-muted"><i class="fas fa-phone me-2"></i>${p.contact || 'Sans contact'}</p>
                    </div>
                    <button class="btn btn-sm text-danger" onclick="supprimerPublisher(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function supprimerPublisher(id) {
    if(confirm("Supprimer cette maison d'édition ?")) {
        listePublishers = listePublishers.filter(p => p.id !== id);
        localStorage.setItem('bibliotheca_publishers', JSON.stringify(listePublishers));
        afficherPublishers();
        mettreAJourSelects();
    }
}

// --- MODULE : EMPRUNTS ---
const loanForm = document.getElementById('loanForm');
if (loanForm) {
    loanForm.onsubmit = (e) => {
        e.preventDefault();
        const livreTitre = document.getElementById('loanBook').value;
        const indexLivre = listeLivres.findIndex(l => l.titre === livreTitre);

        if (indexLivre === -1 || listeLivres[indexLivre].stock <= 0) {
            alert("Erreur : Ce livre n'est plus disponible en stock.");
            return;
        }

        const loan = {
            id: Date.now(),
            livre: livreTitre,
            emprunteur: document.getElementById('borrowerName').value.trim(),
            telephone: document.getElementById('borrowerPhone').value.trim(),
            dateLoan: document.getElementById('loanDate').value,
            dateReturn: document.getElementById('returnDate').value
        };

        listeLivres[indexLivre].stock -= 1; 
        listeLoans.push(loan);
        
        localStorage.setItem('bibliotheca_loans', JSON.stringify(listeLoans));
        sauvegarderLivres();
        
        loanForm.reset();
        bootstrap.Modal.getInstance(document.getElementById('loanModal')).hide();
        afficherLoans();
    };
}

function afficherLoans(filtre = "") {
    const list = document.getElementById('loansList');
    if(!list) return;

    const loansFiltrés = listeLoans
        .filter(loan => 
            loan.emprunteur.toLowerCase().includes(filtre.toLowerCase()) || 
            loan.livre.toLowerCase().includes(filtre.toLowerCase())
        )
        .sort((a, b) => {
            return sortDirections.loans 
                ? a.livre.localeCompare(b.livre) 
                : b.livre.localeCompare(a.livre);
        });

    list.innerHTML = loansFiltrés.map(loan => `
        <tr>
            <td><strong>${loan.livre}</strong></td>
            <td>
                <strong>${loan.emprunteur}</strong><br>
                <small class="text-muted"><i class="fas fa-phone me-1"></i>${loan.telephone}</small>
            </td>
            <td>${loan.dateLoan}</td>
            <td><span class="badge bg-warning text-dark">${loan.dateReturn}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-success" onclick="retournerLivre(${loan.id})">
                    <i class="fas fa-undo me-1"></i> Rendre
                </button>
            </td>
        </tr>
    `).join('');
    mettreAJourSelects();
}

function retournerLivre(id) {
    if(confirm("Confirmer le retour de ce livre ?")) {
        const loan = listeLoans.find(l => l.id === id);
        const indexLivre = listeLivres.findIndex(l => l.titre === loan.livre);
        
        if(indexLivre !== -1) {
            listeLivres[indexLivre].stock += 1; 
        }

        listeLoans = listeLoans.filter(l => l.id !== id);
        localStorage.setItem('bibliotheca_loans', JSON.stringify(listeLoans));
        sauvegarderLivres();
        afficherLoans();
    }
}

// --- LOGIQUE DE MODIFICATION ---
function ouvrirModale(id, type) {
    const container = document.getElementById('editFieldsContainer');
    document.getElementById('editId').value = id;
    document.getElementById('editType').value = type;
    container.innerHTML = ""; 

    if (type === 'livre') {
        const livre = listeLivres.find(l => l.id === id);
        let auteurOptions = listeAuteurs.map(a => `<option value="${a.nom}" ${a.nom === livre.auteur ? 'selected' : ''}>${a.nom}</option>`).join('');
        let editeurOptions = listePublishers.map(p => `<option value="${p.nom}" ${p.nom === livre.editeur ? 'selected' : ''}>${p.nom}</option>`).join('');

        container.innerHTML = `
            <div class="col-md-6"><label class="custom-label">Titre</label><input type="text" id="updTitre" class="custom-input" value="${livre.titre}"></div>
            <div class="col-md-6"><label class="custom-label">Auteur</label><select id="updAuteur" class="custom-input">${auteurOptions}</select></div>
            <div class="col-md-6"><label class="custom-label">Année de Publication</label><input type="text" id="updDate" class="custom-input" value="${livre.date || ''}"></div>
            <div class="col-md-6"><label class="custom-label">Éditeur</label><select id="updEditor" class="custom-input">${editeurOptions}</select></div>
            <div class="col-md-6"><label class="custom-label">Stock</label><input type="number" id="updStock" class="custom-input" value="${livre.stock}"></div>
            <div class="col-md-12"><label class="custom-label">Description</label><textarea id="updDesc" class="custom-input" rows="3">${livre.desc || ''}</textarea></div>`;
    } else {
        const auteur = listeAuteurs.find(a => a.id === id);
        container.innerHTML = `
            <div class="col-md-6"><label class="custom-label">Nom</label><input type="text" id="updNom" class="custom-input" value="${auteur.nom}"></div>
            <div class="col-md-6"><label class="custom-label">Nationalité</label><input type="text" id="updNation" class="custom-input" value="${auteur.nation || ''}"></div>
            <div class="col-md-12"><label class="custom-label">Biographie</label><textarea id="updBio" class="custom-input" rows="3">${auteur.bio || ''}</textarea></div>
            <div class="col-md-12"><label class="custom-label">Changer la photo</label><input type="file" id="updPhoto" class="custom-input" accept="image/*"></div>`;
    }
    
    if (!modalModif) modalModif = new bootstrap.Modal(document.getElementById('editModal'));
    modalModif.show();
}

const editForm = document.getElementById('editForm');
if (editForm) {
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('editId').value);
        const type = document.getElementById('editType').value;

        if (type === 'livre') {
            const index = listeLivres.findIndex(l => l.id === id);
            listeLivres[index].titre = document.getElementById('updTitre').value;
            listeLivres[index].auteur = document.getElementById('updAuteur').value;
            listeLivres[index].date = document.getElementById('updDate').value;
            listeLivres[index].editeur = document.getElementById('updEditor').value;
            listeLivres[index].stock = parseInt(document.getElementById('updStock').value) || 0;
            listeLivres[index].desc = document.getElementById('updDesc').value;
            sauvegarderLivres();
        } else {
            const index = listeAuteurs.findIndex(a => a.id === id);
            listeAuteurs[index].nom = document.getElementById('updNom').value;
            listeAuteurs[index].nation = document.getElementById('updNation').value;
            listeAuteurs[index].bio = document.getElementById('updBio').value;
            const nouvellePhoto = await lireImage(document.getElementById('updPhoto'));
            if(nouvellePhoto) listeAuteurs[index].photo = nouvellePhoto;
            sauvegarderAuteurs();
        }
        modalModif.hide();
    };
}

// --- MODULE : DASHBOARD & API ---
async function recupererDonneesExternes() {
    try {
        const reponse = await fetch('https://openlibrary.org/subjects/literature.json?limit=1');
        const donnees = await reponse.json();
        const elementKpi = document.getElementById('kpi-api');
        if (elementKpi) elementKpi.innerText = donnees.work_count.toLocaleString();
    } catch (erreur) { console.error("Erreur API :", erreur); }
}

function mettreAJourStatistiques() {
    const kpiLivres = document.getElementById('kpi-books');
    const kpiAuteurs = document.getElementById('kpi-authors');
    const kpiLoans = document.getElementById('kpi-loans'); 
    
    if (kpiLivres) kpiLivres.innerText = listeLivres.length;
    if (kpiAuteurs) kpiAuteurs.innerText = listeAuteurs.length;
    if (kpiLoans) kpiLoans.innerText = listeLoans.length;
    
    const canvas = document.getElementById('myChart');
    if (!canvas) return;
    if (instanceGraphique) instanceGraphique.destroy();
    instanceGraphique = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Livres', 'Auteurs', 'Emprunts'],
            datasets: [{ 
                label: 'Total', 
                data: [listeLivres.length, listeAuteurs.length, listeLoans.length], 
                backgroundColor: ['#0d6efd', '#198754', '#ffc107'], 
                borderRadius: 5 
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
    renderExtraCharts();
}

function renderExtraCharts() {
    const canvasProgress = document.getElementById('chartProgress');
    if (canvasProgress) {
        if (instanceProgress) instanceProgress.destroy();
        const borrowedTitlesSet = new Set(listeLoans.map(l => (l.livre || "").trim()).filter(Boolean));
        let borrowed = 0, available = 0, out = 0;
        listeLivres.forEach(b => {
            const titre = (b.titre || "").trim();
            const isBorrowed = borrowedTitlesSet.has(titre);
            if (isBorrowed) borrowed++;
            else if ((parseInt(b.stock) || 0) > 0) available++;
            else out++;
        });
        instanceProgress = new Chart(canvasProgress.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Borrowed', 'Available', 'Out of stock'],
                datasets: [{
                    data: [borrowed, available, out],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                cutout: '72%',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    const canvasLoanStatus = document.getElementById('chartLoanStatus');
    if (canvasLoanStatus) {
        if (instanceLoanStatus) instanceLoanStatus.destroy();
        const counts = {};
        listeAuteurs.forEach(a => counts[a.nom] = 0);
        listeLivres.forEach(l => {
            if (counts[l.auteur] !== undefined) counts[l.auteur]++;
            else counts[l.auteur] = 1;
        });
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        instanceLoanStatus = new Chart(canvasLoanStatus.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Livres par auteur',
                    data: data,
                    backgroundColor: '#6610f2',
                    borderRadius: 12,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
}

// --- INITIALISATION ---
function initialiserApplication() {
    mettreAJourSelects();
    afficherAuteurs();
    afficherLivres();
    afficherPublishers();
    afficherLoans();
    recupererDonneesExternes();
    mettreAJourStatistiques();
    injecterBoutonRechercheAPI();

    // Recherche Livres
    const searchBar = document.getElementById('searchBar');
    if (searchBar) searchBar.oninput = (e) => afficherLivres(e.target.value);

    // Recherche Éditeurs
    const searchPublisher = document.getElementById('searchPublisher');
    if (searchPublisher) searchPublisher.oninput = (e) => afficherPublishers(e.target.value);

    // Recherche Emprunts
    const searchLoan = document.getElementById('searchLoan');
    if (searchLoan) searchLoan.oninput = (e) => afficherLoans(e.target.value);

    ensureInspectModalExists();
}

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        if (loginSection) loginSection.classList.add('d-none');
        if (appWrapper) appWrapper.classList.remove('d-none');
        initialiserApplication();
    }
});