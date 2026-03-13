// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Данные пользователя
const initData = tg.initDataUnsafe;
const user = initData.user || {};

// Состояние приложения
let isAdmin = false;
let currentBalance = 0;

// Canvas фон
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Анимированные частицы
const particles = [];
const particleCount = 50;

for (let i = 0; i < particleCount; i++) {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2,
        opacity: Math.random() * 0.3
    });
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctx.fill();
    });
    
    requestAnimationFrame(animateParticles);
}

animateParticles();

// Форматирование чисел
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('userName').textContent = user.first_name || 'Гость';
    document.getElementById('profileId').textContent = user.id || '-';
    document.getElementById('profileName').textContent = user.first_name || '-';
    document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '-';
    
    const date = new Date();
    document.getElementById('profileDate').textContent = date.toLocaleDateString('ru-RU');
    
    document.getElementById('avatarPlaceholder').textContent = (user.first_name || 'G')[0].toUpperCase();
}

// Обновление баланса
function updateBalance(balance) {
    currentBalance = parseInt(balance) || 0;
    const formatted = formatNumber(currentBalance);
    document.getElementById('topBalance').textContent = formatted;
    document.getElementById('profileBalance').textContent = formatted;
}

// Навигация
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

function switchPage(pageId) {
    navItems.forEach(item => {
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    pages.forEach(page => {
        if (page.id === pageId + '-page') {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        switchPage(pageId);
    });
});

// Быстрый старт карточки
document.querySelectorAll('.quick-card').forEach(card => {
    card.addEventListener('click', () => {
        const pageId = card.dataset.page;
        switchPage(pageId);
        
        // Подсвечиваем соответствующую кнопку в навигации
        navItems.forEach(item => {
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    });
});

// Отправка данных в бота
function sendToBot(data) {
    tg.sendData(JSON.stringify(data));
}

// Обработка ответов от бота
window.handleBotResponse = function(data) {
    console.log('Ответ от бота:', data);
    
    switch(data.type) {
        case 'balance':
            updateBalance(data.balance);
            break;
            
        case 'inventory':
            updateInventory(data);
            break;
            
        case 'top':
            updateTop(data);
            break;
            
        case 'history':
            updateHistory(data);
            break;
            
        case 'bonus_status':
            updateBonusStatus(data);
            break;
            
        case 'case_result':
        case 'mass_case_result':
        case 'sell_result':
        case 'sell_all_result':
            showModal('РЕЗУЛЬТАТ', data.html);
            sendToBot({ action: 'get_inventory' });
            sendToBot({ action: 'get_balance' });
            break;
            
        case 'promo_result':
            showPromoResult(data);
            if (data.success) {
                sendToBot({ action: 'get_balance' });
            }
            break;
            
        case 'admin_status':
            isAdmin = data.isAdmin;
            if (isAdmin) {
                document.getElementById('adminBtn').style.display = 'flex';
            }
            break;
            
        case 'admin_stats':
            updateAdminStats(data);
            break;
            
        case 'admin_result':
            showModal('АДМИН', data.message);
            break;
    }
};

// Обновление инвентаря
function updateInventory(data) {
    const skinsList = document.getElementById('skinsList');
    const skinCount = document.getElementById('skinCount');
    const totalValue = document.getElementById('totalValue');
    
    if (!data.skins || data.skins.length === 0) {
        skinsList.innerHTML = '<div class="empty-state">Нет скинов</div>';
        skinCount.textContent = '0';
        totalValue.textContent = '0';
        return;
    }
    
    skinCount.textContent = data.count;
    totalValue.textContent = formatNumber(data.total_value);
    
    let html = '';
    data.skins.forEach(skin => {
        html += `
            <div class="skin-item">
                <div class="skin-info">
                    <div class="skin-name">${skin.name}</div>
                    <div class="skin-rarity">${skin.rarity}</div>
                </div>
                <div class="skin-price">${formatNumber(skin.price)} GRAM</div>
                <button class="sell-btn" onclick="sellSkin(${skin.id})">ПРОДАТЬ</button>
            </div>
        `;
    });
    
    skinsList.innerHTML = html;
}

// Обновление топа
function updateTop(data) {
    const topList = document.getElementById('topList');
    
    if (!data.users || data.users.length === 0) {
        topList.innerHTML = '<div class="empty-state">Нет данных</div>';
        return;
    }
    
    let html = '';
    data.users.forEach((user, index) => {
        const rank = index + 1;
        html += `
            <div class="top-item">
                <div class="top-rank">${rank}</div>
                <div class="top-info">
                    <div class="top-name">${user.name}</div>
                    <div class="top-balance">${formatNumber(user.balance)} GRAM</div>
                </div>
            </div>
        `;
    });
    
    topList.innerHTML = html;
}

// Обновление истории
function updateHistory(data) {
    const historyList = document.getElementById('historyList');
    
    if (!data.history || data.history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">История пуста</div>';
        return;
    }
    
    let html = '';
    data.history.forEach(item => {
        const isPositive = item.type === 'in';
        html += `
            <div class="history-item ${isPositive ? 'positive' : 'negative'}">
                <div class="history-icon">${isPositive ? '+' : '−'}</div>
                <div class="history-details">
                    <div class="history-type">${item.description}</div>
                    <div class="history-date">${item.date}</div>
                </div>
                <div class="history-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : '-'}${formatNumber(item.amount)} GRAM
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// Обновление статуса бонуса
function updateBonusStatus(data) {
    const timer = document.getElementById('bonusTimer');
    const btn = document.getElementById('openBonusBtn');
    
    if (data.available) {
        timer.textContent = 'ДОСТУПЕН';
        timer.style.color = 'var(--success)';
        btn.disabled = false;
    } else {
        timer.textContent = `${data.minutes}м ${data.seconds}с`;
        timer.style.color = 'var(--text-secondary)';
        btn.disabled = true;
    }
}

// Обновление админ статистики
function updateAdminStats(data) {
    document.getElementById('totalUsers').textContent = data.total_users;
    document.getElementById('todayUsers').textContent = data.today_users;
    document.getElementById('totalBalance').textContent = formatNumber(data.total_balance);
    document.getElementById('totalPromos').textContent = data.total_promos;
}

// Показ результата промокода
function showPromoResult(data) {
    const result = document.getElementById('promoResult');
    result.textContent = data.message;
    result.className = 'promo-result ' + (data.success ? 'success' : 'error');
    
    if (data.success) {
        document.getElementById('promoCode').value = '';
        setTimeout(() => {
            result.textContent = '';
            result.className = 'promo-result';
        }, 3000);
    }
}

// Открытие кейса
function openCase(caseType) {
    sendToBot({
        action: 'open_case',
        case_type: caseType
    });
}

// Массовое открытие кейсов
function openMassCase(caseType, count) {
    sendToBot({
        action: 'open_mass_case',
        case_type: caseType,
        count: count
    });
}

// Продажа скина
function sellSkin(skinId) {
    if (confirm('Продать этот скин?')) {
        sendToBot({
            action: 'sell_skin',
            skin_id: skinId
        });
    }
}

// Продажа всех скинов
document.getElementById('sellAllBtn').addEventListener('click', () => {
    if (confirm('Продать все скины?\nЭто действие нельзя отменить!')) {
        if (confirm('Вы уверены?')) {
            sendToBot({ action: 'sell_all_skins' });
        }
    }
});

// Активация промокода
document.getElementById('activatePromo').addEventListener('click', () => {
    const code = document.getElementById('promoCode').value.trim().toUpperCase();
    if (!code) {
        showModal('ОШИБКА', 'Введите промокод');
        return;
    }
    
    sendToBot({
        action: 'activate_promo',
        code: code
    });
});

// Бонус кейс
document.getElementById('openBonusBtn').addEventListener('click', () => {
    sendToBot({ action: 'open_bonus_case' });
});

// Модальное окно
const modal = document.getElementById('resultModal');

function showModal(title, body) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

// Модальное окно покупки
const buyModal = document.getElementById('buyModal');

document.getElementById('buyBtn').addEventListener('click', () => {
    buyModal.classList.add('active');
});

function closeBuyModal() {
    buyModal.classList.remove('active');
}

// Админ действия
function adminAction(action) {
    const userId = document.getElementById('adminUserId').value.trim();
    const amount = document.getElementById('adminAmount').value.trim();
    
    if (!userId) {
        showModal('ОШИБКА', 'Введите ID пользователя');
        return;
    }
    
    sendToBot({
        action: 'admin',
        command: 'balance_action',
        admin_action: action,
        user_id: parseInt(userId),
        amount: amount
    });
}

function createPromo() {
    const code = document.getElementById('promoCodeAdmin').value.trim().toUpperCase();
    const amount = document.getElementById('promoAmount').value.trim();
    const uses = document.getElementById('promoUses').value.trim() || '0';
    
    if (!code || !amount) {
        showModal('ОШИБКА', 'Заполните все поля');
        return;
    }
    
    sendToBot({
        action: 'admin',
        command: 'create_promo',
        code: code,
        amount: amount,
        uses: parseInt(uses)
    });
}

function sendBroadcast() {
    const text = document.getElementById('broadcastText').value.trim();
    
    if (!text) {
        showModal('ОШИБКА', 'Введите текст');
        return;
    }
    
    if (confirm('Отправить рассылку всем пользователям?')) {
        sendToBot({
            action: 'admin',
            command: 'broadcast',
            text: text
        });
    }
}

// Закрытие модалок по клику вне
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

buyModal.addEventListener('click', (e) => {
    if (e.target === buyModal) {
        closeBuyModal();
    }
});

// Проверка админа
function checkAdmin() {
    sendToBot({ action: 'check_admin' });
}

// Запрос начальных данных
function loadInitialData() {
    sendToBot({ action: 'get_balance' });
    sendToBot({ action: 'get_inventory' });
    sendToBot({ action: 'get_top' });
    sendToBot({ action: 'get_history' });
    sendToBot({ action: 'check_bonus' });
}

// Инициализация
updateUI();
checkAdmin();
loadInitialData();

// Периодическое обновление
setInterval(() => {
    if (document.getElementById('profile-page').classList.contains('active')) {
        sendToBot({ action: 'get_balance' });
    }
    if (document.getElementById('inventory-page').classList.contains('active')) {
        sendToBot({ action: 'get_inventory' });
    }
    if (document.getElementById('top-page').classList.contains('active')) {
        sendToBot({ action: 'get_top' });
    }
    if (document.getElementById('cases-page').classList.contains('active')) {
        sendToBot({ action: 'check_bonus' });
    }
}, 30000);

// Обработка изменения вьюпорта
tg.onEvent('viewportChanged', () => {
    tg.expand();
});