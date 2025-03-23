// Загрузка данных и темы из LocalStorage
let partners = [];
let logs = [];
let currentTheme = 'light';
let currentLanguage = 'ru'; // Добавляем язык по умолчанию
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

let hasSeenWelcomeGuide = localStorage.getItem('hasSeenWelcomeGuide') === 'true';

// Пагинация
const ITEMS_PER_PAGE = 5;
let currentPartnersPage = 1;
let currentActivitiesPage = 1;

// Звуковые элементы
const addSound = document.getElementById('add-sound');
const deleteSound = document.getElementById('delete-sound');
const toggleSound = document.getElementById('toggle-sound');
const themeSound = document.getElementById('theme-sound');

// Временное хранилище данных в случае проблем с LocalStorage
let tempStorage = {
    partners: [],
    logs: [],
    userProfile: null,
    theme: 'light',
    language: 'ru', // Добавляем язык во временное хранилище
    appState: null
};

// Флаг доступности LocalStorage
let isLocalStorageAvailable = true;

// Проверка доступности LocalStorage
function checkLocalStorage() {
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        console.error('LocalStorage unavailable:', error);
        showToast(currentLanguage === 'ru' ? 'LocalStorage недоступен. Данные будут храниться временно.' : 'LocalStorage unavailable. Data will be stored temporarily.', 'error');
        return false;
    }
}

// Переключение языка
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
    localStorage.setItem('language', currentLanguage);
    
    const languageToggleBtn = document.getElementById('language-toggle');
    languageToggleBtn.textContent = currentLanguage === 'ru' ? 'Switch to English' : 'Сменить на русский';
    
    updateLanguage();
    playSound(toggleSound);
    showToast(currentLanguage === 'ru' ? 'Язык изменен на русский!' : 'Language changed to English!', 'success');
}

// Обновление текста на странице в зависимости от языка
function updateLanguage() {
    document.querySelectorAll('[data-ru][data-en]').forEach(element => {
        element.textContent = currentLanguage === 'ru' ? element.dataset.ru : element.dataset.en;
    });

    document.querySelectorAll('[data-ru-placeholder][data-en-placeholder]').forEach(element => {
        element.placeholder = currentLanguage === 'ru' ? element.dataset.ruPlaceholder : element.dataset.enPlaceholder;
    });

    updateDynamicContent();
}

// Обновление динамического контента
function updateDynamicContent() {
    const statLabels = {
        'potential': { ru: 'Потенциальные 💡', en: 'Potential 💡' },
        'serious': { ru: 'Серьезно 💕', en: 'Serious 💕' },
        'active': { ru: 'Активно 🔥', en: 'Active 🔥' },
        'meetings': { ru: 'Встречи 📍', en: 'Meetings 📍' }
    };
    
    ['potential', 'serious', 'active', 'meetings'].forEach(stat => {
        const element = document.querySelector(`#${stat}-count`).parentElement.querySelector('p');
        element.textContent = statLabels[stat][currentLanguage];
    });

    renderRecentActivity();
    renderFavorites();
    renderPartnersListTab();
    renderActivitiesList();
}

// Инициализация данных
function loadData() {
    isLocalStorageAvailable = checkLocalStorage();
    if (isLocalStorageAvailable) {
        try {
            partners = JSON.parse(localStorage.getItem('partners')) || [];
            logs = JSON.parse(localStorage.getItem('logs')) || [];
            currentTheme = localStorage.getItem('theme') || 'light';
            currentLanguage = localStorage.getItem('language') || 'ru';
            const savedProfile = JSON.parse(localStorage.getItem('userProfile'));
            if (savedProfile) userProfile = savedProfile;
            const savedState = JSON.parse(localStorage.getItem('appState'));
            if (savedState) {
                appState = savedState;
                currentFilter = appState.partnerFilter;
                currentPartnersPage = appState.partnersPage;
                currentActivitiesPage = appState.activitiesPage;
            }
        } catch (error) {
            console.error('Error loading data from LocalStorage:', error);
            showToast(currentLanguage === 'ru' ? 'Ошибка загрузки данных из LocalStorage.' : 'Error loading data from LocalStorage.', 'error');
            isLocalStorageAvailable = false;
        }
    }

    if (!isLocalStorageAvailable) {
        partners = tempStorage.partners;
        logs = tempStorage.logs;
        userProfile = tempStorage.userProfile || userProfile;
        currentTheme = tempStorage.theme;
        currentLanguage = tempStorage.language || 'ru';
        appState = tempStorage.appState || appState;
    }

    document.body.className = currentTheme;
    updateLanguage();
}

// Сохранение данных
function saveData() {
    if (isLocalStorageAvailable) {
        try {
            localStorage.setItem('partners', JSON.stringify(partners));
            localStorage.setItem('logs', JSON.stringify(logs));
            localStorage.setItem('theme', currentTheme);
            localStorage.setItem('language', currentLanguage);
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            localStorage.setItem('appState', JSON.stringify(appState));
        } catch (error) {
            console.error('Error saving data to LocalStorage:', error);
            showToast(currentLanguage === 'ru' ? 'Ошибка сохранения данных.' : 'Error saving data.', 'error');
            isLocalStorageAvailable = false;
        }
    }

    tempStorage.partners = partners;
    tempStorage.logs = logs;
    tempStorage.userProfile = userProfile;
    tempStorage.theme = currentTheme;
    tempStorage.language = currentLanguage;
    tempStorage.appState = appState;
}

// Показ уведомления
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

// Установка ограничений для полей даты
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
    if (sound && sound.src && !sound.src.endsWith('undefined')) {
        sound.play().catch(error => console.error('Sound playback error:', error));
    }
}

// Функции управления гайдом
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
        localStorage.setItem('hasSeenWelcomeGuide', 'true');
    }
    playSound(toggleSound);
}

function nextGuideStep() {
    const currentStep = parseInt(document.querySelector('.guide-step:not(.hidden)').dataset.step);
    if (currentStep < 3) {
        updateGuideStep(currentStep + 1);
        playSound(toggleSound);
    }
}

function prevGuideStep() {
    const currentStep = parseInt(document.querySelector('.guide-step:not(.hidden)').dataset.step);
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
    document.querySelector(`.guide-step[data-step="${step}"]`).classList.remove('hidden');
    document.querySelector(`.guide-dot[data-step="${step}"]`).classList.add('active');
}

// Показ вкладки
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');

    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.tab[onclick="showTab('${tabId}')"]`).classList.add('active');

    appState.activeTab = tabId;
    saveData();

    if (tabId === 'partners-tab') renderPartnersListTab();
    else if (tabId === 'activities-tab') renderActivitiesList();
    else if (tabId === 'profile-tab') loadProfile();

    initializeThemeButtons();
}

// Обновление статистики
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

// Создание карточки активности
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

// Рендеринг недавних активностей
function renderRecentActivity() {
    const recentActivityList = document.getElementById('recent-activity-list');
    const recentActivityText = document.getElementById('recent-activity-text');
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

// Рендеринг списка активностей с пагинацией
function renderActivitiesList() {
    const activitiesList = document.getElementById('activities-list');
    const activitiesPageInfo = document.getElementById('activities-page-info');
    const prevPageBtn = document.getElementById('prev-activities-page');
    const nextPageBtn = document.getElementById('next-activities-page');
    activitiesList.innerHTML = '';

    let filteredLogs = logs;
    const searchQuery = document.getElementById('activity-search').value.toLowerCase();
    const dateFilter = document.getElementById('activity-date-filter').value;

    if (searchQuery) filteredLogs = filteredLogs.filter(log => log.entry.toLowerCase().includes(searchQuery));
    if (dateFilter) filteredLogs = filteredLogs.filter(log => log.date === dateFilter);

    filteredLogs = filteredLogs.slice().reverse();

    const totalItems = filteredLogs.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    currentActivitiesPage = Math.min(currentActivitiesPage, totalPages || 1);

    const startIndex = (currentActivitiesPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    if (paginatedLogs.length === 0) {
        const li = document.createElement('li');
        li.textContent = currentLanguage === 'ru' ? 'Активности не найдены 😔' : 'No activities found 😔';
        li.style.textAlign = 'center';
        li.style.padding = '20px';
        activitiesList.appendChild(li);
    } else {
        paginatedLogs.forEach((log, index) => {
            const globalIndex = logs.length - 1 - (startIndex + index);
            const card = createActivityCard(log, globalIndex);
            activitiesList.appendChild(card);
        });
    }

    activitiesPageInfo.textContent = `${currentLanguage === 'ru' ? 'Страница' : 'Page'} ${currentActivitiesPage} ${currentLanguage === 'ru' ? 'из' : 'of'} ${totalPages || 1}`;
    prevPageBtn.disabled = currentActivitiesPage === 1;
    nextPageBtn.disabled = currentActivitiesPage === totalPages || totalPages === 0;

    appState.activitiesPage = currentActivitiesPage;
    saveData();
}

// Фильтрация активностей
function filterActivities() {
    currentActivitiesPage = 1;
    appState.activitiesPage = 1;
    appState.activitySearch = document.getElementById('activity-search').value;
    appState.activityDateFilter = document.getElementById('activity-date-filter').value;
    saveData();
    renderActivitiesList();
}

// Переключение страницы активностей
function changeActivitiesPage(direction) {
    currentActivitiesPage += direction;
    appState.activitiesPage = currentActivitiesPage;
    saveData();
    renderActivitiesList();
    playSound(toggleSound);
}

// Рендеринг избранных партнеров
function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    const favoritesText = document.getElementById('favorites-text');
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

// Создание карточки партнера
function createPartnerCard(partner, index) {
    const card = document.createElement('div');
    card.className = 'partner-card';
    card.dataset.index = index;

    const header = document.createElement('div');
    header.className = 'partner-header';

    const name = document.createElement('h3');
    name.className = 'partner-name';
    name.textContent = partner.name;
    header.appendChild(name);

    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge ${partner.status}`;
    const statusText = {
        potential: { ru: 'Потенциальные', en: 'Potential' },
        serious: { ru: 'Серьезные', en: 'Serious' },
        friend: { ru: 'Друзья', en: 'Friends' },
        past: { ru: 'В прошлом', en: 'Past' }
    };
    statusBadge.textContent = statusText[partner.status][currentLanguage];
    header.appendChild(statusBadge);

    card.appendChild(header);

    const info = document.createElement('div');
    info.className = 'partner-info';

    if (partner.met) {
        const met = document.createElement('div');
        met.className = 'info-item';
        met.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${currentLanguage === 'ru' ? 'Познакомились:' : 'Met:'} ${partner.met}`;
        info.appendChild(met);
    }

    if (partner.metDate) {
        const metDate = document.createElement('div');
        metDate.className = 'info-item';
        metDate.innerHTML = `<i class="fas fa-calendar-alt"></i> ${currentLanguage === 'ru' ? 'Дата встречи:' : 'Meeting date:'} ${partner.metDate}`;
        info.appendChild(metDate);
    }

    if (partner.notes) {
        const notes = document.createElement('div');
        notes.className = 'info-item';
        notes.innerHTML = `<i class="fas fa-sticky-note"></i> ${currentLanguage === 'ru' ? 'Заметки:' : 'Notes:'} ${partner.notes}`;
        info.appendChild(notes);
    }

    card.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'partner-actions';

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'action-btn';
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
    deleteBtn.className = 'action-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.setAttribute('aria-label', currentLanguage === 'ru' ? 'Удалить партнера' : 'Delete partner');
    deleteBtn.onclick = () => deletePartner(index);
    actions.appendChild(deleteBtn);

    card.appendChild(actions);

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

// Рендеринг списка партнеров с пагинацией
function renderPartnersListTab() {
    const partnersList = document.getElementById('partners-list-tab');
    const noPartnersMessage = document.getElementById('no-partners-message');
    const partnersPageInfo = document.getElementById('partners-page-info');
    const prevPageBtn = document.getElementById('prev-partners-page');
    const nextPageBtn = document.getElementById('next-partners-page');
    partnersList.innerHTML = '';

    let filteredPartners = partners;
    const searchQuery = document.getElementById('partner-search').value.toLowerCase();

    if (currentFilter !== 'all') {
        if (currentFilter === 'all-serious') filteredPartners = partners.filter(p => p.status === 'serious');
        else filteredPartners = partners.filter(p => p.status === currentFilter);
    }

    if (searchQuery) filteredPartners = filteredPartners.filter(p => p.name.toLowerCase().includes(searchQuery));

    const totalItems = filteredPartners.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    currentPartnersPage = Math.min(currentPartnersPage, totalPages || 1);

    const startIndex = (currentPartnersPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedPartners = filteredPartners.slice(startIndex, endIndex);

    if (paginatedPartners.length === 0) {
        noPartnersMessage.classList.remove('hidden');
        partnersList.classList.add('hidden');
    } else {
        noPartnersMessage.classList.add('hidden');
        partnersList.classList.remove('hidden');
        paginatedPartners.forEach(partner => {
            const globalIndex = partners.indexOf(partner);
            const card = createPartnerCard(partner, globalIndex);
            partnersList.appendChild(card);
        });
    }

    partnersPageInfo.textContent = `${currentLanguage === 'ru' ? 'Страница' : 'Page'} ${currentPartnersPage} ${currentLanguage === 'ru' ? 'из' : 'of'} ${totalPages || 1}`;
    prevPageBtn.disabled = currentPartnersPage === 1;
    nextPageBtn.disabled = currentPartnersPage === totalPages || totalPages === 0;

    appState.partnersPage = currentPartnersPage;
    appState.partnerSearch = searchQuery;
    saveData();
}

// Фильтрация партнеров
function filterPartners(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.filter-btn[onclick="filterPartners('${filter}')"]`).classList.add('active');
    currentPartnersPage = 1;
    appState.partnerFilter = filter;
    appState.partnersPage = 1;
    saveData();
    renderPartnersListTab();
}

// Переключение страницы партнеров
function changePartnersPage(direction) {
    currentPartnersPage += direction;
    appState.partnersPage = currentPartnersPage;
    saveData();
    renderPartnersListTab();
    playSound(toggleSound);
}

// Показ формы добавления/редактирования партнера
function showPartnerForm(index = null) {
    const form = document.getElementById('add-partner-form');
    const title = document.getElementById('partner-form-title');
    const saveBtn = form.querySelector('.save-btn');
    const overlay = document.getElementById('overlay');

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

// Скрытие формы партнера
function hidePartnerForm() {
    const form = document.getElementById('add-partner-form');
    const overlay = document.getElementById('overlay');
    const logForm = document.getElementById('log-form');

    form.classList.remove('show');
    setTimeout(() => form.classList.add('hidden'), 500);

    if (!logForm.classList.contains('show')) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.opacity = '0';
            overlay.style.zIndex = '-1';
        }, 500);
    }
}

// Показ формы добавления/редактирования активности
function showLogForm(mode, index = null) {
    const form = document.getElementById('log-form');
    const title = document.getElementById('log-form-title');
    const submitBtn = document.getElementById('log-form-submit');
    const overlay = document.getElementById('overlay');
    const isMeetingCheckbox = document.getElementById('is-meeting');
    const partnerSelectGroup = document.getElementById('partner-select-group');
    const partnerSelect = document.getElementById('partner-select');

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

// Скрытие формы активности
function hideLogForm() {
    const form = document.getElementById('log-form');
    const overlay = document.getElementById('overlay');
    const partnerForm = document.getElementById('add-partner-form');

    form.classList.remove('show');
    setTimeout(() => form.classList.add('hidden'), 500);

    if (!partnerForm.classList.contains('show')) {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.opacity = '0';
            overlay.style.zIndex = '-1';
        }, 500);
    }
}

// Закрытие форм по клавише Esc
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const partnerForm = document.getElementById('add-partner-form');
        const logForm = document.getElementById('log-form');
        if (partnerForm.classList.contains('show')) hidePartnerForm();
        else if (logForm.classList.contains('show')) hideLogForm();
    }
});

// Сохранение партнера
function savePartner() {
    const name = document.getElementById('partner-name').value.trim();
    const met = document.getElementById('partner-met').value.trim();
    const metDate = document.getElementById('partner-met-date').value;
    const notes = document.getElementById('partner-notes').value.trim();
    const favorite = document.getElementById('partner-favorite').checked;
    const status = document.querySelector('input[name="status"]:checked').value;

    if (!name) {
        showToast(currentLanguage === 'ru' ? 'Пожалуйста, введите имя партнера.' : 'Please enter partner\'s name.', 'error');
        return;
    }

    const partner = { name, met: met || null, metDate: metDate || null, notes: notes || null, favorite, status };

    try {
        if (currentPartnerIndex !== null) {
            partners[currentPartnerIndex] = partner;
            showToast(currentLanguage === 'ru' ? 'Партнер успешно обновлен!' : 'Partner successfully updated!', 'success');
        } else {
            partners.push(partner);
            showToast(currentLanguage === 'ru' ? 'Партнер успешно добавлен!' : 'Partner successfully added!', 'success');
        }

        updateStats();
        renderFavorites();
        renderPartnersListTab();
        saveData();
        hidePartnerForm();
        playSound(addSound);
    } catch (error) {
        console.error('Error saving partner:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при сохранении партнера.' : 'Error saving partner.', 'error');
    }
}

// Удаление партнера
function deletePartner(index) {
    try {
        partners.splice(index, 1);
        updateStats();
        renderFavorites();
        renderPartnersListTab();
        saveData();
        showToast(currentLanguage === 'ru' ? 'Партнер удален.' : 'Partner deleted.', 'success');
        playSound(deleteSound);
    } catch (error) {
        console.error('Error deleting partner:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при удалении партнера.' : 'Error deleting partner.', 'error');
    }
}

// Переключение статуса избранного
function toggleFavorite(index) {
    try {
        partners[index].favorite = !partners[index].favorite;
        renderFavorites();
        renderPartnersListTab();
        saveData();
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
function saveLog() {
    const entry = document.getElementById('log-entry').value.trim();
    const isMeeting = document.getElementById('is-meeting').checked;
    const partnerIndex = document.getElementById('partner-select').value;

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
            logs.push(log);
            showToast(currentLanguage === 'ru' ? 'Активность добавлена!' : 'Activity added!', 'success');
        }

        renderRecentActivity();
        renderActivitiesList();
        saveData();
        hideLogForm();
        playSound(addSound);
    } catch (error) {
        console.error('Error saving activity:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при сохранении активности.' : 'Error saving activity.', 'error');
    }
}

// Удаление активности
function deleteLog(index) {
    try {
        logs.splice(index, 1);
        renderRecentActivity();
        renderActivitiesList();
        saveData();
        showToast(currentLanguage === 'ru' ? 'Активность удалена.' : 'Activity deleted.', 'success');
        playSound(deleteSound);
    } catch (error) {
        console.error('Error deleting activity:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при удалении активности.' : 'Error deleting activity.', 'error');
    }
}

// Инициализация кнопок переключения темы
function initializeThemeButtons() {
    const themeButtons = [
        document.getElementById('theme-toggle'),
        document.getElementById('theme-toggle-partners'),
        document.getElementById('theme-toggle-activities'),
        document.getElementById('theme-toggle-guides'),
        document.getElementById('theme-toggle-profile')
    ];

    themeButtons.forEach(button => {
        if (button) {
            button.removeEventListener('click', toggleTheme);
            button.addEventListener('click', toggleTheme);
            button.innerHTML = currentTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            button.setAttribute('aria-label', currentTheme === 'light' ? 
                (currentLanguage === 'ru' ? 'Переключить на темную тему' : 'Switch to dark theme') : 
                (currentLanguage === 'ru' ? 'Переключить на светлую тему' : 'Switch to light theme'));
        }
    });
}

// Переключение темы
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = currentTheme;
    initializeThemeButtons();
    saveData();
    playSound(themeSound);
}

// Загрузка профиля
function loadProfile() {
    const photoPreview = document.getElementById('profile-photo-preview');
    const photoPlaceholder = document.getElementById('photo-placeholder');

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

// Обработка загрузки фото
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast(currentLanguage === 'ru' ? 'Пожалуйста, выберите изображение.' : 'Please select an image.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            userProfile.photo = e.target.result;
            const photoPreview = document.getElementById('profile-photo-preview');
            const photoPlaceholder = document.getElementById('photo-placeholder');
            photoPreview.src = userProfile.photo;
            photoPreview.classList.remove('hidden');
            photoPlaceholder.classList.add('hidden');
            saveData();
            showToast(currentLanguage === 'ru' ? 'Фото профиля обновлено!' : 'Profile photo updated!', 'success');
        };
        reader.onerror = () => showToast(currentLanguage === 'ru' ? 'Ошибка при загрузке фото.' : 'Error uploading photo.', 'error');
        reader.readAsDataURL(file);
    }
}

// Сохранение профиля
function saveProfile() {
    userProfile.name = document.getElementById('profile-name').value.trim();
    userProfile.status = document.getElementById('profile-status').value.trim();
    userProfile.location = document.getElementById('profile-location').value.trim();
    userProfile.birthdate = document.getElementById('profile-birthdate').value;
    userProfile.bio = document.getElementById('profile-bio').value.trim();

    try {
        saveData();
        showToast(currentLanguage === 'ru' ? 'Профиль сохранен!' : 'Profile saved!', 'success');
        playSound(addSound);
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast(currentLanguage === 'ru' ? 'Ошибка при сохранении профиля.' : 'Error saving profile.', 'error');
    }
}

// Проверка состояния сети
function checkNetworkStatus() {
    const networkStatus = document.getElementById('network-status');
    if (!navigator.onLine) {
        networkStatus.textContent = currentLanguage === 'ru' ? 'Нет подключения к интернету 🌐' : 'No internet connection 🌐';
        networkStatus.classList.remove('hidden');
        setTimeout(() => networkStatus.classList.add('show'), 10);
    } else {
        networkStatus.classList.remove('show');
        setTimeout(() => networkStatus.classList.add('hidden'), 300);
    }
}



document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setDateConstraints();
    updateStats();
    renderRecentActivity();
    renderFavorites();
    showTab(appState.activeTab);
    filterPartners(appState.partnerFilter);
    document.getElementById('partner-search').value = appState.partnerSearch || '';
    document.getElementById('activity-search').value = appState.activitySearch || '';
    document.getElementById('activity-date-filter').value = appState.activityDateFilter || '';
    renderPartnersListTab();
    renderActivitiesList();
    checkNetworkStatus();

    const languageToggleBtn = document.getElementById('language-toggle');
    languageToggleBtn.textContent = currentLanguage === 'ru' ? 'Switch to English' : 'Сменить на русский';

    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);

    document.getElementById('overlay').addEventListener('click', () => {
        const partnerForm = document.getElementById('add-partner-form');
        const logForm = document.getElementById('log-form');
        const welcomeGuide = document.getElementById('welcome-guide');
        if (partnerForm.classList.contains('show')) hidePartnerForm();
        else if (logForm.classList.contains('show')) hideLogForm();
        else if (welcomeGuide.classList.contains('show')) closeWelcomeGuide();
    });

    document.getElementById('add-partner-form').addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('log-form').addEventListener('click', (e) => e.stopPropagation());
    document.getElementById('welcome-guide').addEventListener('click', (e) => e.stopPropagation());

    if (!hasSeenWelcomeGuide) {
        showWelcomeGuide();
    }

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const installBtn = document.createElement('button');
        installBtn.textContent = currentLanguage === 'ru' ? 'Установить LovePulse' : 'Install LovePulse';
        installBtn.className = 'action-btn install-btn';
        installBtn.style.position = 'fixed';
        installBtn.style.bottom = '20px';
        installBtn.style.right = '20px';
        installBtn.style.zIndex = '1000';

        installBtn.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    showToast(currentLanguage === 'ru' ? 'Приложение устанавливается! 🎉' : 'App is being installed! 🎉', 'success');
                } else {
                    showToast(currentLanguage === 'ru' ? 'Установка отменена 😔' : 'Installation cancelled 😔', 'success');
                }
                deferredPrompt = null;
                installBtn.remove();
            });
        });

        document.body.appendChild(installBtn);
    });

    window.addEventListener('appinstalled', () => {
        showToast(currentLanguage === 'ru' ? 'LovePulse успешно установлено! ❤️' : 'LovePulse successfully installed! ❤️', 'success');
    });
});