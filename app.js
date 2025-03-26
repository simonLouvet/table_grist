// URLs des API
const RECORDS_API_URL = 'https://grappe.io/data/api/67e2ed7dfa335e76dbf6c489-thera_get_records';
const COLUMNS_API_URL = 'https://grappe.io/data/api/67e2ee43fa335e76dbf6c4e3-thera_get_columns';

// Variables globales
let therapists = [];
let columns = [];
let activeFilters = {};
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentView = 'list'; // Nouvelle variable pour suivre la vue actuelle ('list' ou 'profile')
let selectedTherapistId = null; // Pour stocker l'ID du thérapeute sélectionné

// Fonction principale d'initialisation
async function init() {
    try {
        showLoading();
        
        // Récupérer les données des colonnes et des thérapeutes en parallèle
        const [columnsData, therapistsData] = await Promise.all([
            fetchData(COLUMNS_API_URL),
            fetchData(RECORDS_API_URL)
        ]);
        
        columns = columnsData;
        therapists = therapistsData;
        
        // Initialiser les filtres et afficher les données
        initializeFilters();
        initializeSortOptions();
        renderTherapists();
        
        // Initialiser les gestionnaires d'événements pour la vue détaillée
        initializeProfileViewHandlers();
        
        hideLoading();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showError('Une erreur est survenue lors du chargement des données. Veuillez réessayer plus tard.');
        hideLoading();
    }
}

// Fonction pour récupérer les données depuis une API
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erreur lors de la récupération des données depuis ${url}:`, error);
        throw error;
    }
}

// Fonction pour initialiser les filtres
function initializeFilters() {
    const filterContainer = document.getElementById('filter-options');
    filterContainer.innerHTML = '';
    
    columns.forEach(column => {
        // Vérifier si la colonne est de type Choice (choix multiples)
        if (column.fields.type === 'Choice') {
            const filterGroup = document.createElement('div');
            filterGroup.className = 'filter-group';
            
            const title = document.createElement('h3');
            title.textContent = column.fields.label;
            filterGroup.appendChild(title);
            
            // Extraire les choix disponibles
            const widgetOptions = JSON.parse(column.fields.widgetOptions);
            const choices = widgetOptions.choices || [];
            
            // Créer une case à cocher pour chaque choix
            choices.forEach(choice => {
                const checkboxGroup = document.createElement('div');
                checkboxGroup.className = 'checkbox-group';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `${column.id}-${choice}`;
                checkbox.value = choice;
                checkbox.addEventListener('change', () => {
                    updateFilters(column.id, choice, checkbox.checked);
                });
                
                const label = document.createElement('label');
                label.htmlFor = `${column.id}-${choice}`;
                label.textContent = choice;
                
                checkboxGroup.appendChild(checkbox);
                checkboxGroup.appendChild(label);
                filterGroup.appendChild(checkboxGroup);
            });
            
            filterContainer.appendChild(filterGroup);
        }
    });
}

// Fonction pour initialiser les options de tri
function initializeSortOptions() {
    const sortSelect = document.getElementById('sort-select');
    
    // Conserver l'option par défaut et ajouter les autres options
    while (sortSelect.options.length > 1) {
        sortSelect.remove(1);
    }
    
    // Ajouter une option pour chaque colonne
    columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.id;
        option.textContent = column.fields.label;
        sortSelect.appendChild(option);
    });
    
    sortSelect.addEventListener('change', (e) => {
        currentSortColumn = e.target.value;
        currentSortDirection = 'asc';
        renderTherapists();
    });
    
    // Ajouter l'événement au bouton de direction de tri
    const directionBtn = document.querySelector('.sort-direction-btn');
    directionBtn.addEventListener('click', () => {
        if (currentSortColumn) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            renderTherapists();
        }
    });
}

// Fonction pour initialiser les gestionnaires d'événements pour la vue détaillée
function initializeProfileViewHandlers() {
    // Gestionnaire pour le bouton de retour aux résultats
    document.getElementById('back-to-results').addEventListener('click', function() {
        document.getElementById('profile-detail').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        document.getElementById('filters').style.display = 'block';
        updateParentHeight();
    });
}

// Fonction pour mettre à jour les filtres actifs
function updateFilters(columnId, value, isChecked) {
    if (!activeFilters[columnId]) {
        activeFilters[columnId] = [];
    }
    
    if (isChecked) {
        // Ajouter la valeur au filtre
        if (!activeFilters[columnId].includes(value)) {
            activeFilters[columnId].push(value);
        }
    } else {
        // Supprimer la valeur du filtre
        activeFilters[columnId] = activeFilters[columnId].filter(v => v !== value);
        
        // Supprimer la clé si le tableau est vide
        if (activeFilters[columnId].length === 0) {
            delete activeFilters[columnId];
        }
    }
    
    // Mettre à jour l'affichage
    renderTherapists();
}

// Fonction pour filtrer les thérapeutes selon les filtres actifs
function filterTherapists(therapists) {
    if (Object.keys(activeFilters).length === 0) {
        return therapists;
    }
    
    return therapists.filter(therapist => {
        // Vérifier chaque filtre actif
        for (const [columnId, values] of Object.entries(activeFilters)) {
            if (values.length > 0 && !values.includes(therapist[columnId])) {
                return false;
            }
        }
        return true;
    });
}

// Fonction pour trier les thérapeutes
function sortTherapists(therapists) {
    if (!currentSortColumn) {
        return therapists;
    }
    
    return [...therapists].sort((a, b) => {
        const valueA = a[currentSortColumn] || '';
        const valueB = b[currentSortColumn] || '';
        
        let comparison = 0;
        if (valueA > valueB) {
            comparison = 1;
        } else if (valueA < valueB) {
            comparison = -1;
        }
        
        return currentSortDirection === 'desc' ? comparison * -1 : comparison;
    });
}

// Fonction pour afficher les thérapeutes
function renderTherapists() {
    const container = document.getElementById('therapists-list');
    container.innerHTML = '';
    
    // Filtrer et trier les thérapeutes
    const filteredTherapists = filterTherapists(therapists);
    const sortedTherapists = sortTherapists(filteredTherapists);
    
    // Afficher le message "Aucun résultat" si nécessaire
    if (sortedTherapists.length === 0) {
        document.getElementById('no-results').style.display = 'block';
        return;
    } else {
        document.getElementById('no-results').style.display = 'none';
    }
    
    // Créer une carte pour chaque thérapeute
    sortedTherapists.forEach(therapist => {
        const template = document.getElementById('therapist-card-template');
        const card = document.importNode(template.content, true);
        
        // Sélectionner tous les éléments avec un attribut data-field dans la carte
        const fieldElements = card.querySelectorAll('[data-field]');
        
        fieldElements.forEach(element => {
            const fieldName = element.getAttribute('data-field');
            
            // Traiter différemment selon le type d'élément
            if (element.tagName === 'IMG') {
                // Cas spécial pour les images
                const value = therapist[fieldName];
                if (value && Array.isArray(value) && value.length >= 2 && value[0] === "L") {
                    const attachmentId = value[1];
                    element.src = `http://localhost/data/api/67e330227da953bf388dfbb1-attachement/${attachmentId}`;
                    element.style.display = 'block';
                } else {
                    // Cacher l'élément si pas d'image
                    element.style.display = 'none';
                }
            } else {
                // Vérifier si c'est un champ de type Choice (choix multiple)
                const column = columns.find(col => col.id === fieldName);
                if (column && column.fields.type === 'Choice') {
                    // Vider le contenu existant
                    element.innerHTML = '';
                    
                    // Créer des tags pour chaque valeur
                    const values = Array.isArray(therapist[fieldName]) 
                        ? therapist[fieldName] 
                        : [therapist[fieldName]];
                    
                    values.forEach(value => {
                        if (value) {
                            const tag = document.createElement('span');
                            tag.className = 'choice-tag';
                            tag.textContent = value;
                            element.appendChild(tag);
                        }
                    });
                } else {
                    // Pour les autres éléments, simplement définir le contenu texte
                    element.textContent = therapist[fieldName] || '';
                }
            }
        });
        
        // Ajouter un gestionnaire d'événements pour le bouton "Voir le profil"
        const profileBtn = card.querySelector('.profile-btn');
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showProfileDetail(therapist);
        });
        
        container.appendChild(card);
    });
    
    // Mettre à jour la hauteur du conteneur parent
    updateParentHeight();
}

// Fonction pour afficher la vue détaillée du profil
function showProfileDetail(therapistData) {
    // Masquer les sections de résultats et de filtres
    document.getElementById('results').style.display = 'none';
    document.getElementById('filters').style.display = 'none';
    
    // Analyser les balises dans profile-content et remplir avec les données appropriées
    const profileContent = document.querySelector('.profile-content');
    
    // Garder une trace des champs déjà rendus
    const renderedFields = new Set();
    
    if (profileContent) {
        // Sélectionner tous les éléments avec un attribut data-field
        const fieldElements = profileContent.querySelectorAll('[data-field]');
        
        fieldElements.forEach(element => {
            const fieldName = element.getAttribute('data-field');
            renderedFields.add(fieldName); // Ajouter à la liste des champs déjà rendus
            

                // Traiter différemment selon le type d'élément
                if (element.tagName === 'IMG') {
                    // Cas spécial pour les images
                    console.log('____ photo');
                    const value = therapistData[fieldName];
                    console.log('____ value', value);
                    if (value && Array.isArray(value) && value.length >= 2 && value[0] === "L") {
                        const attachmentId = value[1];
                        element.src = `http://localhost/data/api/67e330227da953bf388dfbb1-attachement/${attachmentId}`;
                        element.style.display = 'block';
                    } else {
                        console.log('____ hide photo');
                        // Cacher l'élément si pas d'image
                        element.style.display = 'none';
                    }
                } else {
                    // Vérifier si c'est un champ de type Choice (choix multiple)
                    const column = columns.find(col => col.id === fieldName);
                    if (column && column.fields.type === 'Choice') {
                        // Vider le contenu existant
                        element.innerHTML = '';
                        
                        // Créer des tags pour chaque valeur
                        const values = Array.isArray(therapistData[fieldName]) 
                            ? therapistData[fieldName] 
                            : [therapistData[fieldName]];
                        
                        values.forEach(value => {
                            if (value) {
                                const tag = document.createElement('span');
                                tag.className = 'choice-tag';
                                tag.textContent = value;
                                element.appendChild(tag);
                            }
                        });
                    } else {
                        // Pour les autres éléments, simplement définir le contenu texte
                        element.textContent = therapistData[fieldName];
                    }
                }

        });
    }
    
    // Gérer les informations supplémentaires
    const additionalContainer = document.getElementById('detail-additional');
    additionalContainer.innerHTML = '';
    
    // Liste des champs à ignorer (en plus des champs déjà rendus)
    const skipFields = [];
    let hasAdditionalInfo = false;
    
    // Ajouter toutes les autres informations
    columns.forEach(column => {
        const value = therapistData[column.id];
        
        // Vérifier si le champ n'est pas déjà rendu et a une valeur
        if (!renderedFields.has(column.id) && !skipFields.includes(column.id) && value) {
            hasAdditionalInfo = true;
            const item = document.createElement('div');
            item.className = 'detail-info-item';
            
            const label = document.createElement('div');
            label.className = 'detail-info-label';
            label.textContent = column.fields.label;
            
            const content = document.createElement('div');
            content.className = 'detail-info-content';
            
            if (Array.isArray(value)) {
                if (column.fields.type === 'Attachments') {
                    // Traiter les pièces jointes
                    if (value.length >= 2 && value[0] === "L") {
                        const attachmentId = value[1];
                        const img = document.createElement('img');
                        img.src = `http://localhost/data/api/67e330227da953bf388dfbb1-attachement/${attachmentId}`;
                        img.alt = column.fields.label;
                        img.style.maxWidth = '100%';
                        content.appendChild(img);
                    }
                } else if (column.fields.type === 'Choice') {
                    // Traiter les choix multiples avec des tags
                    value.forEach(choiceValue => {
                        if (choiceValue) {
                            const tag = document.createElement('span');
                            tag.className = 'choice-tag';
                            tag.textContent = choiceValue;
                            content.appendChild(tag);
                        }
                    });
                } else {
                    content.textContent = value.join(', ');
                }
            } else if (typeof value === 'boolean') {
                content.textContent = value ? 'Oui' : 'Non';
            } else if (column.fields.type === 'Choice') {
                // Traiter un choix unique avec un tag
                const tag = document.createElement('span');
                tag.className = 'choice-tag';
                tag.textContent = value;
                content.appendChild(tag);
            } else {
                content.textContent = value;
            }
            
            item.appendChild(label);
            item.appendChild(content);
            additionalContainer.appendChild(item);
        }
    });
    
    // Masquer le conteneur des informations supplémentaires s'il est vide
    const additionalSection = document.querySelector('.detail-additional-section');
    if (additionalSection) {
        additionalSection.style.display = hasAdditionalInfo ? 'block' : 'none';
    }
    
    // Afficher la section de profil détaillé
    document.getElementById('profile-detail').style.display = 'block';
    
    // Mettre à jour la hauteur du conteneur parent
    updateParentHeight();
}

// Fonctions utilitaires pour l'interface
function showLoading() {
    // document.getElementById('loading-message').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading-message').style.display = 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-message').style.display = 'block';
}

// Fonction pour mettre à jour la hauteur du conteneur parent (pour l'intégration iframe)
function updateParentHeight() {
    const height = document.body.scrollHeight;
    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ type: 'resize', height: height }, '*');
    }
}

// Fonction pour gérer l'affichage des pièces jointes
function handleAttachment(attachmentValue) {
    if (Array.isArray(attachmentValue) && attachmentValue.length >= 2 && attachmentValue[0] === "L") {
        const attachmentId = attachmentValue[1];
        return `<img src="http://localhost/data/api/67e330227da953bf388dfbb1-attachement/${attachmentId}" class="attachment-image" alt="Image jointe">`;
    }
    return '';
}

// Démarrer l'application au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Assurer que toutes les données des enregistrements sont affichées
    window.displayAllColumns = true;
    
    // Exposer la fonction handleAttachment globalement
    window.handleAttachment = handleAttachment;
    
    // Exposer la fonction showProfileDetail globalement
    window.showProfileDetail = showProfileDetail;
    
    // Initialiser l'application
    init();
    
    // Gestionnaire pour le bouton de retour aux résultats
    document.getElementById('back-to-results').addEventListener('click', function() {
        document.getElementById('profile-detail').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        document.getElementById('filters').style.display = 'block';
        updateParentHeight();
    });
    
    // Observer les changements dans le DOM pour mettre à jour la hauteur
    const observer = new MutationObserver(updateParentHeight);
    observer.observe(document.body, { childList: true, subtree: true });
}); 