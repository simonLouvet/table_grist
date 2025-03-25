// URLs des API
const RECORDS_API_URL = 'https://grappe.io/data/api/67e2ed7dfa335e76dbf6c489-thera_get_records';
const COLUMNS_API_URL = 'https://grappe.io/data/api/67e2ee43fa335e76dbf6c4e3-thera_get_columns';

// Variables globales
let therapists = [];
let columns = [];
let activeFilters = {};
let currentSortColumn = null;
let currentSortDirection = 'asc';

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
    const sortContainer = document.getElementById('sort-options');
    sortContainer.innerHTML = '';
    
    const sortLabel = document.createElement('span');
    sortLabel.textContent = 'Trier par:';
    sortContainer.appendChild(sortLabel);
    
    const sortSelect = document.createElement('select');
    sortSelect.id = 'sort-select';
    
    // Ajouter une option par défaut
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Sélectionner...';
    sortSelect.appendChild(defaultOption);
    
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
    
    sortContainer.appendChild(sortSelect);
    
    // Ajouter les boutons pour changer l'ordre de tri
    const directionBtn = document.createElement('button');
    directionBtn.textContent = '↑↓';
    directionBtn.className = 'sort-direction-btn';
    directionBtn.addEventListener('click', () => {
        if (currentSortColumn) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            renderTherapists();
        }
    });
    
    sortContainer.appendChild(directionBtn);
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
    
    if (sortedTherapists.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'Aucun résultat ne correspond à vos critères de recherche.';
        container.appendChild(noResults);
        return;
    }
    
    // Créer une carte pour chaque thérapeute
    sortedTherapists.forEach(therapist => {
        const card = document.createElement('div');
        card.className = 'therapist-card';
        
        const name = document.createElement('h3');
        name.textContent = therapist.nom || 'Sans nom';
        card.appendChild(name);
        
        const description = document.createElement('p');
        description.textContent = therapist.description || 'Aucune description disponible';
        card.appendChild(description);
        
        if (therapist.type) {
            const type = document.createElement('span');
            type.className = 'type';
            type.textContent = therapist.type;
            card.appendChild(type);
        }
        
        container.appendChild(card);
    });
}

// Fonctions utilitaires pour l'interface
function showLoading() {
    const container = document.getElementById('therapists-list');
    container.innerHTML = '<div class="loading">Chargement des données...</div>';
}

function hideLoading() {
    // Cette fonction est appelée après le rendu des thérapeutes
}

function showError(message) {
    const container = document.getElementById('therapists-list');
    container.innerHTML = `<div class="error">${message}</div>`;
}

// Démarrer l'application au chargement de la page
document.addEventListener('DOMContentLoaded', init); 