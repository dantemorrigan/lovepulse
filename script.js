// Глобальные переменные
let partners = [];
let logs = [];
let currentTheme = 'light';
let currentLanguage = 'ru';
let editingLogIndex = null;
let currentPartnerIndex = null;
let currentFilter = 'all';
let userProfile = {
    photo: null,
    name: '',
    status: '',
    location: '',
    birthdate: '',
    bio: ''
};
let appState = {
    activeTab: 'dashboard-tab',
    partnerFilter: 'all',
    partnerSearch: '',
    activitySearch: '',
    activityDateFilter: '',
    partnersPage: 1,
    activitiesPage: 1
};

let hasSeenWelcomeGuide = false;
const ITEMS_PER_PAGE = 5;
let currentPartnersPage = 1;
let currentActivitiesPage = 1;

// Звуковые элементы
const addSound = document.getElementById('add-sound');
const deleteSound = document.getElementById('delete-sound');
const toggleSound = document.getElementById('toggle-sound');
const themeSound = document.getElementById('theme-sound');

// Временное хранилище
let tempStorage = {
    partners: [],
    logs: [],
    userProfile: null,
    theme: 'light',
    language: 'ru',
    appState: null
};

// IndexedDB
const DB_NAME = 'LovePulseDB';
const DB_VERSION = 1;
let db;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('data', { keyPath: 'key' });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB initialization failed:', event.target.error);
            reject(event.target.error);
        };
    });
}

async function loadDataFromIndexedDB() {
    try {
        if (!db) await initIndexedDB();
        const transaction = db.transaction(['data'], 'readonly');
        const store = transaction.objectStore('data');

        const keys = ['partners', 'logs', 'theme', 'language', 'userProfile', 'appState', 'hasSeenWelcomeGuide'];
        const promises = keys.map(key => 
            new Promise((resolve) => {
                const request = store.get(key);
                request.onsuccess = () => resolve({ key, value: request.result?.value });
                request.onerror = () => resolve({ key, value: null });
            })
        );

        const results = await Promise.all(promises);
        const data = Object.fromEntries(results.map(r => [r.key, r.value]));

        partners = data.partners || [];
        logs = data.logs || [];
        currentTheme = data.theme || 'light';
        currentLanguage = data.language || 'ru';
        userProfile = data.userProfile || userProfile;
        appState = data.appState || appState;
        hasSeenWelcomeGuide = data.hasSeenWelcomeGuide || false;

        document.body.className = currentTheme;
        updateLanguage();
    } catch (error) {
        console.error('Error loading from IndexedDB:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка загрузки данных.' : 'Error loading data.', 'error');
        loadFromTempStorage();
    }
}

async function saveDataToIndexedDB() {
    try {
        if (!db) await initIndexedDB();
        const transaction = db.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');

        const data = [
            { key: 'partners', value: partners },
            { key: 'logs', value: logs },
            { key: 'theme', value: currentTheme },
            { key: 'language', value: currentLanguage },
            { key: 'userProfile', value: userProfile },
            { key: 'appState', value: appState },
            { key: 'hasSeenWelcomeGuide', value: hasSeenWelcomeGuide }
        ];

        data.forEach(item => store.put(item));
        await new Promise((resolve) => transaction.oncomplete = resolve);
    } catch (error) {
        console.error('Error saving to IndexedDB:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка сохранения данных.' : 'Error saving data.', 'error');
        saveToTempStorage();
    }
}

function loadFromTempStorage() {
    partners = tempStorage.partners || [];
    logs = tempStorage.logs || [];
    currentTheme = tempStorage.theme || 'light';
    currentLanguage = tempStorage.language || 'ru';
    userProfile = tempStorage.userProfile || userProfile;
    appState = tempStorage.appState || appState;
}

function saveToTempStorage() {
    tempStorage.partners = partners;
    tempStorage.logs = logs;
    tempStorage.theme = currentTheme;
    tempStorage.language = currentLanguage;
    tempStorage.userProfile = userProfile;
    tempStorage.appState = appState;
}

// Переключение языка
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    const languageToggleBtn = document.getElementById('language-toggle');
    languageToggleBtn.textContent = currentLanguage === 'ru' ? 'Switch to English' : 'Сменить на русский';
    updateLanguage();
    playSound(toggleSound);
    showToast(currentLanguage === 'ru' ? 'Язык изменен на русский!' : 'Language changed to English!', 'success');
    saveDataToIndexedDB();
}

function updateLanguage() {
    document.querySelectorAll('[data-ru][data-en]').forEach(element => {
        element.textContent = currentLanguage === 'ru' ? element.dataset.ru : element.dataset.en;
    });

    document.querySelectorAll('[data-ru-placeholder][data-en-placeholder]').forEach(element => {
        element.placeholder = currentLanguage === 'ru' ? element.dataset.ruPlaceholder : element.dataset.enPlaceholder;
    });

    updateDynamicContent();
}

function updateDynamicContent() {
    const statLabels = {
        'potential': { ru: 'Потенциальные 💡', en: 'Potential 💡' },
        'serious': { ru: 'Серьезно 💕', en: 'Serious 💕' },
        'active': { ru: 'Активно 🔥', en: 'Active 🔥' },
        'meetings': { ru: 'Встречи 📍', en: 'Meetings 📍' }
    };
    
    ['potential', 'serious', 'active', 'meetings'].forEach(stat => {
        const element = document.querySelector(`#${stat}-count`)?.parentElement.querySelector('p');
        if (element) element.textContent = statLabels[stat][currentLanguage];
    });

    renderRecentActivity();
    renderFavorites();
    renderPartnersListTab();
    renderActivitiesList();
}

// Уведомления
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const emoji = type === 'success' ? '🎉' : '⚠️';
    toast.textContent = `${emoji} ${message}`;
    document.body.appendChild(toast);

    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });

    let touchStartX = 0;
    let touchEndX = 0;
    toast.addEventListener('touchstart', (e) => touchStartX = e.changedTouches[0].screenX);
    toast.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (Math.abs(touchEndX - touchStartX) > 50) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    });

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Ограничения даты
function setDateConstraints() {
    const dateInputs = [
        document.getElementById('partner-met-date'),
        document.getElementById('profile-birthdate')
    ];
    const today = new Date().toISOString().split('T')[0];
    const minDate = '1920-01-01';

    dateInputs.forEach(dateInput => {
        if (dateInput) {
            dateInput.setAttribute('min', minDate);
            dateInput.setAttribute('max', today);
        }
    });
}

// Воспроизведение звука
function playSound(sound) {
    if (sound && sound.play) {
        sound.play().catch(error => console.error('Sound playback error:', error));
    }
}

// Гайд
function showWelcomeGuide() {
    const guide = document.getElementById('welcome-guide');
    const overlay = document.getElementById('overlay');
    if (!guide || !overlay) return;
    guide.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.style.zIndex = '999';
    setTimeout(() => {
        guide.classList.add('show');
        overlay.classList.add('show');
    }, 10);
    updateGuideStep(1);
    playSound(addSound);
}

function closeWelcomeGuide() {
    const guide = document.getElementById('welcome-guide');
    const overlay = document.getElementById('overlay');
    guide.classList.remove('show');
    overlay.classList.remove('show');
    setTimeout(() => {
        guide.classList.add('hidden');
        overlay.classList.add('hidden');
        overlay.style.zIndex = '-1';
    }, 500);
    if (!hasSeenWelcomeGuide) {
        hasSeenWelcomeGuide = true;
        saveDataToIndexedDB();
    }
    playSound(toggleSound);
}

function nextGuideStep() {
    const currentStep = parseInt(document.querySelector('.guide-step:not(.hidden)')?.dataset.step);
    if (currentStep < 3) {
        updateGuideStep(currentStep + 1);
        playSound(toggleSound);
    }
}

function prevGuideStep() {
    const currentStep = parseInt(document.querySelector('.guide-step:not(.hidden)')?.dataset.step);
    if (currentStep > 1) {
        updateGuideStep(currentStep - 1);
        playSound(toggleSound);
    }
}

function updateGuideStep(step) {
    const steps = document.querySelectorAll('.guide-step');
    const dots = document.querySelectorAll('.guide-dot');
    steps.forEach(stepEl => stepEl.classList.add('hidden'));
    dots.forEach(dot => dot.classList.remove('active'));
    document.querySelector(`.guide-step[data-step="${step}"]`)?.classList.remove('hidden');
    document.querySelector(`.guide-dot[data-step="${step}"]`)?.classList.add('active');
}

// Вкладки
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId)?.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabId}"]`)?.classList.add('active');

    appState.activeTab = tabId;
    saveDataToIndexedDB();

    if (tabId === 'partners-tab') renderPartnersListTab();
    else if (tabId === 'activities-tab') renderActivitiesList();
    else if (tabId === 'profile-tab') loadProfile();

    const fab = document.getElementById('main-fab');
    if (fab) fab.classList.remove('hidden');

    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) themeCheckbox.checked = currentTheme === 'dark';

    initializeThemeButtons();
}

function filterPartners(filter) {
    currentFilter = filter;
    appState.partnerFilter = filter;
    currentPartnersPage = 1;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.filter-btn[onclick="filterPartners('${filter}')"]`)?.classList.add('active');
    renderPartnersListTab();
}

function filterActivities() {
    currentActivitiesPage = 1;
    renderActivitiesList();
}

// Статистика
function updateStats() {
    const potentialCount = partners.filter(p => p.status === 'potential').length;
    const seriousCount = partners.filter(p => p.status === 'serious').length;
    const activeCount = partners.filter(p => p.status === 'potential' || p.status === 'serious').length;
    const meetingsCount = logs.filter(log => log.isMeeting).length;

    document.getElementById('potential-count').textContent = potentialCount;
    document.getElementById('serious-count').textContent = seriousCount;
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('meetings-count').textContent = meetingsCount;

    updateDynamicContent();
}

// Карточка активности
function createActivityCard(log, index) {
    const li = document.createElement('li');
    li.className = 'activity-card';
    li.dataset.index = index;

    const header = document.createElement('div');
    header.className = 'activity-header';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'activity-date';
    dateSpan.textContent = log.date;
    header.appendChild(dateSpan);

    const actions = document.createElement('span');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    editBtn.className = 'action-btn edit';
    editBtn.setAttribute('aria-label', currentLanguage === 'ru' ? 'Редактировать запись' : 'Edit entry');
    editBtn.onclick = () => showLogForm('edit', index);
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.className = 'action-btn delete';
    deleteBtn.setAttribute('aria-label', currentLanguage === 'ru' ? 'Удалить запись' : 'Delete entry');
    deleteBtn.onclick = () => deleteLog(index);
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    li.appendChild(header);

    const entrySpan = document.createElement('div');
    entrySpan.className = 'activity-entry';
    entrySpan.textContent = log.entry;
    li.appendChild(entrySpan);

    if (log.isMeeting && log.partner !== null && partners[log.partner]) {
        const meetingInfo = document.createElement('div');
        meetingInfo.className = 'info-item';
        meetingInfo.innerHTML = `<i class="fas fa-handshake"></i> ${currentLanguage === 'ru' ? 'Встреча с:' : 'Meeting with:'} ${partners[log.partner].name}`;
        li.appendChild(meetingInfo);
    }

    const deleteSwipe = document.createElement('div');
    deleteSwipe.className = 'delete-swipe';
    deleteSwipe.innerHTML = '<i class="fas fa-trash"></i>';
    li.appendChild(deleteSwipe);

    let touchStartX = 0;
    let touchEndX = 0;
    li.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        li.classList.add('swiping');
    });
    li.addEventListener('touchmove', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (diffX < -50) li.classList.add('swiped');
        else li.classList.remove('swiped');
    });
    li.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX < -50) deleteLog(index);
        li.classList.remove('swiping');
        li.classList.remove('swiped');
    });

    return li;
}

// Недавние активности
function renderRecentActivity() {
    const recentActivityList = document.getElementById('recent-activity-list');
    const recentActivityText = document.getElementById('recent-activity-text');
    if (!recentActivityList || !recentActivityText) return;

    recentActivityList.innerHTML = '';
    if (logs.length === 0) {
        recentActivityText.style.display = 'block';
        recentActivityText.textContent = currentLanguage === 'ru' ? 'Пока нет активностей 📝' : 'No activities yet 📝';
    } else {
        recentActivityText.style.display = 'none';
        const sortedLogs = logs.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2);
        sortedLogs.forEach((log) => {
            const adjustedIndex = logs.findIndex(l => l === log);
            const card = createActivityCard(log, adjustedIndex);
            recentActivityList.appendChild(card);
        });
    }
}

// Список активностей с виртуализацией
async function renderActivitiesList() {
    const activitiesList = document.getElementById('activities-list');
    const activitiesPageInfo = document.getElementById('activities-page-info');
    const prevPageBtn = document.getElementById('prev-activities-page');
    const nextPageBtn = document.getElementById('next-activities-page');
    if (!activitiesList || !activitiesPageInfo || !prevPageBtn || !nextPageBtn) return;

    try {
        activitiesList.innerHTML = ''; // Очищаем список

        let filteredLogs = [...logs];
        const searchQuery = document.getElementById('activity-search')?.value.toLowerCase() || '';
        const dateFilter = document.getElementById('activity-date-filter')?.value || '';

        if (searchQuery) filteredLogs = filteredLogs.filter(log => log.entry.toLowerCase().includes(searchQuery));
        if (dateFilter) filteredLogs = filteredLogs.filter(log => log.date === dateFilter);
        filteredLogs = filteredLogs.slice().reverse();

        const totalItems = filteredLogs.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        currentActivitiesPage = Math.min(currentActivitiesPage, totalPages || 1);

        const startIndex = (currentActivitiesPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

        if (totalItems === 0) {
            const li = document.createElement('li');
            li.textContent = currentLanguage === 'ru' ? 'Активности не найдены 😔' : 'No activities found 😔';
            li.style.textAlign = 'center';
            li.style.padding = '20px';
            activitiesList.appendChild(li);
        } else {
            // Убираем фиксированную высоту и абсолютное позиционирование
            activitiesList.style.height = 'auto';
            activitiesList.style.position = 'static';

            // Добавляем карточки для текущей страницы
            for (let i = startIndex; i < endIndex; i++) {
                const log = filteredLogs[i];
                const globalIndex = logs.length - 1 - i;
                const card = createActivityCard(log, globalIndex);
                activitiesList.appendChild(card);
            }

            // Убираем обработчик скролла
            activitiesList.onscroll = null;
        }

        activitiesPageInfo.textContent = `${currentLanguage === 'ru' ? 'Страница' : 'Page'} ${currentActivitiesPage} ${currentLanguage === 'ru' ? 'из' : 'of'} ${totalPages || 1}`;
        prevPageBtn.disabled = currentActivitiesPage === 1;
        nextPageBtn.disabled = currentActivitiesPage === totalPages || totalPages === 0;

        appState.activitiesPage = currentActivitiesPage;
        await saveDataToIndexedDB();
    } catch (error) {
        console.error('Error rendering activities:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка отображения активностей.' : 'Error rendering activities.', 'error');
    }
}

// Избранные партнеры
function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    const favoritesText = document.getElementById('favorites-text');
    if (!favoritesList || !favoritesText) return;

    favoritesList.innerHTML = '';
    const favorites = partners.filter(p => p.favorite);
    if (favorites.length === 0) {
        favoritesText.style.display = 'block';
        favoritesText.textContent = currentLanguage === 'ru' ? 'Пока нет избранных 🌟' : 'No favorites yet 🌟';
    } else {
        favoritesText.style.display = 'none';
        favorites.forEach(partner => {
            const li = document.createElement('li');
            li.textContent = partner.name;
            favoritesList.appendChild(li);
        });
    }
}


function changePartnersPage(direction) {
    let filteredPartners = [...partners];
    const searchQuery = document.getElementById('partner-search')?.value.toLowerCase() || '';
    if (currentFilter !== 'all') {
        filteredPartners = filteredPartners.filter(p => currentFilter === 'all-serious' ? p.status === 'serious' : p.status === currentFilter);
    }
    if (searchQuery) filteredPartners = filteredPartners.filter(p => p.name.toLowerCase().includes(searchQuery));

    const totalPages = Math.ceil(filteredPartners.length / ITEMS_PER_PAGE);
    const newPage = currentPartnersPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPartnersPage = newPage;
        appState.partnersPage = currentPartnersPage;
        saveDataToIndexedDB();
        renderPartnersListTab();
        playSound(toggleSound);
    } else {
        console.log(`Cannot change page: newPage=${newPage}, totalPages=${totalPages}`);
    }
}

function changeActivitiesPage(direction) {
    let filteredLogs = [...logs];
    const searchQuery = document.getElementById('activity-search')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('activity-date-filter')?.value || '';
    if (searchQuery) filteredLogs = filteredLogs.filter(log => log.entry.toLowerCase().includes(searchQuery));
    if (dateFilter) filteredLogs = filteredLogs.filter(log => log.date === dateFilter);
    filteredLogs = filteredLogs.slice().reverse();

    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const newPage = currentActivitiesPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentActivitiesPage = newPage;
        appState.activitiesPage = currentActivitiesPage;
        saveDataToIndexedDB();
        renderActivitiesList();
        playSound(toggleSound);
    } else {
        console.log(`Cannot change page: newPage=${newPage}, totalPages=${totalPages}`);
    }
}




function getInitials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getStatusColor(status) {
    const colors = {
        potential: '#7c6af7',
        serious: '#e84393',
        friend: '#2dbf9a',
        past: '#9b9bc0'
    };
    return colors[status] || colors.potential;
}

function handleFabClick() {
    if (appState.activeTab === 'activities-tab') showLogForm('add');
    else if (appState.activeTab === 'settings-tab' || appState.activeTab === 'profile-tab') showTab('partners-tab');
    else showPartnerForm();
}

function exportData() {
    const data = { partners, logs, userProfile: { ...userProfile, photo: null }, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lovepulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(currentLanguage === 'ru' ? 'Данные экспортированы!' : 'Data exported!', 'success');
}

// Карточка партнера
function createPartnerCard(partner, index) {
    const card = document.createElement('div');
    card.className = 'partner-card';
    card.dataset.index = index;

    // Avatar with initials or status color
    const avatar = document.createElement('div');
    avatar.className = 'partner-avatar';
    avatar.style.background = getStatusColor(partner.status);
    avatar.textContent = getInitials(partner.name);
    card.appendChild(avatar);

    const cardBody = document.createElement('div');
    cardBody.className = 'partner-card-body';

    const header = document.createElement('div');
    header.className = 'partner-header';

    const name = document.createElement('h3');
    name.className = 'partner-name';
    name.textContent = partner.name;
    header.appendChild(name);

    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${partner.status}`;
    const statusText = {
        potential: { ru: 'Потенциал', en: 'Potential' },
        serious: { ru: 'Серьёзно', en: 'Serious' },
        friend: { ru: 'Друг', en: 'Friend' },
        past: { ru: 'Прошлое', en: 'Past' }
    };
    statusBadge.textContent = statusText[partner.status]?.[currentLanguage] || partner.status;
    header.appendChild(statusBadge);
    cardBody.appendChild(header);

    const info = document.createElement('div');
    info.className = 'partner-info';

    if (partner.met) {
        const met = document.createElement('div');
        met.className = 'info-item';
        met.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${partner.met}`;
        info.appendChild(met);
    }

    if (partner.metDate) {
        const metDate = document.createElement('div');
        metDate.className = 'info-item';
        metDate.innerHTML = `<i class="fas fa-calendar-alt"></i> ${partner.metDate}`;
        info.appendChild(metDate);
    }

    if (partner.notes) {
        const notes = document.createElement('div');
        notes.className = 'info-item notes-item';
        notes.innerHTML = `<i class="fas fa-sticky-note"></i> ${partner.notes}`;
        info.appendChild(notes);
    }

    cardBody.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'partner-actions';

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `action-btn${partner.favorite ? ' favorite-active' : ''}`;
    favoriteBtn.innerHTML = partner.favorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    favoriteBtn.setAttribute('aria-label', partner.favorite ?
        (currentLanguage === 'ru' ? 'Удалить из избранного' : 'Remove from favorites') :
        (currentLanguage === 'ru' ? 'Добавить в избранное' : 'Add to favorites'));
    favoriteBtn.onclick = () => toggleFavorite(index);
    actions.appendChild(favoriteBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
    editBtn.setAttribute('aria-label', currentLanguage === 'ru' ? 'Редактировать партнера' : 'Edit partner');
    editBtn.onclick = () => showPartnerForm(index);
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.setAttribute('aria-label', currentLanguage === 'ru' ? 'Удалить партнера' : 'Delete partner');
    deleteBtn.onclick = () => deletePartner(index);
    actions.appendChild(deleteBtn);

    cardBody.appendChild(actions);
    card.appendChild(cardBody);

    const deleteSwipe = document.createElement('div');
    deleteSwipe.className = 'delete-swipe';
    deleteSwipe.innerHTML = '<i class="fas fa-trash"></i>';
    card.appendChild(deleteSwipe);

    let touchStartX = 0;
    let touchEndX = 0;
    card.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        card.classList.add('swiping');
    });
    card.addEventListener('touchmove', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (diffX < -50) card.classList.add('swiped');
        else card.classList.remove('swiped');
    });
    card.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX < -50) deletePartner(index);
        card.classList.remove('swiping');
        card.classList.remove('swiped');
    });

    return card;
}

async function renderPartnersListTab() {
    const partnersList = document.getElementById('partners-list-tab');
    const noPartnersMessage = document.getElementById('no-partners-message');
    const partnersPageInfo = document.getElementById('partners-page-info');
    const prevPageBtn = document.getElementById('prev-partners-page');
    const nextPageBtn = document.getElementById('next-partners-page');
    if (!partnersList || !noPartnersMessage || !partnersPageInfo || !prevPageBtn || !nextPageBtn) return;

    try {
        partnersList.innerHTML = ''; // Очищаем список

        let filteredPartners = [...partners];
        const searchQuery = document.getElementById('partner-search')?.value.toLowerCase() || '';

        if (currentFilter !== 'all') {
            filteredPartners = filteredPartners.filter(p => currentFilter === 'all-serious' ? p.status === 'serious' : p.status === currentFilter);
        }
        if (searchQuery) filteredPartners = filteredPartners.filter(p => p.name.toLowerCase().includes(searchQuery));

        const totalItems = filteredPartners.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        currentPartnersPage = Math.min(currentPartnersPage, totalPages || 1);

        const startIndex = (currentPartnersPage - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

        if (totalItems === 0) {
            noPartnersMessage.classList.remove('hidden');
            partnersList.classList.add('hidden');
        } else {
            noPartnersMessage.classList.add('hidden');
            partnersList.classList.remove('hidden');

            // Убираем фиксированную высоту и абсолютное позиционирование
            partnersList.style.height = 'auto';
            partnersList.style.position = 'static';

            // Добавляем карточки для текущей страницы
            for (let i = startIndex; i < endIndex; i++) {
                const partner = filteredPartners[i];
                const globalIndex = partners.indexOf(partner);
                if (globalIndex !== -1) {
                    const card = createPartnerCard(partner, globalIndex);
                    partnersList.appendChild(card);
                }
            }

            // Убираем обработчик скролла, так как он нужен только для вертикальной виртуализации
            partnersList.onscroll = null;
        }

        partnersPageInfo.textContent = `${currentLanguage === 'ru' ? 'Страница' : 'Page'} ${currentPartnersPage} ${currentLanguage === 'ru' ? 'из' : 'of'} ${totalPages || 1}`;
        prevPageBtn.disabled = currentPartnersPage === 1;
        nextPageBtn.disabled = currentPartnersPage === totalPages || totalPages === 0;

        appState.partnersPage = currentPartnersPage;
        appState.partnerSearch = searchQuery;
        await saveDataToIndexedDB();
    } catch (error) {
        console.error('Error rendering partners:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка отображения партнеров.' : 'Error rendering partners.', 'error');
    }
}

// Форма партнера
function showPartnerForm(index = null) {
    const form = document.getElementById('add-partner-form');
    const title = document.getElementById('partner-form-title');
    const saveBtn = form?.querySelector('.save-btn');
    const overlay = document.getElementById('overlay');
    if (!form || !title || !saveBtn || !overlay) return;

    currentPartnerIndex = index;

    if (index !== null) {
        title.textContent = currentLanguage === 'ru' ? 'Редактировать партнера' : 'Edit Partner';
        saveBtn.textContent = currentLanguage === 'ru' ? 'Сохранить изменения' : 'Save Changes';
        const partner = partners[index];
        document.getElementById('partner-name').value = partner.name;
        document.getElementById('partner-met').value = partner.met || '';
        document.getElementById('partner-met-date').value = partner.metDate || '';
        document.getElementById('partner-notes').value = partner.notes || '';
        document.getElementById('partner-favorite').checked = partner.favorite;
        document.querySelector(`input[name="status"][value="${partner.status}"]`).checked = true;
    } else {
        title.textContent = currentLanguage === 'ru' ? 'Добавить нового партнера' : 'Add New Partner';
        saveBtn.textContent = currentLanguage === 'ru' ? 'Добавить партнера' : 'Add Partner';
        document.getElementById('partner-name').value = '';
        document.getElementById('partner-met').value = '';
        document.getElementById('partner-met-date').value = '';
        document.getElementById('partner-notes').value = '';
        document.getElementById('partner-favorite').checked = false;
        document.querySelector('input[name="status"][value="potential"]').checked = true;
    }

    form.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.style.zIndex = '999';
    setTimeout(() => {
        form.classList.add('show');
        overlay.classList.add('show');
    }, 10);
}

function hidePartnerForm() {
    const form = document.getElementById('add-partner-form');
    const overlay = document.getElementById('overlay');
    const logForm = document.getElementById('log-form');
    if (!form || !overlay) return;

    form.classList.remove('show');
    setTimeout(() => form.classList.add('hidden'), 500);

    if (!logForm?.classList.contains('show')) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.opacity = '0';
            overlay.style.zIndex = '-1';
        }, 500);
    }
}

// Форма активности
function showLogForm(mode, index = null) {
    const form = document.getElementById('log-form');
    const title = document.getElementById('log-form-title');
    const submitBtn = document.getElementById('log-form-submit');
    const overlay = document.getElementById('overlay');
    const isMeetingCheckbox = document.getElementById('is-meeting');
    const partnerSelectGroup = document.getElementById('partner-select-group');
    const partnerSelect = document.getElementById('partner-select');
    if (!form || !title || !submitBtn || !overlay || !isMeetingCheckbox || !partnerSelectGroup || !partnerSelect) return;

    editingLogIndex = index;

    partnerSelect.innerHTML = `<option value="" disabled selected>${currentLanguage === 'ru' ? 'Выберите партнера' : 'Select a partner'}</option>`;
    partners.forEach((partner, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = partner.name;
        partnerSelect.appendChild(option);
    });

    isMeetingCheckbox.addEventListener('change', () => {
        partnerSelectGroup.style.display = isMeetingCheckbox.checked ? 'block' : 'none';
    });

    if (mode === 'edit') {
        title.textContent = currentLanguage === 'ru' ? 'Редактировать активность' : 'Edit Activity';
        submitBtn.textContent = currentLanguage === 'ru' ? 'Сохранить изменения' : 'Save Changes';
        const log = logs[index];
        document.getElementById('log-entry').value = log.entry;
        isMeetingCheckbox.checked = log.isMeeting || false;
        partnerSelectGroup.style.display = log.isMeeting ? 'block' : 'none';
        if (log.isMeeting && log.partner !== undefined) partnerSelect.value = log.partner;
        else partnerSelect.value = '';
    } else {
        title.textContent = currentLanguage === 'ru' ? 'Записать новую активность' : 'Record New Activity';
        submitBtn.textContent = currentLanguage === 'ru' ? 'Сохранить' : 'Save';
        document.getElementById('log-entry').value = '';
        isMeetingCheckbox.checked = false;
        partnerSelectGroup.style.display = 'none';
        partnerSelect.value = '';
    }

    form.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.style.zIndex = '999';
    setTimeout(() => {
        form.classList.add('show');
        overlay.classList.add('show');
    }, 10);
}

function hideLogForm() {
    const form = document.getElementById('log-form');
    const overlay = document.getElementById('overlay');
    const partnerForm = document.getElementById('add-partner-form');
    if (!form || !overlay) return;

    form.classList.remove('show');
    setTimeout(() => form.classList.add('hidden'), 500);

    if (!partnerForm?.classList.contains('show')) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.opacity = '0';
            overlay.style.zIndex = '-1';
        }, 500);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const partnerForm = document.getElementById('add-partner-form');
        const logForm = document.getElementById('log-form');
        if (partnerForm?.classList.contains('show')) hidePartnerForm();
        else if (logForm?.classList.contains('show')) hideLogForm();
    }
});

// Сохранение партнера
async function savePartner() {
    const name = document.getElementById('partner-name')?.value.trim();
    if (!name) {
        showToast(currentLanguage === 'ru' ? 'Пожалуйста, введите имя партнера.' : 'Please enter partner\'s name.', 'error');
        return;
    }

    const partner = {
        name,
        met: document.getElementById('partner-met')?.value.trim() || null,
        metDate: document.getElementById('partner-met-date')?.value || null,
        notes: document.getElementById('partner-notes')?.value.trim() || null,
        favorite: document.getElementById('partner-favorite')?.checked || false,
        status: document.querySelector('input[name="status"]:checked')?.value || 'potential'
    };

    try {
        if (currentPartnerIndex !== null) {
            partners[currentPartnerIndex] = partner;
            showToast(currentLanguage === 'ru' ? 'Партнер успешно обновлен!' : 'Partner successfully updated!', 'success');
        } else {
            // Проверка на существование партнёра с таким именем
            if (!partners.some(p => p.name === partner.name)) {
                partners.push(partner);
                showToast(currentLanguage === 'ru' ? 'Партнер успешно добавлен!' : 'Partner successfully added!', 'success');
            }
        }
        await saveDataToIndexedDB();
        updateStats();
        renderFavorites();
        renderPartnersListTab();
        hidePartnerForm();
        playSound(addSound);
    } catch (error) {
        console.error('Error saving partner:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при сохранении партнера.' : 'Error saving partner.', 'error');
    }
}
// Удаление партнера
async function deletePartner(index) {
    try {
        partners.splice(index, 1);
        await saveDataToIndexedDB();
        updateStats();
        renderFavorites();
        renderPartnersListTab();
        showToast(currentLanguage === 'ru' ? 'Партнер удален.' : 'Partner deleted.', 'success');
        playSound(deleteSound);
    } catch (error) {
        console.error('Error deleting partner:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при удалении партнера.' : 'Error deleting partner.', 'error');
    }
}

// Переключение избранного
async function toggleFavorite(index) {
    try {
        partners[index].favorite = !partners[index].favorite;
        await saveDataToIndexedDB();
        renderFavorites();
        renderPartnersListTab();
        showToast(partners[index].favorite ? 
            (currentLanguage === 'ru' ? 'Добавлено в избранное!' : 'Added to favorites!') : 
            (currentLanguage === 'ru' ? 'Удалено из избранного.' : 'Removed from favorites.'), 'success');
        playSound(toggleSound);
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при изменении статуса избранного.' : 'Error toggling favorite status.', 'error');
    }
}

// Сохранение активности
async function saveLog() {
    const entry = document.getElementById('log-entry')?.value.trim();
    const isMeeting = document.getElementById('is-meeting')?.checked;
    const partnerIndex = document.getElementById('partner-select')?.value;

    if (!entry) {
        showToast(currentLanguage === 'ru' ? 'Пожалуйста, введите описание активности.' : 'Please enter activity description.', 'error');
        return;
    }

    if (isMeeting && !partnerIndex) {
        showToast(currentLanguage === 'ru' ? 'Пожалуйста, выберите партнера для встречи.' : 'Please select a partner for the meeting.', 'error');
        return;
    }

    const date = new Date().toISOString().split('T')[0];
    const log = { entry, date, isMeeting, partner: isMeeting ? parseInt(partnerIndex) : null };

    try {
        if (editingLogIndex !== null) {
            logs[editingLogIndex] = log;
            showToast(currentLanguage === 'ru' ? 'Активность обновлена!' : 'Activity updated!', 'success');
        } else {
            // Проверка на существование идентичной активности
            if (!logs.some(l => l.entry === log.entry && l.date === log.date)) {
                logs.push(log);
                showToast(currentLanguage === 'ru' ? 'Активность добавлена!' : 'Activity added!', 'success');
            }
        }
        await saveDataToIndexedDB();
        renderRecentActivity();
        renderActivitiesList();
        hideLogForm();
        playSound(addSound);
    } catch (error) {
        console.error('Error saving activity:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при сохранении активности.' : 'Error saving activity.', 'error');
    }
}

// Удаление активности
async function deleteLog(index) {
    try {
        logs.splice(index, 1);
        await saveDataToIndexedDB();
        renderRecentActivity();
        renderActivitiesList();
        showToast(currentLanguage === 'ru' ? 'Активность удалена.' : 'Activity deleted.', 'success');
        playSound(deleteSound);
    } catch (error) {
        console.error('Error deleting activity:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при удалении активности.' : 'Error deleting activity.', 'error');
    }
}

// Тема
function initializeThemeButtons() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) themeCheckbox.checked = currentTheme === 'dark';
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = currentTheme;
    initializeThemeButtons();
    saveDataToIndexedDB();
    playSound(themeSound);
}

// Профиль
function loadProfile() {
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    if (!photoPreview || !photoPlaceholder) return;

    if (userProfile.photo) {
        photoPreview.src = userProfile.photo;
        photoPreview.classList.remove('hidden');
        photoPlaceholder.classList.add('hidden');
    } else {
        photoPreview.classList.add('hidden');
        photoPlaceholder.classList.remove('hidden');
    }

    document.getElementById('profile-name').value = userProfile.name || '';
    document.getElementById('profile-status').value = userProfile.status || '';
    document.getElementById('profile-location').value = userProfile.location || '';
    document.getElementById('profile-birthdate').value = userProfile.birthdate || '';
    document.getElementById('profile-bio').value = userProfile.bio || '';
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast(currentLanguage === 'ru' ? 'Пожалуйста, выберите изображение.' : 'Please select an image.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            userProfile.photo = e.target.result;
            const photoPreview = document.getElementById('profile-photo-preview');
            const photoPlaceholder = document.getElementById('photo-placeholder');
            photoPreview.src = userProfile.photo;
            photoPreview.classList.remove('hidden');
            photoPlaceholder.classList.add('hidden');
            await saveDataToIndexedDB();
            showToast(currentLanguage === 'ru' ? 'Фото профиля обновлено!' : 'Profile photo updated!', 'success');
        };
        reader.onerror = () => showToast(currentLanguage === 'ru' ? 'Ошибка при загрузке фото.' : 'Error uploading photo.', 'error');
        reader.readAsDataURL(file);
    }
}

async function saveProfile() {
    userProfile.name = document.getElementById('profile-name')?.value.trim() || '';
    userProfile.status = document.getElementById('profile-status')?.value.trim() || '';
    userProfile.location = document.getElementById('profile-location')?.value.trim() || '';
    userProfile.birthdate = document.getElementById('profile-birthdate')?.value || '';
    userProfile.bio = document.getElementById('profile-bio')?.value.trim() || '';

    try {
        await saveDataToIndexedDB();
        showToast(currentLanguage === 'ru' ? 'Профиль сохранен!' : 'Profile saved!', 'success');
        playSound(addSound);
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при сохранении профиля.' : 'Error saving profile.', 'error');
    }
}

// Сеть
function checkNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    if (!networkStatus) return;

    if (!navigator.onLine) {
        networkStatus.textContent = currentLanguage === 'ru' ? 'Оффлайн-режим 🌐' : 'Offline mode 🌐';
        networkStatus.classList.remove('hidden');
        setTimeout(() => networkStatus.classList.add('show'), 10);
    } else {
        networkStatus.textContent = currentLanguage === 'ru' ? 'Онлайн 🌐' : 'Online 🌐';
        networkStatus.classList.remove('show');
        setTimeout(() => networkStatus.classList.add('hidden'), 300);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await loadDataFromIndexedDB();
    setDateConstraints();
    updateStats();
    renderRecentActivity();
    renderFavorites();
    currentFilter = appState.partnerFilter || 'all';
    document.getElementById('partner-search').value = appState.partnerSearch || '';
    document.getElementById('activity-search').value = appState.activitySearch || '';
    document.getElementById('activity-date-filter').value = appState.activityDateFilter || '';
    showTab(appState.activeTab);
    renderPartnersListTab();
    renderActivitiesList();
    checkNetworkStatus();

    const languageToggleBtn = document.getElementById('language-toggle');
    if (languageToggleBtn) {
        languageToggleBtn.textContent = currentLanguage === 'ru' ? 'Switch to English' : 'Сменить на русский';
        languageToggleBtn.addEventListener('click', toggleLanguage);
    }

    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);

    // Закрытие форм и гайда по клику на оверлей
    document.getElementById('overlay')?.addEventListener('click', () => {
        const partnerForm = document.getElementById('add-partner-form');
        const logForm = document.getElementById('log-form');
        const welcomeGuide = document.getElementById('welcome-guide');
        if (partnerForm?.classList.contains('show')) hidePartnerForm();
        else if (logForm?.classList.contains('show')) hideLogForm();
        else if (welcomeGuide?.classList.contains('show')) closeWelcomeGuide();
    });

    // Предотвращение закрытия форм при клике внутри них
    document.getElementById('add-partner-form')?.addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('log-form')?.addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('welcome-guide')?.addEventListener('click', (e) => e.stopPropagation());

    // Привязка обработчиков к кнопкам
    document.getElementById('add-partner-btn')?.addEventListener('click', () => showPartnerForm());
    document.getElementById('add-activity-btn')?.addEventListener('click', () => showLogForm('add'));
    document.querySelector('#add-partner-form .save-btn')?.addEventListener('click', savePartner);
    document.getElementById('log-form-submit')?.addEventListener('click', saveLog);

    // Привязка обработчиков для фильтров и пагинации
    document.getElementById('partner-search')?.addEventListener('input', () => renderPartnersListTab());
    document.getElementById('activity-search')?.addEventListener('input', filterActivities);
    document.getElementById('activity-date-filter')?.addEventListener('change', filterActivities);
    document.getElementById('prev-partners-page')?.addEventListener('click', () => changePartnersPage(-1));
    document.getElementById('next-partners-page')?.addEventListener('click', () => changePartnersPage(1));
    document.getElementById('prev-activities-page')?.addEventListener('click', () => changeActivitiesPage(-1));
    document.getElementById('next-activities-page')?.addEventListener('click', () => changeActivitiesPage(1));

    // Регистрация существующего Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker зарегистрирован:', registration);
            })
            .catch(error => {
                console.error('Ошибка регистрации Service Worker:', error);
            });
    }

    // Показать гайд для новых пользователей
    if (!hasSeenWelcomeGuide) showWelcomeGuide();
});