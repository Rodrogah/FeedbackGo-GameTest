// 1. LÓGICA DO APLICATIVO MOBILE

let currentMobileTab = 'dashboard';
window.tarefasDelegadas = window.tarefasDelegadas || [];


// Timeout de segurança: Garante que o splash suma em caso de travamento
setTimeout(() => {
    const splash = document.getElementById('splashLoadingGlobal');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
    }
}, 4000);

window.initMobileApp = function () {
    console.log("Iniciando Mobile UI...");

    if (!currentUser) {
        const login = document.getElementById('loginScreen');
        const app = document.getElementById('mobileApp');
        if (app) app.classList.add('hidden');
        if (login) {
            login.style.display = 'flex';
            login.classList.remove('hidden');
        }
        return;
    }

    // Forçar visibilidade do aplicativo
    const login = document.getElementById('loginScreen');
    const app = document.getElementById('mobileApp');

    if (login) {
        login.classList.add('hidden');
        login.style.setProperty('display', 'none', 'important');
    }

    if (app) {
        app.classList.remove('hidden');
        app.style.setProperty('display', 'block', 'important');
    }

    updateMobileProfile();
    const savedTab = localStorage.getItem('feedbackgo_mobile_tab') || 'dashboard';
    switchMobileTab(savedTab);

    if (typeof window.startLiveRadar === 'function') window.startLiveRadar();
    if (typeof window.iniciarRadarCalendario === 'function') window.iniciarRadarCalendario();

    // Carregamento inicial de dados
    setTimeout(() => {
        if (typeof refreshMobileDashboard === 'function') refreshMobileDashboard();
    }, 500);
};

// Sobrescreve a função global de mostrar painel para funcionar no Mobile
window.showPanel = function (role) {
    console.log("showPanel disparado no mobile para:", role);
    initMobileApp();
};

function updateMobileProfile() {
    const avatar = document.getElementById('mobileUserAvatar');
    if (avatar && currentUser) {
        if (currentUser.avatarUrl) {
            avatar.innerText = '';
            avatar.style.backgroundImage = `url('${currentUser.avatarUrl}')`;
            avatar.style.backgroundSize = 'cover';
        } else {
            avatar.innerText = currentUser.name.charAt(0).toUpperCase();
            avatar.style.backgroundImage = 'none';
            avatar.style.background = getCategoryStyleString(currentUser.name).includes('--cat-hue')
                ? `hsl(var(--cat-hue), 70%, 50%)`
                : '#10b981';
        }
    }

    const nameEl = document.getElementById('mobileUserName');
    const roleEl = document.getElementById('mobileUserRole');
    if (nameEl && currentUser) nameEl.innerText = currentUser.name.split(' ')[0];
    if (roleEl && currentUser) {
        if (currentUser.role === 'hibrido') {
            const hibridoModo = localStorage.getItem('feedbackgo_modo_hibrido') || 'admin';
            roleEl.innerText = hibridoModo === 'admin' ? 'Administrador' : 'Colaborador';
        } else {
            const roles = { 'admin': 'Administrador', 'funcionario': 'Colaborador', 'hibrido': 'Híbrido' };
            roleEl.innerText = roles[currentUser.role] || (currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : '');
        }
    }
}

window.switchMobileTab = function (tab, btn) {
    const c = companies.find(x => String(x.id) === String(currentUser ? currentUser.companyId : null));
    const isAtiva = c ? (c.gamificationEnabled === true) : false;
    const isRewardsAtiva = c ? (c.rewardsEnabled !== false) : true;

    if (!isAtiva || !isRewardsAtiva) {
        if (tab === 'store' || tab === 'resgates' || tab === 'resgate_admin') {
            tab = 'dashboard';
            btn = null;
        }
    }

    currentMobileTab = tab;
    localStorage.setItem('feedbackgo_mobile_tab', tab);

    // Update UI
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) {
        btn.classList.add('active');
    } else {
        // Find by tab name if called programmatically
        const btns = document.querySelectorAll('.bottom-nav .nav-btn');
        if (btns.length >= 5) {
            btns.forEach(b => {
                const action = b.getAttribute('onclick');
                if (action && action.includes(`'${tab}'`)) b.classList.add('active');
            });
        }
    }

    // Limpa o conteúdo anterior e mostra um skeleton/spinner rápido para sensação de "mudança instantânea"
    const container = document.getElementById('mobileContent');
    if (container) {
        container.innerHTML = `
            <div class="m-section animate-fade-in" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:100px 20px; opacity:0.3;">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size:24px; color:var(--mobile-primary);"></i>
            </div>
        `;
    }

    // Defer rendering to next frame to ensure UI responsiveness
    requestAnimationFrame(() => {
        renderMobileTab(tab);
    });
};

window.showMobileProfile = function () {
    switchMobileTab('profile');
};

function renderMobileTab(tab) {
    const container = document.getElementById('mobileContent');
    if (!container) return;

    if (tab === 'dashboard') {
        renderMobileDashboard(container);
    } else if (tab === 'tasks') {
        renderMobileTasks(container);
    } else if (tab === 'history') {
        renderMobileHistory(container);
    } else if (tab === 'profile') {
        renderMobileProfile(container);
    } else if (tab === 'calendario') {
        renderMobileCalendar(container);
    } else if (tab === 'store') {
        renderMobileStore(container);
    } else if (tab === 'resgates') {
        renderMobileMyRedemptions(container);
    } else if (tab === 'resgate_admin') {
        renderMobileAdminStore(container);
    } else if (tab === 'reports') {
        renderMobileReports(container);
    } else if (tab === 'users') {
        renderMobileUsers(container);
    } else if (tab === 'teams') {
        renderMobileTeams(container);
    } else {
        // Para outras telas...
        container.innerHTML = `<div id="mobileSharedPanel" class="m-section">
            <div class="loading-placeholder"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Carregando ${tab}...</p></div>
        </div>`;
    }
}

// 2. CALENDÁRIO MOBILE
window.mobileCalendarDate = new Date();
window.mobileCalendarSelectedDate = new Date();

window.renderMobileCalendar = function (container) {
    if (!container) {
        if (typeof currentMobileTab !== 'undefined' && currentMobileTab !== 'calendario') return;
        container = document.getElementById('mobileContent');
    }
    if (!container) return;

    const date = window.mobileCalendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();

    // Nome do mês
    let monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    let html = `
        <div class="m-section">
            <div class="m-calendar-container animate__animated animate__fadeIn">
                <div class="m-calendar-header">
                    <h3 style="margin:0; font-size:18px; font-weight:800; color: var(--mobile-text);">${monthName} ${year}</h3>
                    <div style="display:flex; gap:8px;">
                        <!-- Botão Adicionar Evento -->
                        <button onclick="openMobileNewCalendarEvent()" class="icon-btn" style="background:#10b981; width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; color: white;">
                             <i class="fa-solid fa-plus" style="font-size: 16px;"></i>
                        </button>
                        
                        <button onclick="changeMobileMonth(-1)" class="icon-btn" style="background:rgba(0,0,0,0.05); width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; color: var(--mobile-text);"><i class="fa-solid fa-chevron-left"></i></button>
                        <button onclick="changeMobileMonth(1)" class="icon-btn" style="background:rgba(0,0,0,0.05); width:36px; height:36px; border-radius:12px; display:flex; align-items:center; justify-content:center; color: var(--mobile-text);"><i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
                
                <div class="m-calendar-grid">
                    <div class="m-cal-weekday">Dom</div>
                    <div class="m-cal-weekday">Seg</div>
                    <div class="m-cal-weekday">Ter</div>
                    <div class="m-cal-weekday">Qua</div>
                    <div class="m-cal-weekday">Qui</div>
                    <div class="m-cal-weekday">Sex</div>
                    <div class="m-cal-weekday">Sáb</div>
    `;

    // Dias do mês anterior (cinzas)
    for (let i = firstDay; i > 0; i--) {
        html += `<div class="m-cal-day outside">${prevLastDate - i + 1}</div>`;
    }

    const today = new Date();
    const selected = window.mobileCalendarSelectedDate;

    for (let i = 1; i <= lastDate; i++) {
        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isSelected = i === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Filtrar eventos do dia seguindo as regras de visibilidade globais
        const isVisualAdmin = isCurrentModeAdmin();
        const events = window.lembretesGlobais.filter(l => {
            const start = l.data; const end = l.dataFim || l.data;
            if (dateStr < start || dateStr > end) return false;

            // Reutiliza a lógica robusta de calendario.js para contas hibridas
            if (typeof filtrarLembretePorVisibilidade === 'function') {
                return filtrarLembretePorVisibilidade(l, isVisualAdmin);
            }
            return true;
        });

        html += `
            <div class="m-cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="selectMobileCalendarDay(${year}, ${month}, ${i})">
                ${i}
                <div class="m-cal-dot-container">
                    ${events.slice(0, 3).map(e => `<div class="m-cal-dot" style="background:${e.cor || '#10b981'};"></div>`).join('')}
                    ${events.length > 3 ? `<div class="m-cal-dot" style="background:#64748b; width:4px; height:4px; opacity:0.5;"></div>` : ''}
                </div>
            </div>
        `;
    }

    html += `</div></div>`;

    // Lista de eventos abaixo para o dia selecionado
    html += `<div class="m-cal-events-list animate__animated animate__fadeInUp" id="mobileCalendarEventsList" style="margin-top: 15px; padding: 0 5px;">`;
    html += renderMobileCalendarEvents(window.mobileCalendarSelectedDate);
    html += `</div>`;

    container.innerHTML = html;
};

window.changeMobileMonth = function (dir) {
    window.mobileCalendarDate.setMonth(window.mobileCalendarDate.getMonth() + dir);
    renderMobileCalendar();
};

window.selectMobileCalendarDay = function (y, m, d) {
    window.mobileCalendarSelectedDate = new Date(y, m, d);
    renderMobileCalendar();
};

// Correção de codificação de texto (UTF-8/Latin1)
function fixEncoding(str) {
    if (!str) return '';
    if (typeof str !== 'string') return str;
    // Se detectar padrão de Double UTF-8 (comum em migrações de PC/Web)
    if (str.includes('Ã')) {
        try {
            // Tenta converter de UTF-8 bytes interpretados como Latin1 de volta para UTF-8 real
            return decodeURIComponent(escape(str));
        } catch (e) {
            // Fallback manual para os casos mais comuns se o decode falhar
            return str.replace(/Ã£/g, 'ã').replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é')
                .replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
                .replace(/Ã§/g, 'ç').replace(/Ãª/g, 'ê').replace(/Ãµ/g, 'õ')
                .replace(/PÃºblico/g, 'Público');
        }
    }
    return str;
}

window.renderMobileCalendarEvents = function (date) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isVisualAdmin = isCurrentModeAdmin();
    const events = window.lembretesGlobais.filter(l => {
        const start = l.data; const end = l.dataFim || l.data;
        if (dateStr < start || dateStr > end) return false;

        if (typeof filtrarLembretePorVisibilidade === 'function') {
            return filtrarLembretePorVisibilidade(l, isVisualAdmin);
        }
        return true;
    });

    if (events.length === 0) {
        return `<div style="text-align:center; padding:50px 20px; opacity:0.4;">
            <i class="fa-solid fa-calendar-xmark" style="font-size:36px; margin-bottom:12px; color: var(--mobile-text);"></i>
            <p style="font-size:14px; font-weight:700; color: var(--mobile-text);">Sem eventos para este dia</p>
        </div>`;
    }

    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaNome = weekdays[date.getDay()];

    let listHtml = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding: 0 10px;">
        <span style="font-size:13px; font-weight:800; color:var(--mobile-text); opacity:0.6;">${diaNome.toUpperCase()}, ${date.getDate()}</span>
        <span style="font-size:11px; font-weight:700; color:var(--mobile-primary);">${events.length} EVENTO(S)</span>
    </div>`;

    listHtml += events.map(e => {
        const tituloFix = fixEncoding(e.titulo);
        const categoriaFix = fixEncoding(e.categoria || 'Evento');
        const visibilidadeFix = e.visibilidade === 'todos' ? 'Público' : (e.visibilidade === 'adms' ? 'Admins' : 'Privado');

        return `
        <div class="m-cal-event-item" onclick="openMobileEventDetail('${e.id}')">
            <div class="m-cal-event-color" style="background:${e.cor || '#10b981'};"></div>
            <div class="m-cal-event-info">
                <h4>${esc(tituloFix)}</h4>
                <p>${esc(categoriaFix)} • ${esc(visibilidadeFix)}</p>
            </div>
            <i class="fa-solid fa-chevron-right" style="opacity:0.2; font-size:12px;"></i>
        </div>
    `;
    }).join('');

    return listHtml;
};

window.openMobileEventDetail = function (eventId) {
    const e = window.lembretesGlobais.find(x => String(x.id) === String(eventId));
    if (!e) return;

    const titulo = fixEncoding(e.titulo);
    const desc = fixEncoding(e.descricao) || 'Nenhuma descrição detalhada.';
    const cat = fixEncoding(e.categoria || 'Evento');

    // Formatação de Datas
    const formatDateBr = (dStr) => {
        if (!dStr) return '';
        const parts = dStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    let infoData = formatDateBr(e.data);
    if (e.dataFim && e.dataFim !== e.data) {
        infoData += ` até ${formatDateBr(e.dataFim)}`;
    }

    const criador = users.find(u => String(u.id) === String(e.userId))?.name || 'Administrador';

    const eventColor = e.cor || 'var(--mobile-primary)';

    // Calcula cores suaves baseadas na cor do evento
    const bgSoft = `${eventColor}15`; // 15% opacidade
    const borderSoft = `${eventColor}30`; // 30% opacidade

    const html = `
        <div class="m-detail-view animate-fade-in" style="padding: 10px 0; position: relative;">
            <!-- Badge de Categoria Flutuante -->
            <div style="display: flex; justify-content: center; margin-bottom: 25px;">
                <div style="padding: 6px 16px; border-radius: 20px; background: ${bgSoft}; color: ${eventColor}; border: 1px solid ${borderSoft}; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fa-solid fa-tag"></i> ${cat}
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin: 0; font-size: 26px; font-weight: 900; color: var(--mobile-text); line-height: 1.2;">${titulo}</h2>
            </div>

            <!-- Grid de Informações -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <div style="background: hsla(210, 100%, 50%, 0.05); padding: 18px; border-radius: 20px; border: 1px solid rgba(59, 130, 246, 0.2);">
                    <span style="display:block; font-size:10px; font-weight:800; color:#3b82f6; text-transform:uppercase; margin-bottom:8px; letter-spacing:1px;">
                        <i class="fa-regular fa-calendar-days"></i> Data
                    </span>
                    <p style="margin:0; font-size:14px; font-weight:700; color:var(--mobile-text);">${infoData}</p>
                </div>
                
                <div style="background: hsla(160, 100%, 40%, 0.05); padding: 18px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.2);">
                    <span style="display:block; font-size:10px; font-weight:800; color:#10b981; text-transform:uppercase; margin-bottom:8px; letter-spacing:1px;">
                        <i class="fa-solid fa-user-shield"></i> Criador
                    </span>
                    <p style="margin:0; font-size:14px; font-weight:700; color:var(--mobile-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${criador}</p>
                </div>
            </div>

            <!-- Descrição Estilizada -->
            <div style="background: var(--mobile-card-bg); padding: 22px; border-radius: 24px; border: 1px solid var(--mobile-border); box-shadow: 0 10px 30px rgba(0,0,0,0.03); margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; color: var(--mobile-text-secondary);">
                        <i class="fa-solid fa-align-left"></i>
                    </div>
                    <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: var(--mobile-text); text-transform: uppercase; letter-spacing: 0.5px;">Descrição</h4>
                </div>
                <p style="margin: 0; font-size: 15px; color: var(--mobile-text); line-height: 1.7; opacity: 0.85; white-space: pre-wrap;">${desc}</p>
            </div>

            <!-- Botões de Ação (Apenas para o Dono e Modo Correto) -->
            ${(() => {
            let canEdit = String(e.userId) === String(currentUser.id);
            if (canEdit && currentUser.role === 'hibrido') {
                const isVisualAdmin = isCurrentModeAdmin();
                const origem = e.origem || 'admin';
                if ((isVisualAdmin && origem !== 'admin') || (!isVisualAdmin && origem !== 'func')) {
                    canEdit = false;
                }
            }

            if (!canEdit) return '';

            return `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px;">
                        <button onclick="deleteMobileCalendarEvent('${e.id}')" style="background: #ef4444; color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-trash-can"></i> Excluir
                        </button>
                        <button onclick="openMobileEditCalendarEvent('${e.id}')" style="background: #10b981; color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                    </div>
                `;
        })()}
        </div>
    `;

    // Abre o modal com título vazio para usarmos nosso próprio header customizado dentro do HTML
    openMobileModal('', html);
};

// 3. GERENCIAMENTO DE EVENTOS (CALENDÁRIO MOBILE)
window.openMobileNewCalendarEvent = function () {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const categories = c?.calendarCategories || ['Reunião', 'Prazo', 'Evento', 'Feriado', 'Outro'];
    const selectedDateStr = window.mobileCalendarSelectedDate.toISOString().split('T')[0];

    const html = `
        <div class="settings-detail-view" style="padding: 10px;">
            <div class="m-card">
                <form id="mNewEventForm" style="display: flex; flex-direction: column; gap: 18px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <div style="background:rgba(16, 185, 129, 0.1); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#10b981;">
                            <i class="fa-solid fa-calendar-plus"></i>
                        </div>
                        <h3 style="margin:0; font-size:16px; font-weight:800; color:var(--mobile-text);">Novo Evento</h3>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">TÍTULO</label>
                        <input type="text" id="mEventTitle" placeholder="Ex: Reunião Geral" required style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">INÍCIO</label>
                            <input type="date" id="mEventDate" value="${selectedDateStr}" required style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">FIM</label>
                            <input type="date" id="mEventDateEnd" value="${selectedDateStr}" style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">CATEGORIA</label>
                            <select id="mEventCategory" style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                                ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">VISIBILIDADE</label>
                            <select id="mEventVisibility" style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                                ${isCurrentModeAdmin() ? `
                                    <option value="todos">Público</option>
                                    <option value="privado">Privado (Só Eu)</option>
                                    <option value="adms">Apenas Admins</option>
                                ` : `
                                    <option value="privado">Apenas Eu (Privado)</option>
                                    <option value="adms">Eu e Coordenadores</option>
                                `}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:12px; text-transform:uppercase;">ESCOLHA UMA COR</label>
                        <div style="display:flex; justify-content:space-between; padding: 5px;">
                            ${['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899'].map((c, i) => `
                                <label class="m-color-label">
                                    <input type="radio" name="mEventColor" value="${c}" ${i === 0 ? 'checked' : ''} style="display:none;">
                                    <div class="m-color-circle" style="width:34px; height:34px; border-radius:50%; background:${c}; cursor:pointer; border:3px solid transparent; transition:0.3s; box-shadow: 0 4px 8px rgba(0,0,0,0.15);"></div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">DESCRIÇÃO (OPCIONAL)</label>
                        <textarea id="mEventDesc" rows="3" placeholder="Detalhes..." style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none; resize:none;"></textarea>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <button type="button" onclick="closeMobileModal()" style="background:transparent; border:none; color:var(--mobile-text-secondary); font-weight:800; font-size:13px;">CANCELAR</button>
                        <button type="submit" class="btn btn-mobile-primary" style="padding:15px 30px; border-radius:15px; font-weight:900; font-size:14px; width:auto;">CRIAR EVENTO</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    openMobileModal('Novo Evento', html);

    document.getElementById('mNewEventForm').addEventListener('submit', function (e) {
        e.preventDefault();
        saveMobileCalendarEvent();
    });
};

window.saveMobileCalendarEvent = function () {
    const titulo = document.getElementById('mEventTitle').value.trim();
    if (!titulo) return;

    const isAdmin = currentUser.role === 'admin' || (currentUser.role === 'hibrido' && (localStorage.getItem('feedbackgo_modo_hibrido') || 'admin') === 'admin');
    const selectedColor = document.querySelector('input[name="mEventColor"]:checked')?.value || '#3b82f6';

    const payload = {
        companyId: currentUser.companyId,
        userId: currentUser.id,
        autorNome: currentUser.name,
        titulo: titulo,
        data: document.getElementById('mEventDate').value,
        dataFim: document.getElementById('mEventDateEnd').value || document.getElementById('mEventDate').value,
        categoria: document.getElementById('mEventCategory').value,
        visibilidade: document.getElementById('mEventVisibility').value,
        descricao: document.getElementById('mEventDesc').value.trim(),
        cor: selectedColor,
        origem: isAdmin ? 'admin' : 'func',
        createdAt: new Date().toISOString()
    };

    showToast('Salvando...', 'info');

    db.collection('lembretes').add(payload).then(() => {
        showToast('Evento criado!', 'success');
        closeMobileModal();
        // Sincronização automática via snapshot
        if (typeof window.renderMobileCalendar === 'function') {
            setTimeout(() => renderMobileCalendar(), 500);
        }
    }).catch(err => {
        console.error("Erro ao salvar evento mobile:", err);
        showToast('Erro ao salvar.', 'error');
    });
};

window.deleteMobileCalendarEvent = function (eventId) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    showToast('Excluindo...', 'info');
    db.collection('lembretes').doc(String(eventId)).delete().then(() => {
        showToast('Evento excluído!', 'success');
        closeMobileModal();
        if (typeof window.renderMobileCalendar === 'function') {
            setTimeout(() => renderMobileCalendar(), 500);
        }
    }).catch(err => {
        console.error("Erro ao excluir evento mobile:", err);
        showToast('Erro ao excluir.', 'error');
    });
};

window.openMobileEditCalendarEvent = function (eventId) {
    const e = window.lembretesGlobais.find(x => String(x.id) === String(eventId));
    if (!e) return;

    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const categories = c?.calendarCategories || ['Reunião', 'Prazo', 'Evento', 'Feriado', 'Outro'];
    const isAdmin = isCurrentModeAdmin();

    const html = `
        <div class="settings-detail-view" style="padding: 10px;">
            <div class="m-card">
                <form id="mEditEventForm" style="display: flex; flex-direction: column; gap: 18px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                        <div style="background:rgba(16, 185, 129, 0.1); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#10b981;">
                            <i class="fa-solid fa-calendar-check"></i>
                        </div>
                        <h3 style="margin:0; font-size:16px; font-weight:800; color:var(--mobile-text);">Editar Evento</h3>
                    </div>

                    <input type="hidden" id="mEditEventId" value="${e.id}">

                    <div>
                        <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">TÍTULO</label>
                        <input type="text" id="mEditEventTitle" value="${fixEncoding(e.titulo)}" required style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">INÍCIO</label>
                            <input type="date" id="mEditEventDate" value="${e.data}" required style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">FIM</label>
                            <input type="date" id="mEditEventDateEnd" value="${e.dataFim || e.data}" style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">CATEGORIA</label>
                            <select id="mEditEventCategory" style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                                ${categories.map(cat => `<option value="${cat}" ${cat === e.categoria ? 'selected' : ''}>${cat}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">VISIBILIDADE</label>
                            <select id="mEditEventVisibility" style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none;">
                                ${isAdmin ? `
                                    <option value="todos" ${e.visibilidade === 'todos' ? 'selected' : ''}>Público</option>
                                    <option value="privado" ${e.visibilidade === 'privado' ? 'selected' : ''}>Privado (Só Eu)</option>
                                    <option value="adms" ${e.visibilidade === 'adms' ? 'selected' : ''}>Apenas Admins</option>
                                ` : `
                                    <option value="privado" ${e.visibilidade === 'privado' ? 'selected' : 'selected'}>Apenas Eu (Privado)</option>
                                    <option value="adms" ${e.visibilidade === 'adms' ? 'selected' : ''}>Eu e Coordenadores</option>
                                `}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:12px; text-transform:uppercase;">ESCOLHA UMA COR</label>
                        <div style="display:flex; justify-content:space-between; padding: 5px;">
                            ${['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b', '#ec4899'].map((c) => `
                                <label class="m-color-label">
                                    <input type="radio" name="mEditEventColor" value="${c}" ${c === e.cor ? 'checked' : ''} style="display:none;">
                                    <div class="m-color-circle" style="width:34px; height:34px; border-radius:50%; background:${c}; cursor:pointer; border:3px solid ${c === e.cor ? 'white' : 'transparent'}; transition:0.3s; box-shadow: 0 4px 8px rgba(0,0,0,0.15);"></div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:800; opacity:0.6; margin-bottom:8px; text-transform:uppercase;">DESCRIÇÃO (OPCIONAL)</label>
                        <textarea id="mEditEventDesc" rows="3" placeholder="Detalhes..." style="width:100%; padding:14px; background:rgba(0,0,0,0.05); border:1px solid var(--mobile-border); border-radius:12px; color:var(--mobile-text); font-weight:700; outline:none; resize:none;">${fixEncoding(e.descricao || '')}</textarea>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <button type="button" onclick="openMobileEventDetail('${e.id}')" style="background:transparent; border:none; color:var(--mobile-text-secondary); font-weight:800; font-size:13px;">VOLTAR</button>
                        <button type="submit" class="btn btn-mobile-primary" style="padding:15px 30px; border-radius:15px; font-weight:900; font-size:14px; width:auto;">SALVAR ALTERAÇÕES</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    openMobileModal('Editar Evento', html);

    document.getElementById('mEditEventForm').addEventListener('submit', function (e) {
        e.preventDefault();
        saveEditedMobileCalendarEvent();
    });
};

window.saveEditedMobileCalendarEvent = function () {
    const id = document.getElementById('mEditEventId').value;
    const titulo = document.getElementById('mEditEventTitle').value.trim();
    if (!titulo || !id) return;

    const selectedColor = document.querySelector('input[name="mEditEventColor"]:checked')?.value || '#3b82f6';

    const payload = {
        titulo: titulo,
        data: document.getElementById('mEditEventDate').value,
        dataFim: document.getElementById('mEditEventDateEnd').value || document.getElementById('mEditEventDate').value,
        categoria: document.getElementById('mEditEventCategory').value,
        visibilidade: document.getElementById('mEditEventVisibility').value,
        descricao: document.getElementById('mEditEventDesc').value.trim(),
        cor: selectedColor,
        updatedAt: new Date().toISOString()
    };

    showToast('Salvando alterações...', 'info');

    db.collection('lembretes').doc(String(id)).update(payload).then(() => {
        showToast('Evento atualizado!', 'success');
        closeMobileModal();
        if (typeof window.renderMobileCalendar === 'function') {
            setTimeout(() => renderMobileCalendar(), 500);
        }
    }).catch(err => {
        console.error("Erro ao atualizar evento mobile:", err);
        showToast('Erro ao atualizar.', 'error');
    });
};

function getCategoryColorMobile(cat) {
    const colors = window.APP_CONFIG.defaults.categoryColors;
    return colors[cat] || colors['default'];
}

window.isCurrentModeAdmin = function () {
    return currentUser.role === 'admin' || (currentUser.role === 'hibrido' && (localStorage.getItem('feedbackgo_modo_hibrido') || 'admin') === 'admin');
};

window.mobileDashActiveStatus = null;
window.mobileDashActiveCategory = null;

function getFilteredMobileData(ignoreStatus = false, ignoreCategory = false) {
    const isAdmin = isCurrentModeAdmin();
    const team = document.getElementById('mFilterTeam')?.value;
    const user = document.getElementById('mFilterUser')?.value;
    const cat = document.getElementById('mFilterCategory')?.value;
    const start = document.getElementById('mFilterStart')?.value;
    const end = document.getElementById('mFilterEnd')?.value;

    // Data is already filtered by companyId in the core.js radar
    let f = activities;

    if (!isAdmin) {
        const currentUserIdStr = String(currentUser.id);
        f = f.filter(a => String(a.userId) === currentUserIdStr);
    } else {
        // Filtros exclusivos de Admin (Equipe e Usuário)
        if (team) {
            const teamUsers = users.filter(u => u.team === team).map(u => u.id);
            f = f.filter(a => teamUsers.includes(a.userId));
        }
        if (user) f = f.filter(a => String(a.userId) === String(user));
    }

    // Filtros comuns (Categoria e Datas)
    if (cat) f = f.filter(a => String(a.category) === String(cat));
    if (start) f = f.filter(a => a.date >= start);
    if (end) f = f.filter(a => a.date <= end);

    // Filtros interativos dos Gráficos (Power BI)
    if (!ignoreCategory && window.mobileDashActiveCategory) {
        f = f.filter(a => a.category === window.mobileDashActiveCategory);
    }
    if (!ignoreStatus && window.mobileDashActiveStatus) {
        f = f.filter(a => a.status === window.mobileDashActiveStatus);
    }

    return f;
}


function renderMobileDashboard(container) {
    try {
        const isAdmin = isCurrentModeAdmin();


        const filteredActs = getFilteredMobileData();
        const c = companies.find(x => String(x.id) === String(currentUser.companyId));

        // Stats logic
        const hoje = getLocalToday();
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

        const stats = isAdmin ? {
            total: filteredActs.length,
            concluidas: filteredActs.filter(a => a.status === 'concluido').length,
            pendentes: filteredActs.filter(a => a.status === 'pendente' || a.status === 'andamento').length,
            ativos: new Set(filteredActs.map(a => a.userId)).size
        } : {
            hoje: filteredActs.filter(a => a.date === hoje).length,
            mes: filteredActs.filter(a => a.date >= startOfMonthStr).length,
            total: filteredActs.length,
            pendentes: filteredActs.filter(a => a.status === 'pendente' || a.status === 'andamento').length
        };

        const statsConfig = isAdmin ? [
            { label: 'Total Registros', val: stats.total, border: 'border-left-info' },
            { label: 'Concluídas', val: stats.concluidas, border: 'border-left-success' },
            { label: 'Pendentes/Atraso', val: stats.pendentes, border: 'border-left-danger' },
            { label: 'Colab. Ativos', val: stats.ativos, border: 'border-left-warning' }
        ] : [
            { label: 'ATIVIDADES DE HOJE', val: stats.hoje, border: 'border-left-info' },
            { label: 'ATIVIDADES DESTE MÊS', val: stats.mes, border: 'border-left-success' },
            { label: 'TOTAL DE REGISTROS', val: stats.total, border: 'border-left-warning' },
            { label: 'TAREFAS PENDENTES', val: stats.pendentes, border: 'border-left-danger' }
        ];


        // Check if the dashboard is already rendered!
        const existingStatusCanvas = document.getElementById('mChartStatus');
        if (existingStatusCanvas) {
            const statCards = container.querySelectorAll('.mobile-stat-card');
            if (statCards && statCards.length === statsConfig.length) {
                statsConfig.forEach((s, idx) => {
                    const valSpan = statCards[idx].querySelector('.value');
                    if (valSpan) valSpan.textContent = s.val;
                });
            }

            renderMobileAdminCharts(filteredActs);
            if (isAdmin) populateMobileFilters();
            return;
        }

        container.innerHTML = `
        <!-- Botão Filtro Dashboard (Drawer) -->
        <div style="padding: 10px 15px 15px;">
            <!-- Hidden state persistence for filters -->
            <input type="hidden" id="mFilterTeam" value="${document.getElementById('mFilterTeam')?.value || ''}">
            <input type="hidden" id="mFilterUser" value="${document.getElementById('mFilterUser')?.value || ''}">
            <input type="hidden" id="mFilterCategory" value="${document.getElementById('mFilterCategory')?.value || ''}">
            <input type="hidden" id="mFilterStart" value="${document.getElementById('mFilterStart')?.value || ''}">
            <input type="hidden" id="mFilterEnd" value="${document.getElementById('mFilterEnd')?.value || ''}">

            <button class="btn" onclick="openMobileFilterDrawer()" style="width: 100%; height: 50px; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); border-radius: 14px; font-weight: 800; color: var(--mobile-text); display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; letter-spacing: 0.5px; box-shadow: var(--mobile-card-shadow);">
                <i class="fa-solid fa-filter" style="color: #10b981;"></i> FILTRAR DASHBOARD
                ${(document.getElementById('mFilterTeam')?.value || document.getElementById('mFilterUser')?.value || document.getElementById('mFilterCategory')?.value || document.getElementById('mFilterStart')?.value || document.getElementById('mFilterEnd')?.value) ? '<div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>' : ''}
            </button>
        </div>

        <!-- Mural de Avisos (Empresa) -->
        ${renderMobileAnnouncement()}
        
        <!-- Banner de Prêmio de Ranking (Funcionário) -->
        ${!isAdmin && c && c.gamificationEnabled ? renderMobilePrizeBanner() : ''}
        
        <!-- Painel de Gamificação (Funcionário) -->
        ${!isAdmin && c && c.gamificationEnabled ? renderMobileEmployeeGamification() : ''}

        <div class="mobile-stats-grid ${isAdmin ? 'admin-grid' : ''}" style="margin-top: 15px;">
            ${statsConfig.map(s => `
                <div class="mobile-stat-card ${s.border}">
                    <span class="value">${s.val}</span>
                    <span class="label">${s.label}</span>
                </div>
            `).join('')}
        </div>


        <!-- Pódio Mobile (Somente se Gamificação estiver Ativada) -->
        ${(c && c.gamificationEnabled) ? renderMobilePodium() : ''}

        <div class="m-charts-grid">
            <div class="m-chart-card">
                <div class="m-card-header">
                    <i class="fa-solid fa-chart-pie"></i>
                    <h3>${isAdmin ? 'Status Geral' : 'Meu Desempenho'}</h3>
                </div>
                <div class="m-chart-container"><canvas id="mChartStatus"></canvas></div>
            </div>
            <div class="m-chart-card">
                <div class="m-card-header">
                    <i class="fa-solid fa-chart-simple"></i>
                    <h3>${isAdmin ? 'Produtividade por Categoria' : 'Ativ. por Categoria'}</h3>
                </div>
                <div class="m-chart-container"><canvas id="mChartCategory"></canvas></div>
            </div>
            ${isAdmin ? `
            <div class="m-chart-card">
                <div class="m-card-header">
                    <i class="fa-solid fa-chart-line"></i>
                    <h3>Resumo Semanal</h3>
                </div>
                <div class="m-chart-container"><canvas id="mChartTimeline"></canvas></div>
            </div>
            ` : ''}
        </div>

        <div style="height: 100px;"></div> <!-- Margem de segurança para o rodapé -->
    `;

        setTimeout(() => {
            renderMobileAdminCharts(filteredActs);
            if (isAdmin) populateMobileFilters();
        }, 150);
    } catch (err) {
        console.error("Erro ao renderizar dashboard mobile:", err);
        container.innerHTML = `<div class="m-section"><p style="text-align:center; padding:50px; opacity:0.5;">Erro ao carregar dashboard. Tente atualizar.</p></div>`;
    }
}


function renderRecentTasksMobile(acts) {
    if (!acts || acts.length === 0) {
        return `
            <div style="text-align: center; padding: 30px; opacity: 0.5;">
                <i class="fa-solid fa-clipboard-check" style="font-size: 30px; margin-bottom: 10px;"></i>
                <p>Nenhuma atividade recente encontrada.</p>
            </div>
        `;
    }

    return acts.map(a => {
        const catHue = getCategoryHue(a.category);
        const statusIcon = a.status === 'concluido' ? 'fa-check-double' : 'fa-hourglass-half';

        return `
            <div class="m-recent-task-card" onclick="openActivityMobile('${a.id}')">
                <div class="task-icon-box" style="background: hsla(${catHue}, 70%, 50%, 0.12); color: hsl(${catHue}, 70%, 55%);">
                    <i class="fa-solid ${statusIcon}"></i>
                </div>
                <div class="task-info">
                    <div class="task-top">
                        <span class="task-cat" style="background: hsla(${catHue}, 70%, 50%, 0.15); color: hsl(${catHue}, 70%, 45%);">${esc(a.category.toUpperCase())}</span>
                        <span class="task-date">${formatDate(a.date)}</span>
                    </div>
                    <h4 class="task-title">${esc(a.title)}</h4>
                    ${!!(a.adminId || a.senderId || a.delegadaPor) ? `
                        <div style="font-size: 9px; opacity: 0.5; margin-top: 5px; font-weight: 600; display: flex; align-items: center; gap: 4px; color: var(--mobile-text);">
                            <i class="fa-solid fa-user-tie"></i> ENVIADA POR: ${esc(users.find(u => String(u.id) === String(a.adminId || a.senderId))?.name || a.adminName || 'GESTOR')}
                        </div>
                    ` : ''}
                </div>

                <div class="task-arrow">
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
            </div>
        `;
    }).join('');
}


function renderMobileAnnouncement() {

    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c || !c.announcement) return '';

    return `
        <div class="m-card" style="margin-bottom: 20px; border-left: 4px solid var(--mobile-primary); background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%);">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: var(--mobile-primary);">
                <i class="fa-solid fa-bullhorn"></i> Mural de Avisos
            </h3>
            <p style="margin: 0; font-size: 13px; color: var(--mobile-text); white-space: pre-wrap; line-height: 1.5; font-weight: 500;">${esc(c.announcement)}</p>
        </div>
    `;
}

function renderMobilePrizeBanner() {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c || !c.gamificationEnabled || c.rewardsEnabled === false) return '';

    const regras = c.gamificacao || {};
    const rankArr = c.premiosRanking || [500, 400, 300, 200, 100];
    const valoresPremios = [
        regras.premioTop1 !== undefined ? regras.premioTop1 : rankArr[0],
        regras.premioTop2 !== undefined ? regras.premioTop2 : rankArr[1],
        regras.premioTop3 !== undefined ? regras.premioTop3 : rankArr[2],
        regras.premioTop4 !== undefined ? regras.premioTop4 : rankArr[3],
        regras.premioTop5 !== undefined ? regras.premioTop5 : rankArr[4]
    ];
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const hoje = new Date();
    const mesPassadoData = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const mesPassadoStr = `${mesPassadoData.getFullYear()}-${String(mesPassadoData.getMonth() + 1).padStart(2, '0')}`;

    const historicoResgates = currentUser.resgatesRanking || [];
    if (historicoResgates.includes(mesPassadoStr)) return '';

    // Calcular ranking do mês passado
    const acts = activities.filter(a =>
        String(a.companyId) === String(currentUser.companyId) &&
        a.status === 'concluido' &&
        a.date && a.date.startsWith(mesPassadoStr)
    );
    const mapaPontos = {};
    acts.forEach(a => { mapaPontos[a.userId] = (mapaPontos[a.userId] || 0) + (a.xpEarned || 0); });
    const ranking = Object.keys(mapaPontos)
        .map(uid => ({ userId: parseInt(uid), xp: mapaPontos[uid] }))
        .filter(u => u.xp > 0)
        .sort((a, b) => b.xp - a.xp);

    const minhaPosicaoIndex = ranking.findIndex(u => String(u.userId) === String(currentUser.id));
    if (minhaPosicaoIndex < 0 || minhaPosicaoIndex >= 5) return '';

    const premioMoedas = valoresPremios[minhaPosicaoIndex] || 0;
    const nomeDoMes = nomesMeses[mesPassadoData.getMonth()];
    const posicaoLabel = ['1º', '2º', '3º', '4º', '5º'][minhaPosicaoIndex];

    return `
        <div id="mobileBannerPremio_${mesPassadoStr}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 20px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.35); animation: pulse 2s infinite;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="width: 52px; height: 52px; background: rgba(255, 255, 255, 0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fa-solid fa-trophy" style="font-size: 24px; color: #fff; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></i></div>
                <div>
                    <p style="margin: 0; font-size: 11px; font-weight: 800; color: #ffffff !important; opacity: 1 !important; text-transform: uppercase; letter-spacing: 0.5px;">Recompensa do Ranking</p>
                    <h3 style="margin: 4px 0 0; font-size: 16px; font-weight: 900; color: white; line-height: 1.3;">Parabéns! Você ficou em ${posicaoLabel} lugar em ${nomeDoMes}!</h3>
                </div>
            </div>
            <button onclick="resgatarPremioMobile('${mesPassadoStr}', ${premioMoedas}, this)" style="width: 100%; background: white; color: #d97706; border: none; padding: 14px; border-radius: 14px; font-weight: 900; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
                <img src="Patentes/Moedas/GoCoins.svg" class="gocoin-icon" alt="Coins"> RESGATAR ${premioMoedas} GoCoins
            </button>
        </div>
    `;
}

window.resgatarPremioMobile = async function (mesId, valorMoedas, btn) {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resgatando...';
    btn.disabled = true;

    const meusResgates = currentUser.resgatesRanking || [];
    if (meusResgates.includes(mesId)) return;
    meusResgates.push(mesId);

    const novoSaldo = (currentUser.goCoins || 0) + valorMoedas;

    try {
        await db.collection('usuarios').doc(String(currentUser.id)).update({
            goCoins: novoSaldo,
            resgatesRanking: meusResgates
        });
        currentUser.goCoins = novoSaldo;
        currentUser.resgatesRanking = meusResgates;

        showToast(`🎉 +${valorMoedas} GoCoins adicionados ao seu saldo!`, 'success');

        const banner = document.getElementById(`mobileBannerPremio_${mesId}`);
        if (banner) {
            banner.style.transition = 'opacity 0.4s, transform 0.4s';
            banner.style.opacity = '0';
            banner.style.transform = 'scale(0.9)';
            setTimeout(() => banner.remove(), 400);
        }
    } catch (err) {
        showToast('Erro ao resgatar prêmio.', 'error');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

function renderMobileEmployeeGamification() {
    const totalXp = currentUser.xp || 0;
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (typeof window.FG_LEVEL_CELEBRATION !== 'undefined' && window.FG_LEVEL_CELEBRATION) {
        window.FG_LEVEL_CELEBRATION.checkAndCelebrate({ level: currentUser.level || 1 }, c && c.gamificacao);
    }
    const xpPorNivel = (c && c.gamificacao && c.gamificacao.xpNivel) ? c.gamificacao.xpNivel : 500;

    const nivel = Math.floor(totalXp / xpPorNivel) + 1;
    const xpNoNivel = totalXp % xpPorNivel;
    const percentual = Math.min(100, (xpNoNivel / xpPorNivel) * 100);

    const patente = (typeof getPatente === 'function') ? getPatente(nivel) : null;
    const proximaPatente = (typeof getProximaPatente === 'function') ? getProximaPatente(nivel) : null;
    const barGradient = patente ? patente.gradient : '#10b981';
    const barShadow = patente ? `0 0 15px ${patente.cor}60` : 'none';

    let iconHtml = patente ? (patente.imagem 
        ? `<img src="${patente.imagem}" style="width: 32px; height: 32px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" onerror="this.outerHTML='<i class=&quot;${patente.icone}&quot; style=&quot;color: white; font-size: 24px;&quot;></i>'">`
        : `<i class="${patente.icone}" style="color: white; font-size: 24px;"></i>`)
        : `<i class="fa-solid fa-medal" style="color: white; font-size: 24px;"></i>`;

    return `
        <div class="premium-mobile-gami-card" style="background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); border-radius: 28px; padding: 24px; box-shadow: var(--mobile-card-shadow); margin-bottom: 24px; position: relative; overflow: hidden;">
            
            <!-- Subtle Background Glow -->
            <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: ${patente ? patente.cor : '#10b981'}; filter: blur(80px); opacity: 0.15; z-index: 0; pointer-events: none;"></div>

            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div onclick="window.mostrarListaPatentes()" style="width: 54px; height: 54px; border-radius: 16px; background: ${patente ? patente.gradient : '#10b981'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px ${patente ? patente.cor + '40' : 'rgba(16,185,129,0.3)'}; cursor: pointer; flex-shrink: 0;">
                        ${iconHtml}
                    </div>
                    <div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--mobile-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Nível ${nivel}</div>
                        <h3 style="margin: 0; font-size: 20px; color: var(--mobile-text); font-weight: 900; letter-spacing: -0.5px; line-height: 1.1;">${patente ? patente.nome : 'Iniciante'}</h3>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 24px; font-weight: 950; color: var(--mobile-text); letter-spacing: -0.5px; line-height: 1;">${totalXp}</span>
                    <span style="font-size: 10px; font-weight: 800; color: var(--mobile-text-secondary); display: block; text-transform: uppercase; margin-top: 4px;">XP TOTAL</span>
                </div>
            </div>
            
            <!-- Barra de Progresso -->
            <div style="position: relative; z-index: 1; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--mobile-text-secondary); margin-bottom: 8px;">
                    <span>${xpNoNivel} / ${xpPorNivel} XP</span>
                    <span style="color: var(--mobile-text);">Faltam ${xpPorNivel - xpNoNivel} XP</span>
                </div>
                <div style="background: rgba(255,255,255,0.06); border-radius: 12px; height: 10px; width: 100%; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="background: ${barGradient}; height: 100%; width: ${percentual}%; border-radius: 12px; box-shadow: ${barShadow}; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>

            <!-- Próximo Rank Info -->
            <div style="position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px;">
                ${proximaPatente ? `
                <div onclick="window.mostrarListaPatentes()" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
                            <img src="${proximaPatente.imagem}" style="width: 16px; height: 16px; object-fit: contain; filter: grayscale(1) opacity(0.7);" onerror="this.outerHTML='<i class=&quot;${proximaPatente.icone}&quot; style=&quot;color: #94a3b8; font-size: 14px;&quot;></i>'">
                        </div>
                        <span style="font-size: 13px; color: var(--mobile-text-secondary); font-weight: 600;">Próximo rank: <strong style="color: var(--mobile-text);">${proximaPatente.nome}</strong></span>
                    </div>
                    <span style="font-size: 11px; font-weight: 800; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 8px; color: var(--mobile-text);">NV ${proximaPatente.minLevel}</span>
                </div>
                ` : `
                <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
                    <div style="width: 28px; height: 28px; border-radius: 8px; background: rgba(251, 191, 36, 0.2); display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-crown" style="color: #fbbf24; font-size: 14px;"></i>
                    </div>
                    <span style="font-size: 13px; color: #fbbf24; font-weight: 700;">Rank Máximo Alcançado!</span>
                </div>
                `}

                <!-- Saldo GoCoins -->
                ${(c && c.rewardsEnabled !== false) ? `
                <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                            <img src="Patentes/Moedas/Amount_GoCoins.svg" style="width: 34px; height: 34px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(16, 185, 129, 0.4));">
                        </div>
                        <div>
                            <span style="font-size: 10px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">Saldo Atual</span>
                            <div style="font-size: 22px; font-weight: 950; color: var(--mobile-text); line-height: 1;">${currentUser.goCoins || 0}</div>
                        </div>
                    </div>
                    <button onclick="switchMobileTab('store')" style="background: transparent; border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 12px; cursor: pointer;">USAR</button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}



function renderMobilePodium() {
    if (!currentUser) return '';
    const isDark = document.body.classList.contains('dark-mode');

    // 1. Calcular Ranking do Mês Atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    console.log("Calculando Pódio Mobile...", { activitiesCount: (activities ? activities.length : 0), mes: mesAtual, ano: anoAtual });

    // Filtragem mais flexível
    const atividadesMes = (activities || []).filter(a => {
        try {
            if (!a.date || !a.xpEarned) return false;
            // Comparação de ID segura (string)
            if (String(a.companyId) !== String(currentUser.companyId)) return false;

            // Tratamento de data robusto
            const dStr = a.date.includes('T') ? a.date : a.date + 'T12:00:00';
            const dataAtiv = new Date(dStr);
            return dataAtiv.getMonth() === mesAtual && dataAtiv.getFullYear() === anoAtual;
        } catch (e) { return false; }
    });

    const xpPorUsuario = {};
    atividadesMes.forEach(a => {
        xpPorUsuario[a.userId] = (xpPorUsuario[a.userId] || 0) + a.xpEarned;
    });

    let ranking = Object.keys(xpPorUsuario).map(userId => {
        const u = users.find(x => String(x.id) === String(userId));
        return {
            userId: userId,
            nome: u ? u.name.split(' ')[0] : 'Membro',
            xp: xpPorUsuario[userId],
            u: u
        };
    }).sort((a, b) => b.xp - a.xp).slice(0, 5);

    // Ordem visual: [4º, 2º, 1º, 3º, 5º]
    const visualOrder = [
        { u: ranking[3], label: '4º', h: '40px', color: '#64748b', active: '#64748b' },
        { u: ranking[1], label: '2º', h: '70px', color: '#94a3b8', active: '#94a3b8' },
        { u: ranking[0], label: '1º', h: '110px', color: '#fbbf24', active: '#fbbf24', crown: true },
        { u: ranking[2], label: '3º', h: '55px', color: '#d97706', active: '#d97706' },
        { u: ranking[4], label: '5º', h: '30px', color: '#64748b', active: '#64748b' }
    ];

    if (ranking.length === 0) {
        return `
            <div class="m-card" style="margin-bottom: 25px; padding: 30px 15px; text-align: center; background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); box-shadow: var(--mobile-card-shadow);">
                 <i class="fa-solid fa-trophy" style="font-size: 40px; color: #fbbf24; margin-bottom: 15px; opacity: 0.4;"></i>
                 <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--mobile-text);">Pódio em Disputa</h3>
                 <p style="font-size: 12px; color: var(--mobile-text-secondary); margin-top: 5px; max-width: 200px; margin-left: auto; margin-right: auto;">Aguardando as primeiras missões concluídas do mês.</p>
            </div>
        `;
    }

    return `
        <div class="m-card" style="margin-bottom: 25px; padding: 20px 10px 0 10px; background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); box-shadow: var(--mobile-card-shadow);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding: 0 10px;">
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: var(--mobile-text); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-trophy" style="color: #fbbf24;"></i> Pódio Mensal
                </h3>
                <button onclick="openMobileFullRanking()" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 6px 12px; border-radius: 8px; font-size: 10px; font-weight: 800; opacity: 0.8;">
                    <i class="fa-solid fa-list-ul"></i> Ver Tudo
                </button>
            </div>
            
            <div style="display: flex; align-items: flex-end; justify-content: center; gap: 4px; min-height: 220px;">
                ${visualOrder.map(p => {
        const isOccupied = !!p.u;

        if (!isOccupied) {
            return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; opacity: 0.2;">
                                <div style="height: ${p.h}; width: 100%; border: 2px dashed var(--mobile-border); border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: var(--mobile-text);">${p.label}</div>
                            </div>
                        `;
        }

        const avatarContent = p.u.u && p.u.u.avatarUrl ?
            `<img src="${safeUrl(p.u.u.avatarUrl)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid ${p.active};">` :
            `<div style="width: 100%; height: 100%; border-radius: 50%; background: ${p.active}22; border: 2px solid ${p.active}; color: ${p.active}; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px;">${p.u.nome.charAt(0)}</div>`;

        return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; z-index: ${p.crown ? 5 : 1};" onclick="openMobileFullRanking()">
                            ${p.crown ? '<i class="fa-solid fa-crown" style="color: #fbbf24; font-size: 20px; position: absolute; top: -18px; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)); z-index: 10;"></i>' : ''}
                            
                            <div style="width: 40px; height: 40px; border-radius: 50%; margin-bottom: 8px; position: relative;">
                                ${avatarContent}
                            </div>
                            
                            <div style="text-align: center; margin-bottom: 8px;">
                                <div style="font-size: 10px; font-weight: 800; color: var(--mobile-text);">${esc(p.u.nome)}</div>
                                <div style="font-size: 9px; font-weight: 950; color: #10b981; margin-top: 1px;">${p.u.xp} XP</div>
                                ${(() => {
                                    const pat = (typeof getPatente === 'function' && p.u.u) ? getPatente(p.u.u.level || 1) : null;
                                    return pat ? `<div style="font-size: 9px; font-weight: 800; color: ${pat.cor}; text-transform: uppercase; margin-top: 2px;">${pat.nome}</div>` : '';
                                })()}
                            </div>

                             <div style="height: ${p.h}; width: 100%; background: ${p.crown ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)' : 'var(--mobile-input-bg)'}; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: center; color: ${p.crown ? '#2c1b18' : 'var(--mobile-text-secondary)'}; ${!p.crown ? 'border: 1px solid var(--mobile-border); border-bottom: none;' : ''}">
                                <span style="font-size: 16px; font-weight: 950; opacity: ${p.crown ? '1' : '0.3'};">${p.label}</span>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

window.openMobileFullRanking = function () {
    if (!currentUser) return;

    // 1. Calcular Ranking (Reuso da lógica do pódio)
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const atividadesMes = (activities || []).filter(a => {
        try {
            if (!a.date || !a.xpEarned) return false;
            if (String(a.companyId) !== String(currentUser.companyId)) return false;
            const dStr = a.date.includes('T') ? a.date : a.date + 'T12:00:00';
            const dataAtiv = new Date(dStr);
            return dataAtiv.getMonth() === mesAtual && dataAtiv.getFullYear() === anoAtual;
        } catch (e) { return false; }
    });

    const xpPorUsuario = {};
    atividadesMes.forEach(a => {
        xpPorUsuario[a.userId] = (xpPorUsuario[a.userId] || 0) + a.xpEarned;
    });

    let fullRanking = Object.keys(xpPorUsuario).map(userId => {
        const u = users.find(x => String(x.id) === String(userId));
        return {
            userId: userId,
            nome: u ? u.name : 'Membro',
            xp: xpPorUsuario[userId],
            avatarUrl: u ? u.avatarUrl : null,
            level: u ? (u.level || 1) : 1
        };
    }).sort((a, b) => b.xp - a.xp);

    const content = `
        <div class="m-full-ranking" style="padding: 10px 0;">
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${fullRanking.map((item, idx) => {
        const isTop1 = idx === 0;
        return `
                        <div style="background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); padding: 15px; border-radius: 18px; display: flex; align-items: center; gap: 12px; box-shadow: var(--mobile-card-shadow);">
                            <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                ${idx === 0 ? '<i class="fa-solid fa-trophy" style="color: #fbbf24;"></i>' :
                idx === 1 ? '<i class="fa-solid fa-trophy" style="color: #94a3b8;"></i>' :
                    idx === 2 ? '<i class="fa-solid fa-trophy" style="color: #d97706;"></i>' :
                        `<span style="font-size: 14px; font-weight: 900; opacity: 0.3;">${idx + 1}º</span>`}
                            </div>
                            
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.2); overflow: hidden; border: 2px solid ${idx === 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)'};">
                                ${item.avatarUrl ? `<img src="${safeUrl(item.avatarUrl)}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: white;">${esc(item.nome.charAt(0))}</div>`}
                            </div>
                            
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 15px; font-weight: 800; color: var(--mobile-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(item.nome)}</div>
                                ${(() => {
                                    const pat = (typeof getPatente === 'function') ? getPatente(item.level) : null;
                                    return pat ? `<div style="margin-top: 2px; font-size: 11px; font-weight: 800; color: ${pat.cor}; text-transform: uppercase;">${pat.nome} (NV ${item.level})</div>` : '';
                                })()}
                            </div>
                            
                            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 5px 12px; border-radius: 10px; color: #10b981; font-size: 14px; font-weight: 950;">
                                ${item.xp} XP
                            </div>
                        </div>
                    `;
    }).join('')}
                
                ${fullRanking.length === 0 ? '<div style="text-align: center; padding: 40px; opacity: 0.3; font-weight: 700;">Nenhum dado este mês.</div>' : ''}
            </div>
        </div>
    `;

    openMobileModal('Ranking Completo do Mês', content);
};

function renderMobileAdminCharts() {
    const isDark = document.body.classList.contains('dark-mode');
    const colorPrimary = '#3b82f6';
    const textColor = '#94a3b8';

    // 1. Status (Doughnut)
    const ctxStatus = document.getElementById('mChartStatus');
    if (ctxStatus) {
        const actsStatus = getFilteredMobileData(true, false);
        const textColorStatus = isDark ? '#f1f5f9' : '#475569';
        const statusCounts = actsStatus.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
        const statusMap = ['concluido', 'andamento', 'pendente', 'nao_concluido'];

        const activeColors = isDark
            ? ['rgba(74, 222, 128, 0.9)', 'rgba(253, 224, 71, 0.9)', 'rgba(248, 113, 113, 0.9)', 'rgba(153, 27, 27, 0.9)']
            : ['rgba(34, 197, 94, 0.9)', 'rgba(234, 179, 8, 0.9)', 'rgba(239, 68, 68, 0.9)', 'rgba(153, 27, 27, 0.9)'];
        const inactiveColors = isDark
            ? ['rgba(74, 222, 128, 0.15)', 'rgba(253, 224, 71, 0.15)', 'rgba(248, 113, 113, 0.15)', 'rgba(153, 27, 27, 0.15)']
            : ['rgba(34, 197, 94, 0.2)', 'rgba(234, 179, 8, 0.2)', 'rgba(239, 68, 68, 0.2)', 'rgba(153, 27, 27, 0.2)'];

        const bgStatus = statusMap.map((st, i) => {
            if (!window.mobileDashActiveStatus) return activeColors[i];
            return window.mobileDashActiveStatus === st ? activeColors[i] : inactiveColors[i];
        });

        const existing = Chart.getChart("mChartStatus");
        if (existing && document.body.contains(existing.canvas)) {
            existing.data.datasets[0].data = [statusCounts.concluido || 0, statusCounts.andamento || 0, statusCounts.pendente || 0, statusCounts.nao_concluido || 0];
            existing.data.datasets[0].backgroundColor = bgStatus;
            existing.data.datasets[0].borderColor = isDark ? '#1e293b' : '#ffffff';
            existing.options.plugins.legend.labels.color = textColorStatus;
            existing.update();
        } else {
            if (existing) existing.destroy();
            new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Concluído', 'Em Andamento', 'Pendente', 'Expirada'],
                    datasets: [{
                        data: [statusCounts.concluido || 0, statusCounts.andamento || 0, statusCounts.pendente || 0, statusCounts.nao_concluido || 0],
                        backgroundColor: bgStatus,
                        borderWidth: 2,
                        borderColor: isDark ? '#1e293b' : '#ffffff'
                    }]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        animateRotate: true,
                        animateScale: false,
                        duration: 800,
                        easing: 'easeOutQuart'
                    },
                    onClick: (e, elements) => {
                        if (elements.length > 0) {
                            const clicked = statusMap[elements[0].index];
                            window.mobileDashActiveStatus = (window.mobileDashActiveStatus === clicked) ? null : clicked;
                            renderMobileDashboard(document.getElementById('mobileContent'));
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: textColorStatus,
                                font: { size: 10, weight: 'bold' },
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                    }
                },
                plugins: [{
                    id: 'liquidCenter',
                    afterDraw: (chart) => {
                        const { ctx, chartArea } = chart;
                        if (!chartArea || !ctx || !document.body.contains(chart.canvas)) return;

                        const centerX = (chartArea.left + chartArea.right) / 2;
                        const centerY = (chartArea.top + chartArea.bottom) / 2;
                        const innerRadius = chart.innerRadius;
                        if (!innerRadius || innerRadius <= 0) return;

                        const total = (statusCounts.concluido || 0) + (statusCounts.andamento || 0) + (statusCounts.pendente || 0) + (statusCounts.nao_concluido || 0);
                        let pct = 0;
                        let lColor = '#22c55e';
                        let lColorLight = 'rgba(34, 197, 94, 0.4)';

                        const activeSt = window.mobileDashActiveStatus;
                        if (!activeSt) {
                            pct = total > 0 ? ((statusCounts.concluido || 0) / total) : 0;
                            lColor = '#22c55e';
                            lColorLight = 'rgba(34, 197, 94, 0.4)';
                        } else if (activeSt === 'concluido') {
                            pct = total > 0 ? ((statusCounts.concluido || 0) / total) : 0;
                            lColor = '#22c55e';
                            lColorLight = 'rgba(34, 197, 94, 0.4)';
                        } else if (activeSt === 'andamento') {
                            pct = total > 0 ? ((statusCounts.andamento || 0) / total) : 0;
                            lColor = '#eab308';
                            lColorLight = 'rgba(234, 179, 8, 0.4)';
                        } else if (activeSt === 'pendente') {
                            pct = total > 0 ? ((statusCounts.pendente || 0) / total) : 0;
                            lColor = '#ef4444';
                            lColorLight = 'rgba(239, 68, 68, 0.4)';
                        } else if (activeSt === 'nao_concluido') {
                            pct = total > 0 ? ((statusCounts.nao_concluido || 0) / total) : 0;
                            lColor = '#991b1b';
                            lColorLight = 'rgba(153, 27, 27, 0.4)';
                        }

                        if (!chart.waveOffset) {
                            chart.waveOffset = window.lastMobileStatusWaveOffset !== undefined ? window.lastMobileStatusWaveOffset : 0;
                        }
                        chart.waveOffset += 0.04;
                        window.lastMobileStatusWaveOffset = chart.waveOffset;

                        if (chart.currentPct === undefined) {
                            chart.currentPct = window.lastMobileStatusPct !== undefined ? window.lastMobileStatusPct : 0;
                        }
                        chart.currentPct += (pct - chart.currentPct) * 0.08;
                        window.lastMobileStatusPct = chart.currentPct;

                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, innerRadius - 4, 0, Math.PI * 2);
                        ctx.clip();

                        ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.4)';
                        ctx.fill();

                        const liquidY = centerY + innerRadius - (innerRadius * 2 * chart.currentPct);

                        ctx.fillStyle = lColorLight;
                        ctx.beginPath();
                        for (let x = centerX - innerRadius; x <= centerX + innerRadius; x++) {
                            const relX = x - (centerX - innerRadius);
                            const y = liquidY + Math.sin(relX * 0.05 + chart.waveOffset) * 4;
                            if (x === centerX - innerRadius) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.lineTo(centerX + innerRadius, centerY + innerRadius);
                        ctx.lineTo(centerX - innerRadius, centerY + innerRadius);
                        ctx.closePath();
                        ctx.fill();

                        ctx.fillStyle = lColor;
                        ctx.beginPath();
                        for (let x = centerX - innerRadius; x <= centerX + innerRadius; x++) {
                            const relX = x - (centerX - innerRadius);
                            const y = liquidY + Math.cos(relX * 0.04 - chart.waveOffset * 1.2) * 5;
                            if (x === centerX - innerRadius) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                        }
                        ctx.lineTo(centerX + innerRadius, centerY + innerRadius);
                        ctx.lineTo(centerX - innerRadius, centerY + innerRadius);
                        ctx.closePath();
                        ctx.fill();

                        ctx.restore();

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
                        ctx.font = 'bold 15px sans-serif';
                        ctx.fillText(Math.round(chart.currentPct * 100) + '%', centerX, centerY);
                        ctx.restore();

                        if (chart.waveAnimId) cancelAnimationFrame(chart.waveAnimId);
                        chart.waveAnimId = requestAnimationFrame(() => {
                            if (chart.ctx && document.body.contains(chart.canvas)) {
                                chart.draw();
                            }
                        });
                    }
                }]
            });
        }
    }

    const ctxCat = document.getElementById('mChartCategory');
    if (ctxCat) {
        const actsCat = getFilteredMobileData(false, true);
        const catCounts = actsCat.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {});
        const labels = Object.keys(catCounts).slice(0, 5);

        const bgColors = labels.map(cat => {
            const hue = typeof getCategoryHue === 'function' ? getCategoryHue(cat) : 200;
            const isActive = !window.mobileDashActiveCategory || window.mobileDashActiveCategory === cat;
            const alpha = isActive ? (isDark ? '0.85' : '0.9') : '0.2';
            return `hsla(${hue}, 70%, 55%, ${alpha})`;
        });

        const textColorCat = isDark ? '#f1f5f9' : '#475569';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';

        const existing = Chart.getChart("mChartCategory");
        if (existing && document.body.contains(existing.canvas)) {
            existing.data.labels = labels;
            existing.data.datasets[0].data = Object.values(catCounts).slice(0, 5);
            existing.data.datasets[0].backgroundColor = bgColors;
            existing.options.scales.y.ticks.color = textColorCat;
            existing.options.scales.y.grid.color = gridColor;
            existing.options.scales.x.ticks.color = textColorCat;
            existing.update();
        } else {
            if (existing) existing.destroy();
            new Chart(ctxCat, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: Object.values(catCounts).slice(0, 5),
                        backgroundColor: bgColors,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (e, elements, chart) => {
                        if (elements.length > 0) {
                            const chartInstance = chart || e.chart;
                            const clickedCat = chartInstance.data.labels[elements[0].index];
                            window.mobileDashActiveCategory = (window.mobileDashActiveCategory === clickedCat) ? null : clickedCat;
                            renderMobileDashboard(document.getElementById('mobileContent'));
                        }
                    },
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: gridColor },
                            ticks: { color: textColorCat, font: { size: 10 }, stepSize: 1 }
                        },
                        x: { ticks: { color: textColorCat, font: { size: 10 } }, grid: { display: false } }
                    }
                }
            });
        }

    }

    const actsAll = getFilteredMobileData(true, true);

    // 4. Timeline 7 Dias (Line) - NOVO
    const ctxTime = document.getElementById('mChartTimeline');
    if (ctxTime) {
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            last7.push(d.toISOString().split('T')[0]);
        }
        const timelineData = last7.map(date => actsAll.filter(a => a.date === date).length);
        const textColor = isDark ? '#f1f5f9' : '#475569';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';
        const labels = last7.map(date => {
            const parts = date.split('-');
            return `${parts[2]}/${parts[1]}`;
        });

        const existing = Chart.getChart("mChartTimeline");
        if (existing && document.body.contains(existing.canvas)) {
            existing.data.labels = labels;
            existing.data.datasets[0].data = timelineData;
            existing.options.scales.y.ticks.color = textColor;
            existing.options.scales.y.grid.color = gridColor;
            existing.options.scales.x.ticks.color = textColor;
            existing.update();
        } else {
            if (existing) existing.destroy();
            new Chart(ctxTime, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        data: timelineData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { size: 10 }, stepSize: 1, precision: 0 }
                        },
                        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } }
                    }
                }
            });
        }
    }


    // 3. Equipes (Bar)
    const ctxTeam = document.getElementById('mChartTeam');
    if (ctxTeam) {
        const existing = Chart.getChart("mChartTeam");
        if (existing) existing.destroy();

        const teamCounts = {};
        actsAll.forEach(a => {
            const u = users.find(x => x.id === a.userId);
            const team = u ? (u.team || 'Geral') : 'Geral';
            teamCounts[team] = (teamCounts[team] || 0) + 1;
        });

        const textColor = isDark ? '#f1f5f9' : '#475569';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        new Chart(ctxTeam, {
            type: 'bar',
            data: {
                labels: Object.keys(teamCounts).slice(0, 5),
                datasets: [{ data: Object.values(teamCounts).slice(0, 5), backgroundColor: '#8b5cf6', borderRadius: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { size: 10 }, stepSize: 1, precision: 0 }
                    },
                    x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }

}

function getStatusText(status) {
    const s = {
        'concluido': 'Concluída',
        'pendente': 'Pendente',
        'andamento': 'Em Aberto',
        'nao_concluido': 'Expirada',
        'em_revisao': 'Em Revisão'
    };
    return s[status] || status;
}

window.currentMissionFilter = 'pendente';

window.currentMobileTaskView = 'responder'; // 'responder', 'gerenciar', 'delegar'

function renderMobileTasks(container) {
    if (!container) return;

    // 🔥 VERIFICAÇÃO DE CARREGAMENTO PARA RESPOSTA INSTANTÂNEA
    if (typeof loadState !== 'undefined' && (!loadState.tasks || !loadState.act)) {
        container.innerHTML = `
            <div class="m-section" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:100px 20px; opacity:0.6;">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size:30px; margin-bottom:15px; color:#10b981;"></i>
                <p style="font-size:14px; font-weight:700; color: white;">Sincronizando tarefas...</p>
            </div>
        `;
        return;
    }

    const isAdmin = isCurrentModeAdmin();

    // 🔥 CORREÇÃO: Garante que a view seja compatível com o cargo atual
    if (!isAdmin) {
        window.currentMobileTaskView = 'responder';
    } else if (!window.currentMobileTaskView || window.currentMobileTaskView === 'responder') {
        window.currentMobileTaskView = 'delegar';
    }

    const view = window.currentMobileTaskView;

    // 1. Tarefas delegadas a mim (Pendentes e Histórico)
    let openTasks = [];
    if (typeof tarefasDelegadas !== 'undefined') {
        openTasks = tarefasDelegadas.filter(t => String(t.userId) === String(currentUser.id));
    }

    let myHistory = (typeof activities !== 'undefined' ? activities : []).filter(a =>
        String(a.userId) === String(currentUser.id) &&
        (a.adminId || a.tipo === 'delegada' || a.origem === 'delegada' || a.tarefaVinculadaId)
    );

    // 🔥 OTIMIZAÇÃO: Mostra apenas as últimas 15 tarefas concluídas para garantir performance instantânea
    // O histórico completo fica na aba "Histórico"
    if (myHistory.length > 15) {
        myHistory = myHistory.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
    }

    // Unifica as listas para garantir paridade com o Desktop
    let myTasks = [...openTasks, ...myHistory];

    // Remove duplicatas por ID ou por "Impressão Digital" (Título + Categoria + Data)
    const seenRefs = new Set();
    const finalTasks = [];

    // Priorização: Pendentes Primeiro, depois Concluídas
    myTasks.sort((a, b) => {
        const order = { 'pendente': 1, 'em_revisao': 2, 'concluido': 3 };
        return (order[a.status] || 9) - (order[b.status] || 9);
    });

    for (const t of myTasks) {
        const tid = t.tarefaVinculadaId ? String(t.tarefaVinculadaId) : null;
        const id = t.id ? String(t.id) : null;
        const refId = tid || id;

        // Fallback para tarefas sem ID claro ou com IDs inconsistentes (Título + Categoria + Usuário + Data)
        const fingerprint = `${t.userId}_${t.title}_${t.category}_${t.date}`.toLowerCase().trim();

        if (refId && seenRefs.has('id_' + refId)) continue;
        if (seenRefs.has('fp_' + fingerprint)) continue;

        if (refId) seenRefs.add('id_' + refId);
        seenRefs.add('fp_' + fingerprint);
        finalTasks.push(t);
    }
    myTasks = finalTasks;

    // 2. Tarefas que eu enviei (Gerenciar) - Apenas para Admins
    let sentTasks = [];
    if (isAdmin) {
        if (typeof tarefasDelegadas !== 'undefined') {
            sentTasks = tarefasDelegadas.filter(t => String(t.senderId) === String(currentUser.id));
        }
    }

    container.innerHTML = `
        <div class="m-mission-hub animate-fade-in" style="padding-top: 10px;">
            <!-- Header Identico ao Original -->
            <div style="height: 10px;"></div>

            ${isAdmin ? `
            <div class="m-mission-tabs">
                <button class="m-tab-btn ${view === 'delegar' ? 'active' : ''}" onclick="window.currentMobileTaskView='delegar'; renderMobileTab('tasks')">
                    <i class="fa-solid fa-plus"></i> Nova Tarefa
                </button>
                <button class="m-tab-btn ${view === 'gerenciar' ? 'active' : ''}" onclick="window.currentMobileTaskView='gerenciar'; renderMobileTab('tasks')">
                    <i class="fa-solid fa-list-ul"></i> Enviadas
                </button>
            </div>
            ` : ''}

            <div class="m-mission-list">
                ${renderMobileTaskViewContent(view, myTasks, sentTasks, isAdmin)}
            </div>
        </div>
    `;

    // 🔥 CORREÇÃO: Gatilho manual para carregar a lista inteligente (Scripts em innerHTML não rodam sozinhos)
    if (view === 'delegar') {
        setTimeout(() => {
            if (typeof renderMobileSmartUserList === 'function') renderMobileSmartUserList();
        }, 100);
    }
}


function renderMobileTaskViewContent(view, myTasks, sentTasks, isAdmin) {
    if (view === 'responder') {
        if (!myTasks.length) return `<div style="text-align:center; padding: 60px 20px; opacity: 0.3;"><i class="fa-solid fa-clipboard-list" style="font-size: 50px; margin-bottom: 15px;"></i><p style="font-weight: 600;">Nenhuma tarefa recebida.</p></div>`;
        return myTasks.sort((a, b) => {
            const order = { 'pendente': 1, 'em_revisao': 2, 'concluido': 3, 'nao_concluido': 4 };
            const statusA = a.status || 'pendente';
            const statusB = b.status || 'pendente';
            if (order[statusA] !== order[statusB]) return order[statusA] - order[statusB];
            return (b.createdAt || b.date).localeCompare(a.createdAt || a.date);
        }).map(a => renderMissionCard(a)).join('');
    }

    if (view === 'gerenciar' && isAdmin) {
        if (!sentTasks.length) return `<div style="text-align:center; padding: 60px 20px; opacity: 0.3;"><i class="fa-solid fa-list-check" style="font-size: 50px; margin-bottom: 15px;"></i><p style="font-weight: 600;">Nenhuma tarefa enviada ainda.</p></div>`;
        return `
            <div style="display: flex; flex-direction: column; gap: 15px;">
                ${sentTasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(a => renderMobileSentTaskItem(a)).join('')}
            </div>
        `;
    }

    if (view === 'delegar' && isAdmin) {
        return renderMobileCreateTaskForm();
    }

    return '';
}

function renderMobileSentTaskItem(t) {
    const func = (users || []).find(u => String(u.id) === String(t.userId));
    const nomeFunc = func ? func.name : 'Removido';

    let statusLabel = 'Pendente';
    let statusColor = '#f59e0b';
    if (t.status === 'em_revisao') { statusLabel = 'Aguardando Aprovação'; statusColor = '#3b82f6'; }
    if (t.status === 'concluido') { statusLabel = 'Aprovada'; statusColor = '#10b981'; }

    return `
        <div class="m-card" style="padding: 15px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--mobile-border); background: var(--mobile-card-bg); box-shadow: var(--mobile-card-shadow);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; color: var(--mobile-text-secondary); font-weight: 700;">${new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
                <span style="background: ${statusColor}15; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; border: 1px solid ${statusColor}30;">${statusLabel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="mobile-avatar" style="width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; ${func && func.avatarUrl ? `background-image: url('${safeUrl(func.avatarUrl)}'); background-size: cover; color: transparent; border: none;` : 'background: rgba(139, 92, 246, 0.1); color: #8b5cf6;'}">
                    ${func && func.avatarUrl ? '' : nomeFunc.charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: var(--mobile-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(t.title)}</h4>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: var(--mobile-text-secondary);">Feito por: <strong style="color: var(--mobile-text);">${esc(nomeFunc)}</strong></p>
                </div>
            </div>
            <div style="display: flex; gap: 10px; padding-top: 10px; border-top: 1px solid var(--mobile-border); justify-content: flex-end;">
                 <button onclick="openActivityMobile('${t.id}')" style="background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-eye"></i> VER</button>
                 <button onclick="deleteSentTaskMobile('${t.id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
    `;
}

function renderMobileCreateTaskForm() {
    const comp = companies.find(c => c.id === currentUser.companyId);
    const categorias = comp && comp.categories ? comp.categories : ['Geral', 'Suporte', 'Desenvolvimento', 'Ajuste'];
    const time = (users || []).filter(u => String(u.companyId) === String(currentUser.companyId));

    return `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            
            <div class="m-form-group">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Categoria da Tarefa</label>
                <select id="mCreateTaskCat" onchange="renderMobileSmartUserList()" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); font-weight: 600; outline: none;">
                    ${categorias.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>


            <div class="m-form-group">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Título da Tarefa</label>
                <input type="text" id="mCreateTaskTitle" placeholder="Ex: Analisar planilhas de Janeiro" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); font-weight: 600; outline: none;">
            </div>

            <div class="m-form-group">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Instruções / Descrição</label>
                <textarea id="mCreateTaskDesc" placeholder="O que deve ser feito?" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); height: 120px; resize: none; outline: none;"></textarea>
            </div>

            <div style="background: rgba(59, 130, 246, 0.05); border: 2px dashed rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 20px; text-align: center;">
                <div style="background: #3b82f6; color: white; padding: 8px 15px; border-radius: 8px; display: inline-block; font-size: 12px; font-weight: 800; margin-bottom: 10px;">Escolher arquivos</div>
                <p style="margin: 0; font-size: 11px; opacity: 0.5;">Arquivos para os funcionários (Opcional - Máx: 3)</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;"><i class="fa-solid fa-calendar"></i> Prazo Limite</label>
                    <input type="date" id="mCreateTaskDate" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); font-size: 13px;">
                </div>
                <div>
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;"><i class="fa-solid fa-layer-group"></i> Dificuldade</label>
                    <select id="mCreateTaskDiff" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); font-size: 13px;">
                        <option value="facil">Fácil (Peso 2)</option>
                        <option value="media" selected>Média (Peso 3)</option>
                        <option value="dificil">Difícil (Peso 4)</option>
                    </select>
                </div>
            </div>

            <div class="m-form-group">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px;">Atribuir a quem? (Selecione um ou mais)</label>
                <div id="mCreateTaskUserListContainer">
                    <div style="text-align: center; padding: 20px; opacity: 0.5;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando lista...</div>
                </div>
                <input type="hidden" id="mCreateTaskTargetUsers" value="[]">
            </div>



            <button onclick="submitMobileDelegatedTask()" id="btnSubmitMDelegar" style="width: 100%; background: #10b981; color: white; padding: 18px; border-radius: 12px; font-weight: 900; font-size: 16px; border: none; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); letter-spacing: 1px; margin-top: 10px;">
                <i class="fa-solid fa-paper-plane"></i> ENVIAR TAREFA
            </button>
        </div>
    `;
}


window.renderMobileSmartUserList = function () {
    const container = document.getElementById('mCreateTaskUserListContainer');
    if (!container) return;

    const catSelect = document.getElementById('mCreateTaskCat');
    const categoria = catSelect ? catSelect.value : '';

    const time = (users || []).filter(u => String(u.companyId) === String(currentUser.companyId) && u.active);
    const stats = {};
    time.forEach(u => stats[u.id] = { vezes: 0, somaQtd: 0, somaXp: 0, score: 0 });

    const totalActs = (typeof activities !== 'undefined' ? activities : []);
    const catActs = totalActs.filter(a =>
        String(a.companyId) === String(currentUser.companyId) &&
        String(a.category).trim() === String(categoria).trim() &&
        a.status === 'concluido'
    );

    let totalQtdGlobal = 0;
    let totalEntregasGlobal = 0;

    catActs.forEach(a => {
        const uId = String(a.userId);
        if (stats[uId]) {
            const q = parseInt(a.quantidade) || 1;
            stats[uId].vezes++;
            stats[uId].somaQtd += q;
            stats[uId].somaXp += (parseInt(a.xpEarned) || 0);
            if (stats[uId].vezes >= 5) {
                totalQtdGlobal += q;
                totalEntregasGlobal++;
            }
        }
    });

    const mediaGlobal = totalEntregasGlobal > 0 ? (totalQtdGlobal / totalEntregasGlobal) : 0;

    time.forEach(u => {
        let s = stats[u.id];

        if (s.vezes >= 5) {
            s.mediaQtd = s.somaQtd / s.vezes;
            const qualidadeXp = s.somaXp / s.vezes;

            const ptsExperiencia = s.vezes * 10;
            const ptsVolume = s.mediaQtd * 2;
            const ptsAcimaMedia = (mediaGlobal > 0 && s.mediaQtd > mediaGlobal) ? ((s.mediaQtd / mediaGlobal) * 20) : 0;
            const ptsQualidade = qualidadeXp * 0.5;

            s.score = ptsExperiencia + ptsVolume + ptsAcimaMedia + ptsQualidade;
        } else {
            s.score = -1;
        }
    });

    time.sort((a, b) => stats[b.id].score - stats[a.id].score);
    const indicados = time.filter(u => stats[u.id].vezes >= 5).slice(0, 6);
    const outros = time.filter(u => !indicados.includes(u));

    let html = `
        <div style="max-height: 350px; overflow-y: auto; background: var(--mobile-input-bg); border-radius: 12px; border: 1px solid var(--mobile-border); padding: 10px;">
            <div style="display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 15px; margin: 5px 0 15px 0; width: 100%;">
                <span style="font-size: 11px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;"><i class="fa-solid fa-ranking-star"></i> Pessoas Indicadas</span>
                <div style="height: 2px; background: rgba(16, 185, 129, 0.2); width: 100%; border-radius: 2px;"></div>
            </div>
    `;

    if (indicados.length === 0) {
        html += `
            <div style="background: rgba(0,0,0,0.1); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
                <i class="fa-solid fa-user-astronaut" style="font-size: 24px; opacity: 0.2; margin-bottom: 8px;"></i>
                <p style="margin: 0; font-size: 11px; opacity: 0.5;">Nenhuma indicação ainda.<br>Média baseada em quem tem +5 entregas.</p>
            </div>
        `;
    } else {
        html += indicados.map(u => renderMobileUserSelectionItem(u, stats[u.id], true, mediaGlobal)).join('');
    }

    if (outros.length > 0) {
        html += `
            <div style="display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 15px; margin: 25px 0 15px 0; width: 100%;">
                <span style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;"><i class="fa-solid fa-users"></i> Outros Colaboradores</span>
                <div style="height: 2px; background: rgba(255,255,255,0.05); width: 100%; border-radius: 2px;"></div>
            </div>
        `;
        html += outros.map(u => renderMobileUserSelectionItem(u, stats[u.id], false)).join('');
    }

    html += `</div>`;
    container.innerHTML = html;
};

function renderMobileUserSelectionItem(u, s, isIndicado, mediaGlobal = 0) {
    let isSelected = false;
    try {
        const selected = JSON.parse(document.getElementById('mCreateTaskTargetUsers')?.value || '[]');
        isSelected = selected.includes(String(u.id));
    } catch (e) { }

    // Destaque dinâmico baseado na seleção e indicação
    let cardStyle = 'padding: 14px; border-radius: 16px; margin-bottom: 8px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); ';
    if (isSelected) {
        cardStyle += 'border: 2px solid #10b981; background: rgba(16, 185, 129, 0.15); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2); transform: scale(1.02);';
    } else if (isIndicado) {
        cardStyle += 'border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.05);';
    } else {
        cardStyle += 'border: 1px solid var(--mobile-border); background: var(--mobile-card-bg);';
    }

    let statsHtml = '';
    if (s.vezes >= 5) {
        const mediaUser = s.somaQtd / s.vezes;
        const tagDesempenho = mediaUser > mediaGlobal
            ? '<span style="color: #10b981; font-weight: 900; font-size: 13px;"><i class="fa-solid fa-arrow-trend-up"></i> Acima</span>'
            : '<span style="color: #64748b; font-weight: 900; font-size: 13px;"><i class="fa-solid fa-minus"></i> Média</span>';

        let qualidadeVisual = "⭐⭐⭐⭐⭐";
        if (s.score < 50) qualidadeVisual = "⭐⭐⭐⭐";
        if (s.score < 30) qualidadeVisual = "⭐⭐⭐";

        const mediaArredondada = Math.round(mediaUser);

        statsHtml = `
        <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid #3b82f6; border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center;">
                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Total</span>
                <span style="font-size: 14px; font-weight: 900; color: #ffffff; margin-top: 2px;">${s.vezes}</span>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid #f59e0b; border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center;">
                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Média</span>
                <span style="font-size: 14px; font-weight: 900; color: #ffffff; margin-top: 2px;">${mediaArredondada}</span>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center;">
                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Status</span>
                <div style="margin-top: 2px;">${tagDesempenho}</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-left: 3px solid #a855f7; border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center;">
                <span style="font-size: 8px; color: #94a3b8; font-weight: 800; text-transform: uppercase;">Qualidade</span>
                <span style="font-size: 10px; margin-top: 2px; letter-spacing: 0.5px;">${qualidadeVisual}</span>
            </div>
        </div>`;
    } else {
        statsHtml = `
            <div style="font-size: 11px; color: #854d0e; background: #fef9c3; margin-top: 12px; padding: 12px; border-radius: 10px; border: 1px dashed #fcd34d; font-weight: 600; line-height: 1.5; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                <i class="fa-solid fa-lightbulb" style="color: #f59e0b; margin-right: 5px;"></i> Histórico: <span style="font-weight: 900;">${s.vezes} de 5</span> entregas para calibrar perfil.
            </div>
        `;
    }

    return `
        <div onclick="selectMobileCreateTaskUser('${u.id}')" class="m-user-sel-item" style="${cardStyle}">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="m-user-radio" style="width: 22px; height: 22px; border-radius: 50%; border: 2px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.2)'}; display: flex; align-items: center; justify-content: center; background: ${isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent'}; transition: all 0.3s;">
                        <div class="m-radio-inner" id="radio-user-${u.id}" style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; transform: ${isSelected ? 'scale(1)' : 'scale(0)'}; transition: all 0.2s; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);"></div>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 15px; font-weight: 800; color: ${isSelected ? '#10b981' : 'var(--mobile-text)'}; transition: color 0.3s;">${u.name}</p>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: var(--mobile-text-secondary);">${u.team || 'Sem Equipe'}</p>
                    </div>
                </div>
                ${isIndicado ? `<span style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-size: 9px; padding: 4px 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-award"></i> INDICADO</span>` : ''}
            </div>
            ${statsHtml}
        </div>
    `;
}


window.selectMobileCreateTaskUser = function (userId) {
    let selected = [];
    try {
        selected = JSON.parse(document.getElementById('mCreateTaskTargetUsers').value);
    } catch (e) { selected = []; }

    const idx = selected.indexOf(userId);
    if (idx > -1) {
        selected.splice(idx, 1);
        document.getElementById('radio-user-' + userId).style.transform = 'scale(0)';
    } else {
        selected.push(userId);
        document.getElementById('radio-user-' + userId).style.transform = 'scale(1)';
    }

    document.getElementById('mCreateTaskTargetUsers').value = JSON.stringify(selected);
};

window.deleteSentTaskMobile = function (id) {
    if (!confirm('Deseja excluir esta tarefa enviada?')) return;
    db.collection('tarefas').doc(id).delete().then(() => {
        showToast('Tarefa excluída!');
        renderMobileTab('tasks');
    });
};

window.submitMobileDelegatedTask = function () {
    let userIds = [];
    try {
        userIds = JSON.parse(document.getElementById('mCreateTaskTargetUsers').value);
    } catch (e) { userIds = []; }

    const title = document.getElementById('mCreateTaskTitle').value;
    const description = document.getElementById('mCreateTaskDesc').value;
    const category = document.getElementById('mCreateTaskCat').value;
    const date = document.getElementById('mCreateTaskDate').value;
    const diff = document.getElementById('mCreateTaskDiff').value;

    if (userIds.length === 0 || !title) return showToast('Selecione pelo menos um colaborador e preencha o título', 'error');

    const btn = document.getElementById('btnSubmitMDelegar');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO (${userIds.length})...`;

    const promises = userIds.map((uId, index) => {
        // 🔥 IMPORTANTE: Recupera o objeto original do usuário para manter o TIPO do ID (Number vs String)
        const targetUser = (users || []).find(u => String(u.id) === String(uId));
        const finalUserId = targetUser ? targetUser.id : uId;
        const tarefaId = Date.now() + index;

        const newTask = {
            id: tarefaId,
            userId: finalUserId,
            senderId: currentUser.id,
            adminId: currentUser.id,
            adminName: currentUser.name,
            companyId: currentUser.companyId,
            title: title,
            description: description,
            category: category,
            dificuldade: diff,
            date: date || new Date().toISOString().split('T')[0],
            status: 'pendente',
            createdAt: new Date().toISOString(),
            origem: 'delegada',
            tipo: 'delegada'
        };
        return db.collection('tarefas').doc(String(tarefaId)).set(newTask);
    });

    Promise.all(promises).then(() => {
        showToast(`${userIds.length} missões enviadas com sucesso!`);
        window.currentMobileTaskView = 'gerenciar';
        renderMobileTab('tasks');
    }).catch(err => {
        console.error("Erro ao delegar:", err);
        showToast('Erro ao enviar algumas missões', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ENVIAR TAREFA';
    });
};




function renderMissionCard(a) {
    // Dono da missão (Remetente)
    const creator = a.adminName || 'Gestor';
    const isPendente = a.status === 'pendente' || a.status === 'andamento';
    const isEmRevisao = a.status === 'em_revisao';

    // Cor de status para o brilho e pílula inferior
    const statusColor = isPendente ? '#f59e0b' : (isEmRevisao ? '#eab308' : '#10b981');
    const statusBg = isPendente ? 'rgba(245, 158, 11, 0.12)' : (isEmRevisao ? 'rgba(234, 179, 8, 0.12)' : 'rgba(16, 185, 129, 0.12)');

    // Estilo REAL da categoria vindo das configurações
    const categoryStyle = getCategoryStyleString(a.category);

    const isError = a.status === 'pendente' && a.feedbackAdmin;
    const cardBorder = isError ? 'border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: 0 5px 15px rgba(239, 68, 68, 0.1);' : 'border-left: 4px solid ' + statusColor + ';';

    return `
        <div class="m-card mission-card-premium ${a.status}" style="${cardBorder}" onclick="openActivityMobile('${a.id}')">
            <div class="m-card-top" style="margin-bottom: 12px;">
                <div class="m-cat-tag" style="${categoryStyle}">
                    <i class="fa-solid fa-tag"></i> ${esc(a.category)}
                </div>
                <div class="m-date-tag">
                    <i class="fa-regular fa-calendar" style="opacity: 0.7;"></i> ${formatDate(a.date)}
                </div>
            </div>
            
            <div class="m-card-main">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
                    <h4 class="m-mission-title" style="flex: 1; margin: 0; line-height: 1.4;">
                        ${esc(a.title)}
                    </h4>
                    ${isError ? `
                        <div style="background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 8px; font-weight: 900; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3); text-transform: uppercase; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-triangle-exclamation"></i> ERRO
                        </div>
                    ` : ''}
                </div>

                <div class="m-mission-meta" style="margin-top: 8px;">
                    <span class="m-meta-item" style="font-size: 11px; opacity: 0.6;"><i class="fa-solid fa-user-tie"></i> Por: <strong>${esc(creator)}</strong></span>
                </div>
            </div>

            <div class="m-card-action" style="margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
                <div class="m-status-pill" style="background: ${statusBg}; color: ${statusColor}; font-size: 10px; padding: 4px 10px;">
                   <span class="status-dot-inner" style="background: ${statusColor}; width: 6px; height: 6px;"></span>
                   ${getStatusText(a.status)}
                </div>
                ${isPendente ? `
                    <button class="btn-action-glow" style="padding: 8px 15px; font-size: 12px;">
                        ${a.feedbackAdmin ? '<i class="fa-solid fa-rotate-left"></i> Reenviar' : 'Responder <i class="fa-solid fa-chevron-right"></i>'}
                    </button>
                ` : `
                    <i class="fa-solid fa-circle-check" style="color: ${statusColor}; font-size: 18px;"></i>
                `}
            </div>
        </div>
    `;
}

function renderMobileHistory(container) {
    if (!container) return;
    const isAdmin = isCurrentModeAdmin();
    const myActs = getFilteredMobileData();

    // Ordenação Final (Descendente)
    myActs.sort((a, b) => {
        // 1. Data do Calendário (descrescente)
        if (b.date !== a.date) return b.date.localeCompare(a.date);

        // 2. Horário de Criação (descendente)
        const getTime = (val) => {
            if (!val) return 0;
            if (val.seconds) return val.seconds * 1000; // Firestore Timestamp
            if (val instanceof Date) return val.getTime();
            if (typeof val === 'string') return new Date(val).getTime() || 0;
            return val; // Já sendo número
        };

        return getTime(b.createdAt) - getTime(a.createdAt);
    });


    if (myActs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; opacity: 0.5;">
                <i class="fa-solid fa-clock-rotate-left" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p style="font-size: 14px; font-weight: 600;">Seu histórico está vazio.</p>
                <small>As atividades que você realizar aparecerão aqui.</small>
            </div>
        `;
        return;
    }

    // Agrupamento por data
    const groups = {};
    myActs.forEach(a => {
        const d = a.date;
        if (!groups[d]) groups[d] = [];
        groups[d].push(a);
    });

    let html = `<div class="mobile-timeline"><div class="timeline-line"></div>`;

    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
        let label = formatDate(dateStr);
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dateStr === today) label = "Hoje";
        else if (dateStr === yesterdayStr) label = "Ontem";

        html += `
            <div class="timeline-group">
                <div class="timeline-date-header">${label}</div>
                ${groups[dateStr].map(a => {
            const isDark = document.body.classList.contains('dark-mode');
            const hue = typeof getCategoryHue === 'function' ? getCategoryHue(a.category) : 200;

            // Ajuste de contraste para UX Designer Profissional:
            // Se for Modo Claro e a cor for amarela/laranja (40-85), escurecemos o texto.
            const getContrastText = (h) => {
                if (!isDark && (h >= 40 && h <= 85)) return 'hsl(' + h + ', 80%, 25%)';
                if (!isDark) return 'hsl(' + h + ', 80%, 35%)';
                return 'white';
            };

            const accentColor = `hsl(${hue}, 80%, 60%)`;
            const catTextColor = getContrastText(hue);
            const statusColor = a.status === 'concluido' ? '#10b981' : '#f59e0b';

            return `
                        <div class="timeline-item" onclick="openActivityMobile('${a.id}')">
                            <div class="timeline-dot" style="border-color: ${accentColor}; box-shadow: 0 0 10px ${accentColor}44;"></div>
                            <div class="timeline-card" style="--accent-color: ${accentColor}">
                                <div class="timeline-card-header">
                                    <span class="timeline-cat-name" style="color: ${catTextColor};">${esc(a.category || 'Geral')}</span>
                                    <span class="timeline-status" style="background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
                                        ${getStatusText(a.status)}
                                    </span>
                                </div>
                                <h3 class="timeline-title">
                                    ${esc(a.title)}
                                </h3>

                                <p class="timeline-desc" style="-webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${esc(a.description || 'Sem descrição detalhada.')}</p>
                                <div class="timeline-footer">
                                    <span class="timeline-time"><i class="fa-regular fa-clock"></i> ${a.createdAt ? new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                    
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span class="timeline-sender" style="font-size: 10px; opacity: 0.6; display: flex; align-items: center; gap: 4px; margin: 0;">
                                            <i class="fa-solid fa-user-tie"></i> 
                                            ${esc((a.adminId || a.senderId || a.delegadaPor)
                    ? (users.find(u => String(u.id) === String(a.adminId || a.senderId))?.name || a.adminName || 'Gestor')
                    : (users.find(u => String(u.id) === String(a.userId))?.name || currentUser.name)
                )}
                                        </span>
                                        <i class="fa-solid fa-chevron-right" style="font-size: 10px; color: #475569;"></i>
                                    </div>
                                </div>

                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    });

    html += `<div style="height: 100px;"></div></div>`;
    container.innerHTML = html;
}

// 🔥 SISTEMA DE RESPOSTA NATIVO MOBILE (BOTTOM SHEET)
window.mobileSelectedFiles = [];

window.handleMobileFileSelection = function (input) {
    const list = document.getElementById('mRespFilesList');
    const area = document.getElementById('mFileArea');
    if (!list) return;

    const newFiles = Array.from(input.files);
    // Adiciona novos arquivos respeitando o limite de 3
    newFiles.forEach(f => {
        if (window.mobileSelectedFiles.length < 3) {
            window.mobileSelectedFiles.push(f);
        }
    });

    // Resetar o input para permitir selecionar o mesmo arquivo novamente se for apagado e re-adicionado
    input.value = '';

    renderMobileSelectedFilesList();
};

window.renderMobileSelectedFilesList = function () {
    const list = document.getElementById('mRespFilesList');
    const area = document.getElementById('mFileArea');
    if (!list) return;

    list.innerHTML = '';

    if (window.mobileSelectedFiles.length > 0) {
        if (area) area.style.borderColor = '#10b981';
        window.mobileSelectedFiles.forEach((f, idx) => {
            list.innerHTML += `
                <div style="font-size: 11px; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 5px;">
                    <span style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <i class="fa-solid fa-file-circle-check"></i> ${esc(f.name)}
                    </span>
                    <button onclick="removeMobileSelectedFile(${idx})" style="background: none; border: none; color: #ef4444; padding: 5px; cursor: pointer;">
                        <i class="fa-solid fa-xmark" style="font-size: 14px;"></i>
                    </button>
                </div>
            `;
        });
    } else {
        if (area) area.style.borderColor = 'rgba(255,255,255,0.2)';
    }
};

window.removeMobileSelectedFile = function (index) {
    window.mobileSelectedFiles.splice(index, 1);
    renderMobileSelectedFilesList();
};

// 🔥 SISTEMA DE REVISÃO NATIVO MOBILE
window.mobileRevRating = 0;
window.mobileRevFiles = [];

window.setMobileRevRating = function (stars) {
    window.mobileRevRating = stars;
    const icons = document.querySelectorAll('#mStarRating i');
    icons.forEach((icon, idx) => {
        if (idx < stars) {
            icon.style.color = '#f59e0b'; // Gold
        } else {
            icon.style.color = 'rgba(255,255,255,0.1)';
        }
    });
};

window.handleMobileFileSelectionRev = function (input) {
    const list = document.getElementById('mRevFilesList');
    const area = document.getElementById('mFileAreaRev');
    if (!list) return;

    Array.from(input.files).forEach(f => {
        if (window.mobileRevFiles.length < 3) window.mobileRevFiles.push(f);
    });
    input.value = '';
    renderMobileRevFilesList();
};

window.renderMobileRevFilesList = function () {
    const list = document.getElementById('mRevFilesList');
    const area = document.getElementById('mFileAreaRev');
    if (!list) return;
    list.innerHTML = '';
    if (window.mobileRevFiles.length > 0) {
        if (area) area.style.borderColor = '#ef4444';
        window.mobileRevFiles.forEach((f, idx) => {
            list.innerHTML += `
                <div style="font-size: 11px; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 8px 12px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(239, 68, 68, 0.2);">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><i class="fa-solid fa-file-circle-exclamation"></i> ${esc(f.name)}</span>
                    <button onclick="removeMobileRevFile(${idx})" style="background:none; border:none; color:#ef4444;"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `;
        });
    } else {
        if (area) area.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    }
};

window.removeMobileRevFile = function (idx) {
    window.mobileRevFiles.splice(idx, 1);
    renderMobileRevFilesList();
};

window.submitMobileRevision = async function (id, acao) {
    const feedback = document.getElementById('mRevFeedback').value.trim();

    if (acao === 'aprovar' && window.mobileRevRating === 0) {
        return showToast('Por favor, classifique a qualidade antes de aprovar', 'warning');
    }
    if (acao === 'devolver' && !feedback) {
        return showToast('Por favor, descreva o que precisa ser corrigido antes de devolver', 'warning');
    }

    let t = activities.find(x => String(x.id) === String(id));
    if (!t && typeof tarefasDelegadas !== 'undefined') {
        t = tarefasDelegadas.find(x => String(x.id) === String(id));
    }

    if (!t) {
        console.error("Missão não encontrada na memória local:", id);
        return showToast('Erro: Dados da missão não carregados. Tente abrir novamente.', 'error');
    }

    // Processar anexos de correção
    let correctionAttachments = [];
    for (let f of window.mobileRevFiles) {
        const reader = new FileReader();
        const promise = new Promise(res => {
            reader.onload = e => res({ name: f.name, url: e.target.result });
            reader.readAsDataURL(f);
        });
        correctionAttachments.push(await promise);
    }

    const updates = {
        status: acao === 'aprovar' ? 'concluido' : 'pendente',
        feedbackAdmin: feedback,
        rating: window.mobileRevRating,
        reviewRating: window.mobileRevRating, // Paridade com o desktop
        correctionAttachments: correctionAttachments,
        updatedAt: new Date().toISOString()
    };

    // --- LÓGICA DE GAMIFICAÇÃO (Sincronizada com o Desktop) ---
    if (acao === 'aprovar') {
        try {
            const compSnap = await db.collection('empresas').doc((t.companyId || currentUser.companyId).toString()).get();
            const dataEmpresa = compSnap.data();
            const gamificacaoAtiva = dataEmpresa.gamificationEnabled === true;
            const regras = dataEmpresa.gamificacao || { xpBase: 50, xpNivel: 500, coinsNivel: 100, pesoFacil: 2, pesoMedia: 3, pesoDificil: 4 };

            let xpGanho = 0;
            if (gamificacaoAtiva) {
                let peso = regras.pesoMedia;
                let diff = t.dificuldade;
                if (diff == 2 || diff === 'facil') peso = regras.pesoFacil;
                if (diff == 4 || diff === 'dificil') peso = regras.pesoDificil;
                xpGanho = Math.round(regras.xpBase * peso);
            }

            // 1. Atualizar Tarefa (Pode estar na coleção 'tarefas' ou 'atividades')
            await db.collection('tarefas').doc(String(id)).update(updates).catch(() => {
                return db.collection('atividades').doc(String(id)).update(updates);
            });

            // 2. Criar Atividade Histórica (XP para o Pódio)
            const idAtiv = Date.now().toString();
            await db.collection('atividades').doc(idAtiv).set({
                ...t,
                id: idAtiv,
                date: new Date().toISOString().split('T')[0],
                status: 'concluido',
                xpEarned: xpGanho,
                tarefaVinculadaId: String(id),
                reviewRating: window.mobileRevRating,
                approvedBy: currentUser.id,
                approvedAt: new Date().toISOString()
            });

            // 3. Atualizar Colaborador (XP, Nível, Estrelas)
            const uSnap = await db.collection('usuarios').doc(t.userId.toString()).get();
            if (uSnap.exists) {
                const u = uSnap.data();
                let rSum = (u.ratingSum || 0) + window.mobileRevRating;
                let rCount = (u.ratingCount || 0) + 1;
                let rAvg = rSum / rCount;
                let userUpdates = { ratingSum: rSum, ratingCount: rCount, averageRating: rAvg };

                if (gamificacaoAtiva) {
                    let newXp = (u.xp || 0) + xpGanho;
                    let oldLevel = u.level || 1;
                    let newLevel = Math.floor(newXp / (regras.xpNivel || 500)) + 1;
                    let newCoins = u.goCoins || 0;
                    if (newLevel > oldLevel) newCoins += (newLevel - oldLevel) * (regras.coinsNivel || 100);
                    userUpdates = { ...userUpdates, xp: newXp, level: newLevel, goCoins: newCoins };
                }
                await db.collection('usuarios').doc(t.userId.toString()).update(userUpdates);
            }

            // Notificar Colaborador
            await db.collection('notificacoes').add({
                userId: t.userId,
                titulo: gamificacaoAtiva ? '🏆 Missão Aprovada!' : '✅ Missão Aprovada',
                mensagem: gamificacaoAtiva ? `Sua missão "${t.title}" foi aprovada! +${xpGanho} XP conquistados.` : `Sua missão "${t.title}" foi aprovada com sucesso.`,
                createdAt: new Date().toISOString(),
                acaoAlvo: 'dashboard',
                lida: false
            });

            showToast(gamificacaoAtiva ? `Aprovado! +${xpGanho} XP enviados.` : 'Missão aprovada!');

        } catch (err) {
            console.error("Erro ao aprovar missão mobile:", err);
            showToast('Erro ao processar aprovação', 'error');
        }
    } else {
        // --- DEVOLVER PARA CORREÇÃO ---
        await db.collection('tarefas').doc(String(id)).update(updates);
        if (t && t.userId) {
            await db.collection('notificacoes').add({
                userId: t.userId,
                titulo: '⚠️ Missão Devolvida',
                mensagem: `Sua missão "${t.title}" precisa de ajustes. Veja o feedback.`,
                createdAt: new Date().toISOString(),
                acaoAlvo: 'tasks',
                lida: false
            });
        }
        showToast('Missão devolvida para correção');
    }

    closeMobileModal();
    // Forçar atualização total dos dados
    if (typeof refreshLiveData === 'function') refreshLiveData();
    setTimeout(() => renderMobileTab('tasks'), 300);
};

window.responderTarefa = function (id) {
    window.mobileRevRating = 0;
    window.mobileRevFiles = [];
    window.mobileSelectedFiles = []; // Resetar ao abrir
    const t = activities.find(x => x.id === id) || activities.find(x => String(x.id) === String(id));
    if (!t) return showToast('Tarefa não encontrada', 'error');

    const admin = users.find(u => u.id === t.senderId);
    const nomeAdmin = admin ? admin.name : 'Gestor';

    const content = `
        <div class="m-respond-flow">
            <!-- Informações da Missão -->
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); padding: 20px; border-radius: 18px; margin-bottom: 25px;">
                <p style="font-size: 10px; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;"><i class="fa-solid fa-align-left"></i> Instruções do Gestor</p>
                <h4 style="margin: 0 0 10px 0; font-size: 17px; color: var(--mobile-text);">${esc(t.title)}</h4>
                <div style="font-size: 14px; color: var(--mobile-text); opacity: 0.8; line-height: 1.6; white-space: pre-wrap; margin-bottom: 15px;">${esc(t.description || 'Nenhuma instrução adicional.')}</div>
                
                ${(t.attachments && t.attachments.length > 0) ? `
                    <p style="font-size: 10px; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;"><i class="fa-solid fa-paperclip"></i> Materiais de Referência</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${t.attachments.map(an => `
                            <a href="${escAttr(an.url)}" download="${escAttr(an.name)}" class="m-attachment-chip" style="display: flex; align-items: center; gap: 6px; background: white; color: #10b981; padding: 6px 12px; border-radius: 10px; text-decoration: none; font-size: 11px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.2); box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                <i class="fa-solid fa-download"></i> ${esc(an.name)}
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <form id="mFormRespond" onsubmit="event.preventDefault(); submitMobileResponse('${t.id}')">
                <div class="m-form-group">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Título da Entrega</label>
                    <input type="text" id="mRespTitle" class="form-control" value="${escAttr(t.tituloEntrega || t.title)}" required style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); width: 100%;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Quantidade Realizada (Opcional)</label>
                        <input type="number" id="mRespQtd" class="form-control" value="${t.quantidade || ''}" placeholder="Ex: 105" style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); width: 100%;">
                    </div>
                </div>
                
                <div class="m-form-group">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Observações / Resposta</label>
                    <textarea id="mRespObs" class="form-control" rows="3" style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); width: 100%; height: 100px; resize: none;">${esc(t.respostaFuncionario || '')}</textarea>
                </div>

                <div class="m-form-group">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px;">Anexar Arquivos (Máx 3)</label>
                    <div style="background: var(--mobile-input-bg); border: 2px dashed var(--mobile-border); border-radius: 14px; padding: 20px; text-align: center; position: relative;">
                        <input type="file" id="mRespFiles" multiple style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                        <i class="fa-solid fa-cloud-arrow-up" style="font-size: 24px; color: var(--mobile-primary); margin-bottom: 8px;"></i>
                        <p style="margin: 0; font-size: 12px; color: var(--mobile-text); opacity: 0.7;">Clique para selecionar arquivos</p>
                    </div>
                </div>

                <button type="submit" id="mBtnSubmitResp" class="btn btn-mobile-primary" style="width: 100%; padding: 18px; border-radius: 15px; font-weight: 900; background: #10b981; color: white; border: none; font-size: 16px; margin-top: 10px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);">
                    <i class="fa-solid fa-paper-plane"></i> ENVIAR ENTREGA
                </button>
            </form>
        </div>
    `;

    openMobileModal('Responder Missão', content);
};

window.submitMobileResponse = async function (id) {
    const btn = document.getElementById('mBtnSubmitResp');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO...';
    btn.disabled = true;

    try {
        const title = document.getElementById('mRespTitle').value;
        const obs = document.getElementById('mRespObs').value;
        const qtd = parseInt(document.getElementById('mRespQtd').value) || 0;

        let anexos = [];
        if (window.mobileSelectedFiles && window.mobileSelectedFiles.length > 0) {
            for (let f of window.mobileSelectedFiles) {
                const reader = new FileReader();
                const promise = new Promise(res => {
                    reader.onload = e => res({ name: f.name, url: e.target.result });
                    reader.readAsDataURL(f);
                });
                anexos.push(await promise);
            }
        }

        await db.collection('tarefas').doc(String(id)).update({
            status: 'em_revisao',
            tituloEntrega: title,
            respostaFuncionario: obs,
            quantidade: qtd,
            attachments: anexos,
            updatedAt: new Date().toISOString()
        });

        // Notificar Admin
        const t = activities.find(x => String(x.id) === String(id));
        if (t && t.senderId) {
            await db.collection('notificacoes').add({
                userId: t.senderId,
                titulo: '📩 Missão Entregue (Mobile)',
                mensagem: `${currentUser.name} enviou a missão "${title}" para revisão.`,
                createdAt: new Date().toISOString(),
                acaoAlvo: 'delegar',
                lida: false
            });
        }

        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'ENTREGAR_TAREFA', `Entregou a tarefa: ${title}`);
        }

        showToast('Missão enviada com sucesso!');
        closeMobileModal();
        renderMobileTab('tasks');

    } catch (e) {
        console.error(e);
        showToast('Erro ao enviar resposta', 'error');
        btn.innerHTML = original;
        btn.disabled = false;
    }
};

function populateMobileFilters() {
    const isAdmin = currentUser.role === 'admin' || (currentUser.role === 'hibrido' && (localStorage.getItem('feedbackgo_modo_hibrido') || 'admin') === 'admin');
    if (!isAdmin) return;

    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c) return;

    const elTeam = document.getElementById('mFilterTeam');
    const elUser = document.getElementById('mFilterUser');

    if (elTeam && c.teams) {
        let html = '<option value="">Todas Equipes</option>';
        c.teams.forEach(t => html += `<option value="${t}">${t}</option>`);
        elTeam.innerHTML = html;
    }

    if (elUser) {
        const companyUsers = users.filter(u => String(u.companyId) === String(currentUser.companyId));
        let html = '<option value="">Todos Usuários</option>';
        companyUsers.forEach(u => html += `<option value="${u.id}">${u.name}</option>`);
        elUser.innerHTML = html;
    }
}

window.openMobileFilterDrawer = function () {
    const isAdmin = isCurrentModeAdmin();
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));

    // Captura valores atuais dos campos ocultos de estado
    const currentTeam = document.getElementById('mFilterTeam')?.value || '';
    const currentUserF = document.getElementById('mFilterUser')?.value || '';
    const currentCat = document.getElementById('mFilterCategory')?.value || '';
    const currentStart = document.getElementById('mFilterStart')?.value || '';
    const currentEnd = document.getElementById('mFilterEnd')?.value || '';

    const html = `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
            
            ${isAdmin ? `
            <div class="form-group">
                <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Equipe / Departamento</label>
                <select id="mDrawerFilterTeam" onchange="syncMobileFilters(); refreshMobileDashboard();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text);">
                    <option value="">Todas Equipes</option>
                    ${c && c.teams ? c.teams.map(t => `<option value="${t}" ${t === currentTeam ? 'selected' : ''}>${t}</option>`).join('') : ''}
                </select>
            </div>

            <div class="form-group">
                <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Colaborador Específico</label>
                <select id="mDrawerFilterUser" onchange="syncMobileFilters(); refreshMobileDashboard();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text);">
                    <option value="">Todos Usuários</option>
                    ${users.filter(u => String(u.companyId) === String(currentUser.companyId)).map(u => `<option value="${u.id}" ${String(u.id) === String(currentUserF) ? 'selected' : ''}>${u.name}</option>`).join('')}
                </select>
            </div>
            ` : ''}

            <div class="form-group">
                <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Categoria</label>
                <select id="mDrawerFilterCategory" onchange="syncMobileFilters(); refreshMobileDashboard();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text);">
                    <option value="">Todas Categorias</option>
                    ${(c && (c.categories || defaultCategories)) ? (c.categories || defaultCategories).map(cat => `<option value="${cat}" ${cat === currentCat ? 'selected' : ''}>${cat}</option>`).join('') : ''}
                </select>
            </div>

            <div style="display: flex; gap: 15px; width: 100%;">
                <div class="form-group" style="flex: 1; min-width: 0;">
                    <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">De:</label>
                    <input type="date" id="mDrawerFilterStart" value="${currentStart}" onchange="syncMobileFilters(); refreshMobileDashboard();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); box-sizing: border-box;">
                </div>
                <div class="form-group" style="flex: 1; min-width: 0;">
                    <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Até:</label>
                    <input type="date" id="mDrawerFilterEnd" value="${currentEnd}" onchange="syncMobileFilters(); refreshMobileDashboard();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); box-sizing: border-box;">
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="clearMobileFilters(); closeMobileModal();" style="flex: 1; padding: 16px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); color: #ef4444; font-weight: 800; font-size: 13px;">LIMPAR TUDO</button>
                <button onclick="closeMobileModal()" style="flex: 2; padding: 16px; border-radius: 12px; border: none; background: #10b981; color: white; font-weight: 800; font-size: 13px;">APLICAR FILTROS</button>
            </div>
        </div>
    `;

    openMobileModal('Filtrar Dashboard', html);
};

window.syncMobileFilters = function () {
    const team = document.getElementById('mDrawerFilterTeam')?.value;
    const user = document.getElementById('mDrawerFilterUser')?.value;
    const cat = document.getElementById('mDrawerFilterCategory')?.value;
    const start = document.getElementById('mDrawerFilterStart')?.value;
    const end = document.getElementById('mDrawerFilterEnd')?.value;

    // Atualiza os inputs "fantasmas" que o dashboard usa para persistir o estado
    const fTeam = document.getElementById('mFilterTeam');
    const fUser = document.getElementById('mFilterUser');
    const fCat = document.getElementById('mFilterCategory');
    const fStart = document.getElementById('mFilterStart');
    const fEnd = document.getElementById('mFilterEnd');

    if (fTeam) fTeam.value = team || '';
    if (fUser) fUser.value = user || '';
    if (fCat) fCat.value = cat || '';
    if (fStart) fStart.value = start || '';
    if (fEnd) fEnd.value = end || '';
};

window.toggleMobileFilters = function () {
    openMobileFilterDrawer();
};

window.clearMobileFilters = function () {
    const fields = [
        'mFilterTeam', 'mFilterUser', 'mFilterCategory', 'mFilterStart', 'mFilterEnd',
        'mDrawerFilterTeam', 'mDrawerFilterUser', 'mDrawerFilterCategory', 'mDrawerFilterStart', 'mDrawerFilterEnd'
    ];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    refreshMobileDashboard();
};

window.refreshMobileDashboard = function () {
    const container = document.getElementById('mobileContent');
    if (!container) return;

    // 🔥 REFRESH INTELIGENTE: Atualiza a tab que estiver aberta no momento
    if (typeof currentMobileTab !== 'undefined') {
        renderMobileTab(currentMobileTab);
    } else {
        renderMobileDashboard(container);
    }
};



window.renderMobileReports = function (container) {
    if (!container) return;

    container.innerHTML = `
        <div class="m-section" style="padding-top: 10px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px;">
                <div>
                    <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--mobile-text); line-height: 1.2;">Relatórios</h2>
                    <p style="margin: 3px 0 0; font-size: 12px; color: var(--mobile-text); opacity: 0.45;">Filtre e explore registros</p>
                </div>
                <button onclick="openMobileReportFilterDrawer()" class="btn-icon-only" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-radius: 14px; width: 46px; height: 46px; border: 1px solid rgba(16,185,129,0.25);">
                    <i class="fa-solid fa-sliders"></i>
                </button>
            </div>

            <!-- Action buttons -->
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button onclick="generateMobileReport()" style="
                    flex: 2; height: 52px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white; border-radius: 16px;
                    font-weight: 800; border: none; font-size: 14px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    box-shadow: 0 4px 15px rgba(16,185,129,0.3);
                    cursor: pointer; letter-spacing: 0.5px;
                ">
                    <i class="fa-solid fa-bolt"></i> GERAR
                </button>
                <button onclick="downloadReportExcel()" style="
                    flex: 1; height: 52px;
                    background: rgba(59,130,246,0.12);
                    color: #3b82f6; border-radius: 16px;
                    font-weight: 800; border: 1px solid rgba(59,130,246,0.25); font-size: 13px;
                    display: flex; align-items: center; justify-content: center; gap: 7px;
                    cursor: pointer;
                ">
                    <i class="fa-solid fa-file-excel"></i> XLS
                </button>
            </div>

            <!-- Hidden inputs for report state -->
            <input type="hidden" id="reportFilterTeam" value="">
            <input type="hidden" id="reportFilterUser" value="">
            <input type="hidden" id="reportFilterCategory" value="">
            <input type="hidden" id="reportFilterStartDate" value="">
            <input type="hidden" id="reportFilterEndDate" value="">
            <input type="hidden" id="reportFilterSearch" value="">

            <div id="mReportResult" style="margin-top: 10px;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:70px 20px;">
                    <div style="
                        width:80px;height:80px;border-radius:50%;
                        background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(59,130,246,0.15));
                        display:flex;align-items:center;justify-content:center;
                        border: 1px solid rgba(16,185,129,0.2);
                    ">
                        <i class="fa-solid fa-chart-pie" style="font-size:32px;background:linear-gradient(135deg,#10b981,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;"></i>
                    </div>
                    <p style="font-size:15px;font-weight:700;color:var(--mobile-text);opacity:0.5;margin:0;text-align:center;">Configure os filtros</p>
                    <p style="font-size:12px;color:var(--mobile-text);opacity:0.3;margin:0;text-align:center;">Use o botão <strong>GERAR</strong> para visualizar os registros</p>
                </div>
            </div>
            
            <div style="height: 40px;"></div>
        </div>
    `;
};

window.openMobileReportFilterDrawer = function () {
    const isAdmin = isCurrentModeAdmin();
    if (!isAdmin) return;

    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const currentTeam = document.getElementById('reportFilterTeam')?.value || '';
    const currentUserF = document.getElementById('reportFilterUser')?.value || '';
    const currentCat = document.getElementById('reportFilterCategory')?.value || '';
    const currentStart = document.getElementById('reportFilterStartDate')?.value || '';
    const currentEnd = document.getElementById('reportFilterEndDate')?.value || '';

    const html = `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
                <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Equipe</label>
                <select id="mDrawerReportTeam" onchange="syncMobileReportFilters();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                    <option value="">Todas Equipes</option>
                    ${c && c.teams ? c.teams.map(t => `<option value="${t}" ${t === currentTeam ? 'selected' : ''}>${t}</option>`).join('') : ''}
                </select>
            </div>

            <div class="form-group">
                <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Colaborador</label>
                <select id="mDrawerReportUser" onchange="syncMobileReportFilters();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                    <option value="">Todos Usuários</option>
                    ${users.filter(u => String(u.companyId) === String(currentUser.companyId)).map(u => `<option value="${u.id}" ${String(u.id) === String(currentUserF) ? 'selected' : ''}>${u.name}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Categoria</label>
                <select id="mDrawerReportCategory" onchange="syncMobileReportFilters();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white;">
                    <option value="">Todas Categorias</option>
                    ${(c && (c.categories || defaultCategories)) ? (c.categories || defaultCategories).map(cat => `<option value="${cat}" ${cat === currentCat ? 'selected' : ''}>${cat}</option>`).join('') : ''}
                </select>
            </div>

            <div style="display: flex; gap: 15px; width: 100%;">
                <div class="form-group" style="flex: 1; min-width: 0;">
                    <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">De:</label>
                    <input type="date" id="mDrawerReportStart" value="${currentStart}" onchange="syncMobileReportFilters();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; box-sizing: border-box;">
                </div>
                <div class="form-group" style="flex: 1; min-width: 0;">
                    <label style="display:block; font-size: 11px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">Até:</label>
                    <input type="date" id="mDrawerReportEnd" value="${currentEnd}" onchange="syncMobileReportFilters();" style="width: 100%; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; box-sizing: border-box;">
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button onclick="clearMobileReportFilters(); closeMobileModal();" style="flex: 1; padding: 16px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); color: #ef4444; font-weight: 800; font-size: 13px;">LIMPAR</button>
                <button onclick="closeMobileModal(); generateMobileReport();" style="flex: 2; padding: 16px; border-radius: 12px; border: none; background: #10b981; color: white; font-weight: 800; font-size: 13px;">APLICAR</button>
            </div>
        </div>
    `;

    openMobileModal('Filtros do Relatório', html);
};

window.syncMobileReportFilters = function () {
    const team = document.getElementById('mDrawerReportTeam')?.value;
    const user = document.getElementById('mDrawerReportUser')?.value;
    const cat = document.getElementById('mDrawerReportCategory')?.value;
    const start = document.getElementById('mDrawerReportStart')?.value;
    const end = document.getElementById('mDrawerReportEnd')?.value;

    const fTeam = document.getElementById('reportFilterTeam');
    const fUser = document.getElementById('reportFilterUser');
    const fCat = document.getElementById('reportFilterCategory');
    const fStart = document.getElementById('reportFilterStartDate');
    const fEnd = document.getElementById('reportFilterEndDate');

    if (fTeam) fTeam.value = team || '';
    if (fUser) fUser.value = user || '';
    if (fCat) fCat.value = cat || '';
    if (fStart) fStart.value = start || '';
    if (fEnd) fEnd.value = end || '';
};

window.clearMobileReportFilters = function () {
    const fields = ['reportFilterTeam', 'reportFilterUser', 'reportFilterCategory', 'reportFilterStartDate', 'reportFilterEndDate', 'mDrawerReportTeam', 'mDrawerReportUser', 'mDrawerReportCategory', 'mDrawerReportStart', 'mDrawerReportEnd'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
};

window.generateMobileReport = function () {
    const resEl = document.getElementById('mReportResult');
    if (!resEl) return;

    resEl.innerHTML = '<div style="text-align:center; padding:50px; opacity:0.5;"><i class="fa-solid fa-spinner fa-spin" style="font-size:28px; color:#10b981;"></i><br><br><span style="font-size:13px; font-weight:600;">Processando dados...</span></div>';

    setTimeout(() => {
        if (typeof getFilteredReportData !== 'function') {
            resEl.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5;">Erro ao carregar motor de relatórios.</div>';
            return;
        }

        const data = getFilteredReportData();

        if (data.length === 0) {
            resEl.innerHTML = `
                <div style="text-align:center; padding:60px 20px; display:flex; flex-direction:column; align-items:center; gap:16px;">
                    <div style="width:72px; height:72px; border-radius:50%; background:rgba(100,116,139,0.1); display:flex; align-items:center; justify-content:center;">
                        <i class="fa-solid fa-magnifying-glass" style="font-size:28px; color:#64748b; opacity:0.5;"></i>
                    </div>
                    <p style="font-size:14px; font-weight:600; color:var(--mobile-text); opacity:0.5; margin:0;">Nenhum registro encontrado</p>
                    <p style="font-size:12px; color:var(--mobile-text); opacity:0.35; margin:0;">Tente ajustar os filtros</p>
                </div>`;
            return;
        }

        const statusConfig = {
            concluido:    { label: 'Concluído',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: 'fa-circle-check' },
            andamento:    { label: 'Em Andamento', color: '#eab308', bg: 'rgba(234,179,8,0.12)',   icon: 'fa-spinner' },
            pendente:     { label: 'Pendente',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: 'fa-clock' },
            em_revisao:   { label: 'Em Revisão',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: 'fa-eye' },
            nao_concluido:{ label: 'Expirada',     color: '#991b1b', bg: 'rgba(153,27,27,0.15)',   icon: 'fa-clock-rotate-left' },
        };

        const isDark = document.body.classList.contains('dark-mode');

        const cardsHtml = data.map((a, idx) => {
            const u = users.find(x => String(x.id) === String(a.userId));
            const userName = u ? u.name : 'Membro';
            const st = statusConfig[a.status] || { label: a.status, color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: 'fa-circle' };
            const dateFmt = formatDate(a.date);
            const hue = typeof getCategoryHue === 'function' ? getCategoryHue(a.category || 'Geral') : 200;
            const catColor = `hsl(${hue}, 65%, 55%)`;
            const catBg = `hsla(${hue}, 65%, 55%, 0.12)`;
            const cardBg = isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.95)';
            const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
            const textSecondary = isDark ? '#94a3b8' : '#64748b';
            const accentBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
            const ehDelegada = !!(a.tarefaVinculadaId || a.adminId || a.senderId || a.delegadaPor || a.tipo === 'delegada');
            const souDono = String(a.userId) === String(currentUser.id);
            const isAdmin = currentUser.role === 'admin' || currentUser.role === 'hibrido';
            const podeEditar = isAdmin || souDono;

            const btnEditar = (ehDelegada && !isAdmin)
                ? `<button type="button" style="width:36px;height:36px;border-radius:10px;border:none;background:rgba(100,116,139,0.1);color:#94a3b8;display:flex;align-items:center;justify-content:center;cursor:not-allowed;" title="Bloqueada"><i class="fa-solid fa-lock" style="font-size:13px;"></i></button>`
                : `<button type="button" onclick="openEditModal(${a.id})" style="width:36px;height:36px;border-radius:10px;border:none;background:rgba(59,130,246,0.12);color:#3b82f6;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;" title="Editar"><i class="fa-solid fa-pen" style="font-size:13px;"></i></button>`;

            const btnApagar = (ehDelegada && !isAdmin)
                ? `<button type="button" style="width:36px;height:36px;border-radius:10px;border:none;background:rgba(100,116,139,0.1);color:#94a3b8;display:flex;align-items:center;justify-content:center;cursor:not-allowed;" title="Bloqueada"><i class="fa-solid fa-lock" style="font-size:13px;"></i></button>`
                : `<button type="button" onclick="deleteActivity(${a.id})" style="width:36px;height:36px;border-radius:10px;border:none;background:rgba(239,68,68,0.1);color:#ef4444;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;" title="Apagar"><i class="fa-solid fa-trash" style="font-size:13px;"></i></button>`;

            const btnHistorico = `<button type="button" onclick="openHistoryModal(${a.id})" style="width:36px;height:36px;border-radius:10px;border:none;background:rgba(100,116,139,0.1);color:${textSecondary};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;" title="Histórico"><i class="fa-solid fa-clock-rotate-left" style="font-size:13px;"></i></button>`;

            return `
                <div style="
                    background:${cardBg};
                    border:1px solid ${borderColor};
                    border-radius:20px;
                    padding:18px;
                    margin-bottom:12px;
                    box-shadow: 0 2px 12px rgba(0,0,0,${isDark ? '0.3' : '0.06'});
                    position:relative;
                    overflow:hidden;
                    animation: fadeSlideIn 0.3s ease ${idx * 0.04}s both;
                ">
                    <!-- Accent bar -->
                    <div style="position:absolute;top:0;left:0;width:3px;height:100%;background:${st.color};border-radius:20px 0 0 20px;"></div>

                    <!-- Header: user + date -->
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-left:6px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:40px;height:40px;border-radius:50%;flex-shrink:0;overflow:hidden;border:2px solid ${st.color}40;${u && u.avatarUrl ? `background-image:url('${u.avatarUrl}');background-size:cover;background-position:center;` : `background:linear-gradient(135deg,${catColor},${catBg.replace('0.12','0.5')});display:flex;align-items:center;justify-content:center;`}">
                                ${u && u.avatarUrl ? '' : `<span style="font-size:14px;font-weight:800;color:white;line-height:40px;text-align:center;width:100%;display:block;">${userName.charAt(0).toUpperCase()}</span>`}
                            </div>
                            <div>
                                <p style="margin:0;font-size:14px;font-weight:700;color:${textPrimary};line-height:1.2;">${userName}</p>
                                <p style="margin:0;font-size:11px;color:${textSecondary};margin-top:1px;"><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${dateFmt}</p>
                            </div>
                        </div>
                        <!-- Status badge -->
                        <div style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;background:${st.bg};flex-shrink:0;">
                            <i class="fa-solid ${st.icon}" style="font-size:10px;color:${st.color};"></i>
                            <span style="font-size:11px;font-weight:700;color:${st.color};white-space:nowrap;">${st.label}</span>
                        </div>
                    </div>

                    <!-- Category chip -->
                    <div style="padding-left:6px;margin-bottom:10px;">
                        <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:${catBg};font-size:11px;font-weight:700;color:${catColor};">
                            <i class="fa-solid fa-tag" style="font-size:9px;"></i>
                            ${a.category || 'Geral'}
                        </span>
                    </div>

                    <!-- Title & Description -->
                    <div style="padding-left:6px;margin-bottom:14px;">
                        <p style="margin:0;font-size:15px;font-weight:800;color:${textPrimary};line-height:1.3;margin-bottom:5px;">${a.title || 'Sem título'}</p>
                        ${a.description && a.description !== '-' ? `<p style="margin:0;font-size:12px;color:${textSecondary};line-height:1.5;">${a.description}</p>` : ''}
                    </div>

                    <!-- Divider -->
                    <div style="height:1px;background:${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};margin-bottom:12px;"></div>

                    <!-- Actions row -->
                    <div style="display:flex;justify-content:flex-end;gap:8px;padding-left:6px;">
                        ${btnHistorico}
                        ${podeEditar ? `${btnEditar}${btnApagar}` : `<span style="font-size:11px;color:${textSecondary};opacity:0.6;align-self:center;"><i class="fa-solid fa-lock"></i> Somente Leitura</span>`}
                    </div>
                </div>
            `;
        }).join('');

        resEl.innerHTML = `
            <style>
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            </style>
            <!-- Summary bar -->
            <div style="
                display:flex;align-items:center;gap:10px;
                padding:12px 16px;
                border-radius:14px;
                background:rgba(16,185,129,0.1);
                border:1px solid rgba(16,185,129,0.2);
                margin-bottom:18px;
            ">
                <i class="fa-solid fa-chart-simple" style="color:#10b981;font-size:16px;"></i>
                <span style="font-size:13px;font-weight:700;color:#10b981;">${data.length} registro${data.length !== 1 ? 's' : ''} encontrado${data.length !== 1 ? 's' : ''}</span>
            </div>
            ${cardsHtml}
        `;
    }, 300);
};

window.renderMobileUsers = function (container) {
    if (!container) return;
    const isDark = document.body.classList.contains('dark-mode');

    container.innerHTML = `
        <div class="m-section" style="padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0; font-size: 22px; font-weight: 900; color: var(--mobile-text);">Colaboradores</h2>
                <button onclick="openMobileAddUserModal()" style="background: var(--mobile-primary); color: white; border: none; padding: 10px 15px; border-radius: 12px; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px var(--mobile-primary-shadow);">
                    <i class="fa-solid fa-user-plus"></i> NOVO
                </button>
            </div>
            
            <div id="mUsersList">
                <div style="text-align:center; padding:40px; opacity:0.4;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>
            </div>
        </div>
    `;

    db.collection('usuarios').where('companyId', '==', currentUser.companyId).onSnapshot(snap => {
        let us = [];
        snap.forEach(doc => us.push({ id: doc.id, ...doc.data() }));
        us = us.filter(u => u.active).sort((a, b) => a.name.localeCompare(b.name));

        const list = document.getElementById('mUsersList');
        if (!list) return;

        if (us.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:40px; opacity:0.5;">Nenhum colaborador encontrado.</div>`;
            return;
        }

        list.innerHTML = us.map(u => `
            <div class="m-card" style="margin-bottom: 15px; padding: 18px; display: flex; align-items: center; gap: 15px; position: relative; border: 1px solid var(--mobile-border); background: var(--mobile-card-bg); box-shadow: var(--mobile-card-shadow);">
                <div class="mobile-avatar" style="width: 50px; height: 50px; border-radius: 14px; position: relative; ${u.avatarUrl ? `background-image: url('${u.avatarUrl}'); background-size: cover; color: transparent;` : 'background: rgba(16, 185, 129, 0.1); color: #10b981;'}">
                    ${u.avatarUrl ? '' : u.name.charAt(0).toUpperCase()}
                    <div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #1e293b; background: ${u.isOnline ? '#10b981' : '#64748b'};"></div>
                </div>
                
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <p style="margin: 0; font-weight: 800; font-size: 15px; color: var(--mobile-text);">${esc(u.name)}</p>
                        ${u.role === 'hibrido' ? `
                            <span style="font-size: 8px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 2px 8px; border-radius: 10px; font-weight: 900; display: flex; align-items: center; gap: 3px; letter-spacing: 0.5px;">
                                <i class="fa-solid fa-bolt" style="font-size: 7px;"></i> HÍBRIDO
                            </span>
                        ` : ''}
                    </div>
                    <p style="margin: 3px 0 0; font-size: 11px; color: var(--mobile-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                        <i class="fa-solid fa-people-group" style="margin-right: 4px;"></i> ${esc(u.team || 'Sem Equipe')}
                    </p>
                    <p style="margin: 3px 0 0; font-size: 11px; color: var(--mobile-text-secondary); opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <i class="fa-solid fa-envelope" style="margin-right: 4px;"></i> ${esc(u.email)}
                    </p>
                </div>

                <div style="display: flex; gap: 8px;">
                    <button onclick="openMobileUserAuditModal('${escAttr(u.id)}', '${escAttr(u.name)}')" style="width: 38px; height: 38px; border-radius: 10px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); color: #a855f7; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-list-ul"></i>
                    </button>
                    <button onclick="openMobileEditUserModal('${u.id}')" style="width: 38px; height: 38px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #3b82f6; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </div>
            </div>
        `).join('');
    });
};

window.openMobileUserAuditModal = function (userId, userName) {
    const hojeLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const html = `
        <div style="padding: 10px;">
            <div style="background: var(--mobile-card-bg); padding: 18px; border-radius: 20px; border: 1px solid var(--mobile-border); margin-bottom: 20px; box-shadow: var(--mobile-card-shadow);">
                <div style="margin-bottom: 12px;">
                    <p style="margin: 0; font-size: 10px; color: var(--mobile-text-secondary); text-transform: uppercase; font-weight: 800; letter-spacing: 1px; opacity: 0.6;">Histórico de Ações</p>
                    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 900; color: var(--mobile-text);">${userName}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; background: var(--mobile-input-bg); padding: 10px; border-radius: 12px; border: 1px solid var(--mobile-border);">
                    <i class="fa-solid fa-calendar-day" style="color: var(--mobile-primary); font-size: 14px;"></i>
                    <input type="date" id="mAuditDate" value="${hojeLocal}" onchange="renderMobileAuditList('${userId}')" style="flex: 1; background: transparent; border: none; color: var(--mobile-text); font-size: 14px; font-weight: 700; outline: none;">
                </div>
            </div>

            <div id="mAuditListContainer" style="display: flex; flex-direction: column; gap: 10px; min-height: 200px;">
                <div style="text-align:center; padding:40px; opacity:0.4;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>
            </div>
            <div style="height: 40px;"></div>
        </div>
    `;

    openMobileModal('Auditoria de Ações', html);
    renderMobileAuditList(userId);
};

window.auditSnapshot = null;
window.renderMobileAuditList = function (userId) {
    const dateFiltro = document.getElementById('mAuditDate').value;
    const container = document.getElementById('mAuditListContainer');
    if (!container) return;

    if (window.auditSnapshot) window.auditSnapshot();

    // Tenta buscar tanto como string quanto como number para garantir compatibilidade
    const uid = isNaN(userId) ? userId : Number(userId);

    window.auditSnapshot = db.collection('acessos')
        .where('userId', 'in', [String(userId), uid])
        .onSnapshot(snap => {
            let lista = [];
            snap.forEach(doc => {
                const data = doc.data();
                // Filtro manual de empresa para segurança extra (o 'in' acima já filtra por user)
                if (String(data.companyId) === String(currentUser.companyId)) {
                    lista.push(data);
                }
            });

            if (dateFiltro) {
                lista = lista.filter(item => item.timestamp && item.timestamp.includes(dateFiltro));
            }

            if (lista.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding: 50px 20px; background: var(--mobile-input-bg); border: 1px dashed var(--mobile-border); border-radius: 20px;">
                        <div style="width: 60px; height: 60px; background: rgba(100, 116, 139, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                            <i class="fa-solid fa-ghost" style="font-size: 24px; color: var(--mobile-text-secondary);"></i>
                        </div>
                        <p style="margin: 0; font-size: 14px; color: var(--mobile-text); font-weight: 700;">Nenhuma atividade registrada.</p>
                        <p style="margin: 5px 0 0; font-size: 11px; color: var(--mobile-text-secondary); font-weight: 600;">Selecione outra data para verificar.</p>
                    </div>`;
                return;
            }

            lista.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

            const icones = {
                'LOGIN': { icon: 'fa-right-to-bracket', cor: '#10b981' },
                'CRIAR_ATIVIDADE': { icon: 'fa-plus', cor: '#3b82f6' },
                'ENTREGAR_TAREFA': { icon: 'fa-paper-plane', cor: '#8b5cf6' },
                'DELEGAR_TAREFA': { icon: 'fa-bullseye', cor: '#f59e0b' },
                'EDITAR_ATIVIDADE': { icon: 'fa-pen', cor: '#0ea5e9' },
                'EXCLUIR_ATIVIDADE': { icon: 'fa-trash-can', cor: '#ef4444' },
                'EDITAR_COLABORADOR': { icon: 'fa-user-pen', cor: '#3b82f6' },
                'CRIAR_COLABORADOR': { icon: 'fa-user-plus', cor: '#10b981' },
                'EXCLUIR_COLABORADOR': { icon: 'fa-user-minus', cor: '#ef4444' },
                'DEFAULT': { icon: 'fa-bolt', cor: '#f59e0b' }
            };

            container.innerHTML = lista.map(data => {
                const horaFormatada = data.timestamp?.includes('T') ? data.timestamp.split('T')[1].substring(0, 5) : "--:--";
                const visual = icones[data.acao] || icones['DEFAULT'];

                return `
                    <div style="background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); border-left: 4px solid ${visual.cor}; padding: 16px 18px; border-radius: 16px; display: flex; align-items: start; gap: 14px; box-shadow: var(--mobile-card-shadow);">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${visual.cor}15; color: ${visual.cor}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                            <i class="fa-solid ${visual.icon}"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span style="font-size: 10px; font-weight: 900; color: ${visual.cor}; text-transform: uppercase; letter-spacing: 0.5px;">${data.acao || 'AÇÃO'}</span>
                                <span style="font-size: 11px; font-weight: 800; color: var(--mobile-text-secondary); opacity: 0.6;">${horaFormatada}</span>
                            </div>
                            <p style="margin: 0; font-size: 13px; font-weight: 700; color: var(--mobile-text); line-height: 1.5;">${esc(data.detalhes || 'Ação registrada')}</p>
                        </div>
                    </div>
                `;
            }).join('');
        });
};

window.openMobileAddUserModal = function () {
    const comp = companies.find(c => String(c.id) === String(currentUser.companyId));
    const teams = comp ? (comp.teams || []) : [];

    const html = `
        <div style="padding: 10px;">
            <form id="mAddUserForm" onsubmit="event.preventDefault(); saveMobileNewUser()">
                <div style="margin-bottom: 18px;">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Nome Completo</label>
                    <input type="text" id="mAddUserName" required style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; border-radius: 14px; font-size: 15px; font-weight: 600; outline: none;">
                </div>

                <div style="margin-bottom: 18px;">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">E-mail Corporativo</label>
                    <input type="email" id="mAddUserEmail" required style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; border-radius: 14px; font-size: 15px; font-weight: 600; outline: none;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
                    <div>
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Nível de Acesso</label>
                        <select id="mAddUserRole" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; border-radius: 14px; font-weight: 600; outline: none;">
                            <option value="funcionario">Colaborador</option>
                            <option value="hibrido">Híbrido</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Equipe</label>
                        <select id="mAddUserTeam" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; border-radius: 14px; font-weight: 600; outline: none;">
                            ${teams.map(t => `<option value="${t}">${t}</option>`).join('')}
                            <option value="">Sem Equipe</option>
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Senha Provisória</label>
                    <input type="text" id="mAddUserPass" value="Mudar123" required style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 15px; border-radius: 14px; font-size: 15px; font-weight: 600; outline: none;">
                </div>

                <button type="submit" id="mBtnSaveAddUser" style="width: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px; border-radius: 18px; font-weight: 900; font-size: 16px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); border: none;">
                    <i class="fa-solid fa-user-plus"></i> CRIAR COLABORADOR
                </button>
            </form>
            <div style="height: 40px;"></div>
        </div>
    `;

    openMobileModal('Novo Colaborador', html);
};

window.saveMobileNewUser = async function () {
    const btn = document.getElementById('mBtnSaveAddUser');
    const name = document.getElementById('mAddUserName').value.trim();
    const email = document.getElementById('mAddUserEmail').value.trim().toLowerCase();
    const role = document.getElementById('mAddUserRole').value;
    const team = document.getElementById('mAddUserTeam').value;
    const pass = document.getElementById('mAddUserPass').value.trim();

    if (!name || !email || !pass) return showToast('Preencha os campos obrigatórios', 'error');

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CRIANDO...';

    try {
        // Cria a conta no Firebase Auth (a senha fica no backend, nunca no Firestore)
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        const authUid = cred.user.uid;

        const nUser = {
            id: Date.now(),
            authUid: authUid,
            companyId: currentUser.companyId,
            name: name,
            email: email,
            role: role,
            active: true,
            team: team,
            goCoins: 0,
            xp: 0,
            level: 1,
            isOnline: false
        };

        await Promise.all([
            db.collection('usuarios').doc(nUser.id.toString()).set(nUser),
            db.collection('usuarioAuth').doc(authUid).set({
                userId: nUser.id,
                companyId: nUser.companyId,
                role: nUser.role
            }),
        ]);

        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'CRIAR_COLABORADOR', `Cadastrou o colaborador: ${name}`);
        }

        if (typeof sendWelcomeEmail === 'function') {
            sendWelcomeEmail(name, email, pass);
        }

        showToast('Colaborador criado com sucesso!');
        closeMobileModal();
    } catch (err) {
        console.error(err);
        const map = {
            'auth/email-already-in-use': 'E-mail já cadastrado.',
            'auth/invalid-email': 'E-mail inválido.',
            'auth/weak-password': 'A senha deve ter no mínimo 6 caracteres.'
        };
        showToast(map[err.code] || 'Erro ao criar colaborador', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

window.openMobileEditUserModal = function (id) {
    db.collection('usuarios').doc(String(id)).get().then(doc => {
        if (!doc.exists) return;
        const u = doc.data();
        const comp = companies.find(c => String(c.id) === String(currentUser.companyId));
        const teams = comp ? (comp.teams || []) : [];

        const html = `
            <div style="padding: 10px;">
                <div style="margin-bottom: 20px; text-align: center;">
                    <div class="mobile-avatar" style="width: 70px; height: 70px; margin: 0 auto 10px; border-radius: 20px; font-size: 24px; ${u.avatarUrl ? `background-image: url('${u.avatarUrl}'); background-size: cover; color: transparent;` : 'background: rgba(16, 185, 129, 0.1); color: #10b981;'}">
                        ${u.avatarUrl ? '' : u.name.charAt(0).toUpperCase()}
                    </div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--mobile-text);">${u.name}</h3>
                </div>

                <div style="margin-bottom: 18px;">
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Nome Completo</label>
                    <input type="text" id="mEditUserName" value="${u.name}" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 14px; font-size: 15px; font-weight: 600; outline: none;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
                    <div>
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Nível de Acesso</label>
                        <select id="mEditUserRole" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 14px; font-weight: 600; outline: none;">
                            <option value="funcionario" ${u.role === 'funcionario' ? 'selected' : ''}>Colaborador</option>
                            <option value="hibrido" ${u.role === 'hibrido' ? 'selected' : ''}>Híbrido</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Equipe</label>
                        <select id="mEditUserTeam" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 14px; font-weight: 600; outline: none;">
                            ${teams.map(t => `<option value="${t}" ${u.team === t ? 'selected' : ''}>${t}</option>`).join('')}
                            <option value="" ${!u.team ? 'selected' : ''}>Sem Equipe</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 30px;">
                    <button onclick="deleteUserMobile('${id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-trash-can" style="font-size: 20px;"></i>
                    </button>
                    <button onclick="saveMobileEditUser('${id}')" id="mBtnSaveEditUser" style="flex: 1; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 15px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3); border: none;">
                        <i class="fa-solid fa-floppy-disk"></i> SALVAR ALTERAÇÕES
                    </button>
                </div>
                <div style="height: 40px;"></div>
            </div>
        `;
        openMobileModal('Editar Colaborador', html);
    });
};

window.saveMobileEditUser = async function (id) {
    const btn = document.getElementById('mBtnSaveEditUser');
    const name = document.getElementById('mEditUserName').value.trim();
    const role = document.getElementById('mEditUserRole').value;
    const team = document.getElementById('mEditUserTeam').value;

    if (!name) return showToast('Nome é obrigatório', 'error');

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SALVANDO...';

    try {
        await db.collection('usuarios').doc(String(id)).update({
            name: name,
            role: role,
            team: team
        });

        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EDITAR_COLABORADOR', `Editou o perfil de: ${name}`);
        }

        showToast('Colaborador atualizado!');
        closeMobileModal();
    } catch (err) {
        console.error(err);
        showToast('Erro ao atualizar', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

window.deleteUserMobile = function (id) {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) return;
    db.collection('usuarios').doc(String(id)).get().then(doc => {
        const uName = doc.exists ? doc.data().name : 'Usuário';
        db.collection('usuarios').doc(String(id)).update({ active: false }).then(() => {
            if (window.registrarAcao) {
                window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EXCLUIR_COLABORADOR', `Removeu o colaborador: ${uName}`);
            }
            showToast('Colaborador removido');
            closeMobileModal();
        });
    });
};

window.renderMobileTeams = function (container) {
    if (!container) return;
    const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
    if (!c) {
        container.innerHTML = `<div class="m-section" style="padding: 40px; text-align: center; opacity: 0.5;">Carregando dados da empresa...</div>`;
        return;
    }

    container.innerHTML = `<div class="m-section" style="padding-top: 10px;">
        <h2 style="margin: 0 0 20px 5px; font-size: 22px; font-weight: 900; color: var(--mobile-text);">Equipes</h2>
        <div id="mTeamsList">
            <div style="text-align:center; padding:40px; opacity:0.4;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>
        </div>
    </div>`;

    // Radar de usuários para preencher as equipes em tempo real
    db.collection('usuarios').where('companyId', '==', currentUser.companyId).onSnapshot(snap => {
        let us = [];
        snap.forEach(doc => us.push({ id: doc.id, ...doc.data() }));
        const list = document.getElementById('mTeamsList');
        if (!list) return;

        list.innerHTML = (c.teams || []).map(t => {
            const members = us.filter(u => u.team === t && u.active);
            return `
            <div class="m-card" style="margin-bottom: 20px; padding: 0; background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); box-shadow: var(--mobile-card-shadow); overflow: hidden;">
                <div style="background: rgba(16, 185, 129, 0.05); padding: 18px; border-bottom: 1px solid var(--mobile-border); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: #10b981; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);">
                            <i class="fa-solid fa-people-group"></i>
                        </div>
                        <div>
                            <span style="display: block; font-weight: 900; color: var(--mobile-text); font-size: 16px; letter-spacing: -0.3px;">${t}</span>
                            <span style="display: block; font-size: 11px; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">${members.length} Membros</span>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 10px;">
                    ${members.length > 0 ? members.map(m => `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; margin-bottom: 8px; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border);">
                            <div class="mobile-avatar" style="width: 36px; height: 36px; border-radius: 10px; position: relative; ${m.avatarUrl ? `background-image: url('${m.avatarUrl}'); background-size: cover; color: transparent;` : `background: ${getCategoryStyleString(m.name).includes('--cat-hue') ? 'hsl(var(--cat-hue), 70%, 50%)' : '#10b981'}; color: white;`}">
                                ${m.avatarUrl ? '' : m.name.charAt(0).toUpperCase()}
                                <div style="position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--mobile-card-bg); background: ${m.isOnline ? '#10b981' : '#64748b'};"></div>
                            </div>
                            <div style="flex: 1;">
                                <span style="display: block; font-size: 14px; font-weight: 800; color: var(--mobile-text);">${m.name}</span>
                                <span style="display: block; font-size: 10px; color: var(--mobile-text-secondary); opacity: 0.7;">${m.role === 'admin' ? 'Administrador' : (m.role === 'hibrido' ? 'Híbrido' : 'Colaborador')}</span>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; padding: 20px; opacity: 0.5;">
                            <i class="fa-solid fa-user-slash" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                            <span style="font-size: 12px; font-weight: 600;">Sem membros nesta equipe</span>
                        </div>
                    `}
                </div>
            </div>
            `;
        }).join('');
    });
};

window.openActivityMobile = function (id) {
    console.log("Abrindo atividade:", id);

    // Forçar a busca convertendo tudo para string por segurança
    const targetId = String(id);

    // Busca em atividades (geralmente enviadas ou concluídas)
    let a = activities.find(x => String(x.id) === targetId);

    // Se não achou em atividades, tenta buscar em tarefas delegadas
    if (!a && typeof tarefasDelegadas !== 'undefined') {
        a = tarefasDelegadas.find(x => String(x.id) === targetId);
    }

    if (!a) {
        showToast('Buscando detalhes no banco...', 'info');
        // Tenta buscar no Firestore se não estiver na memória local
        db.collection('tarefas').doc(targetId).get().then(doc => {
            if (doc.exists) {
                renderMobileTaskDetail({ id: doc.id, ...doc.data() });
            } else {
                // Tenta na coleção atividades também
                db.collection('atividades').doc(targetId).get().then(doc2 => {
                    if (doc2.exists) {
                        renderMobileTaskDetail({ id: doc2.id, ...doc2.data() });
                    } else {
                        showToast('Registro não encontrado.', 'error');
                    }
                });
            }
        }).catch(err => {
            console.error("Erro ao abrir atividade:", err);
            showToast('Erro ao carregar detalhes.', 'error');
        });
        return;
    }

    renderMobileTaskDetail(a);
};

function renderMobileTaskDetail(a) {
    const isDark = document.body.classList.contains('dark-mode');
    if (!a) return;

    // Definição única e robusta de tarefa delegada/protegida
    const isDelegated = !!(a.adminId || a.senderId || a.delegadaPor || a.tipo === 'delegada' || a.tarefaVinculadaId || a.origem === 'delegada');
    const isAdmin = isCurrentModeAdmin();
    // Poderes reais (independente do toggle de modo)
    const hasAdminPower = currentUser.role === 'admin' || currentUser.role === 'hibrido';
    const isOwner = String(a.userId) === String(currentUser.id) || String(a.adminId || a.senderId) === String(currentUser.id);
    const isPendente = a.status === 'pendente' || a.status === 'andamento';
    const isConcluido = a.status === 'concluido';

    // Busca dinâmica do remetente real (ou criador pessoal)
    const creatorUser = users.find(u => String(u.id) === String(a.adminId || a.senderId || a.userId));
    const creator = creatorUser ? creatorUser.name : (a.adminName || a.userName || 'Você');

    // Coletar cores baseadas no tema e categoria
    const statusColor = a.status === 'concluido' ? '#10b981' : (a.status === 'em_revisao' ? '#eab308' : '#f59e0b');
    const catStyle = getCategoryStyleString(a.category);
    const catHue = getCategoryHue(a.category);

    const getContrastText = (hue) => {
        if (!isDark && (hue >= 40 && hue <= 85)) return 'hsl(' + hue + ', 80%, 25%)';
        if (!isDark) return 'hsl(' + hue + ', 80%, 35%)';
        return 'white';
    };
    const catTextColor = getContrastText(catHue);

    // Texto da dificuldade se existir
    let diffBadge = '';
    if (a.dificuldade && isAdmin) {
        const diffLabels = { '2': 'Fácil', '3': 'Médio', '4': 'Difícil', 'facil': 'Fácil', 'media': 'Médio', 'dificil': 'Difícil' };
        diffBadge = `<div style="padding: 5px 12px; border-radius: 20px; background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-bolt"></i> ${diffLabels[a.dificuldade] || 'Normal'}
                    </div>`;
    }

    openMobileModal('', `
        <div class="m-detail-view" style="padding: 10px 0;">
            <!-- Header Centralizado -->
            <div style="text-align: center; margin-bottom: 25px;">
                <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: var(--mobile-text);">${esc(a.title)}</h2>
                <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 15px; flex-wrap: wrap;">
                    <div class="m-cat-tag" style="${catStyle}; background: hsla(${catHue}, 70%, 50%, 0.15); color: ${catTextColor}; border: 1px solid hsla(${catHue}, 70%, 50%, 0.3); padding: 5px 12px; font-size: 11px; font-weight: 800; border-radius: 20px;">
                        <i class="fa-solid fa-tag"></i> ${esc(a.category.toUpperCase())}
                    </div>
                    <div style="padding: 5px 12px; border-radius: 20px; background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}40; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                       <i class="fa-solid ${a.status === 'concluido' ? 'fa-check-double' : 'fa-clock'}"></i> ${getStatusText(a.status).toUpperCase()}
                    </div>
                    ${isDelegated ? `
                        <div style="padding: 5px 12px; border-radius: 20px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-user-tie"></i> MISSÃO DELEGADA
                        </div>
                    ` : ''}
                    ${diffBadge}
                </div>
            </div>

            <!-- Seção: Instruções do Gestor -->
            <div style="background: hsla(260, 80%, 65%, 0.08); padding: 22px; border-radius: 22px; margin-bottom: 20px; border: 1px solid hsla(260, 80%, 65%, 0.25);">
                <h4 style="margin: 0 0 12px 0; font-size: 11px; color: #a855f7; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;"><i class="fa-solid fa-quote-left"></i> O QUE DEVE SER FEITO</h4>
                <p style="margin: 0; color: var(--mobile-text); font-size: 15px; line-height: 1.6; opacity: 0.9; white-space: pre-wrap;">${esc(a.description || 'Nenhuma descrição detalhada.')}</p>
                
                ${(a.attachments && a.attachments.length > 0) ? `
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed hsla(260, 80%, 65%, 0.3);">
                        <p style="font-size: 10px; font-weight: 800; color: #a855f7; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px;"><i class="fa-solid fa-paperclip"></i> Materiais de Referência</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${a.attachments.map(an => `
                                <a href="${escAttr(an.url)}" download="${escAttr(an.name)}" style="display: flex; align-items: center; gap: 6px; background: white; color: #a855f7; padding: 6px 12px; border-radius: 10px; text-decoration: none; font-size: 11px; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.2);">
                                    <i class="fa-solid fa-download"></i> ${esc(an.name)}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Grid de Info Base -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 25px;">
                <div style="background: hsla(35, 100%, 50%, 0.08); padding: 18px; border-radius: 18px; border: 1px solid hsla(35, 100%, 50%, 0.25); grid-column: ${isDelegated ? 'span 2' : 'span 1'};">
                    <span style="display:flex; align-items:center; gap: 6px; font-size: 10px; color: #f59e0b; text-transform: uppercase; font-weight: 800; margin-bottom: 6px;"><i class="fa-regular fa-calendar-check"></i> Prazo</span>
                    <strong style="font-size: 14px; color: var(--mobile-text);">${formatDate(a.date)}</strong>
                </div>
                
                <div style="background: hsla(215, 100%, 50%, 0.08); padding: 18px; border-radius: 18px; border: 1px solid hsla(215, 100%, 50%, 0.25);">
                    <span style="display:flex; align-items:center; gap: 6px; font-size: 10px; color: #3b82f6; text-transform: uppercase; font-weight: 800; margin-bottom: 6px;"><i class="fa-solid fa-id-badge"></i> ${isDelegated ? 'Remetente' : 'Feito por'}</span>
                    <strong style="font-size: 14px; color: var(--mobile-text);">${esc(creator)}</strong>
                </div>

                ${isDelegated ? `
                    <div style="background: hsla(160, 100%, 40%, 0.08); padding: 18px; border-radius: 18px; border: 1px solid hsla(160, 100%, 40%, 0.25);">
                        <span style="display:flex; align-items:center; gap: 6px; font-size: 10px; color: #10b981; text-transform: uppercase; font-weight: 800; margin-bottom: 6px;"><i class="fa-solid fa-user-check"></i> Destinatário</span>
                        <strong style="font-size: 14px; color: var(--mobile-text);">${esc(users.find(u => String(u.id) === String(a.userId))?.name || 'Colaborador')}</strong>
                    </div>
                ` : ''}
            </div>

            ${(a.status === 'pendente' && a.feedbackAdmin) ? `
                <!-- PAINEL DE ERRO E FEEDBACK DO GESTOR -->
                <div style="background: rgba(239, 68, 68, 0.08); border: 2px solid rgba(239, 68, 68, 0.2); border-radius: 22px; padding: 22px; margin-bottom: 25px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 11px; color: #ef4444; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;"><i class="fa-solid fa-triangle-exclamation"></i> FEEDBACK DE CORREÇÃO</h4>
                    <p style="margin: 0; color: var(--mobile-text); font-size: 14px; line-height: 1.6; font-weight: 600;">${esc(a.feedbackAdmin)}</p>
                    
                    ${(a.correctionAttachments && a.correctionAttachments.length > 0) ? `
                        <div style="margin-top: 15px; padding-top: 12px; border-top: 1px dashed rgba(239, 68, 68, 0.2);">
                            <p style="font-size: 9px; font-weight: 800; color: #ef4444; text-transform: uppercase; margin-bottom: 8px;">Anexos de Correção (Baixar):</p>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${a.correctionAttachments.map(an => `
                                    <a href="${escAttr(an.url)}" download="${escAttr(an.name)}" style="display: flex; align-items: center; gap: 6px; background: white; color: #ef4444; padding: 6px 12px; border-radius: 8px; text-decoration: none; font-size: 10px; font-weight: 800; border: 1px solid rgba(239, 68, 68, 0.2);">
                                        <i class="fa-solid fa-download"></i> ${esc(an.name)}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            ${isPendente ? `
                <!-- FORMULÁRIO DE RESPOSTA (IGUAL AO DESKTOP AQUI DENTRO) -->
                <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); padding: 22px; border-radius: 22px;">
                    <h4 style="margin: 0 0 20px 0; font-size: 13px; color: #10b981; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;"><i class="fa-solid fa-cloud-arrow-up"></i> Sua Entrega</h4>
                    
                    <form onsubmit="event.preventDefault(); submitMobileResponse('${a.id}')">
                        <div class="m-form-group" style="margin-bottom: 15px;">
                            <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">Título da Entrega</label>
                            <input type="text" id="mRespTitle" class="form-control" value="${escAttr(a.tituloEntrega || a.title)}" required style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; width: 100%; outline: none; transition: 0.2s;">
                        </div>

                        <div style="margin-bottom: 15px;">
                            <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">Quantidade Realizada (Opcional)</label>
                            <input type="number" id="mRespQtd" class="form-control" value="${a.quantidade || ''}" placeholder="Ex: 100" style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; width: 100%; outline: none;">
                        </div>

                        <div class="m-form-group" style="margin-bottom: 15px;">
                            <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">Observações / Comentários</label>
                            <textarea id="mRespObs" class="form-control" rows="3" style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; width: 100%; height: 90px; resize: none; outline: none;">${esc(a.respostaFuncionario || '')}</textarea>
                        </div>

                        <div class="m-form-group" style="margin-bottom: 20px;">
                            <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">Anexar Arquivos (Máx. 3)</label>
                            <div id="mFileArea" style="background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 14px; padding: 22px; text-align: center; position: relative; transition: 0.2s;">
                                <input type="file" id="mRespFiles" multiple style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;" onchange="handleMobileFileSelection(this)">
                                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 28px; color: #10b981; margin-bottom: 10px;"></i>
                                <p style="margin: 0; font-size: 12px; color: var(--mobile-text); opacity: 0.7;">Toque para escolher arquivos</p>
                            </div>
                            <div id="mRespFilesList" style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;"></div>
                        </div>

                        <button type="submit" id="mBtnSubmitResp" class="btn btn-mobile-primary" style="width: 100%; padding: 18px; border-radius: 18px; font-weight: 900; background: #10b981; color: white; border: none; font-size: 16px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);">
                            <i class="fa-solid fa-paper-plane"></i> ENVIAR ENTREGA
                        </button>
                    </form>
                </div>
            ` : (a.status === 'em_revisao' && isAdmin ? `
                <!-- PAINEL DE REVISÃO DO ADMIN (PARIDADE DESKTOP) -->
                <div style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); padding: 22px; border-radius: 22px;">
                    <h4 style="margin: 0 0 20px 0; font-size: 13px; color: #3b82f6; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;"><i class="fa-solid fa-clipboard-check"></i> Revisão de Entrega</h4>
                    
                    <!-- Volume Entregue -->
                    <div style="background: rgba(16, 185, 129, 0.08); border: 2px dashed rgba(16, 185, 129, 0.3); border-radius: 15px; padding: 15px; text-align: center; margin-bottom: 15px;">
                        <span style="font-size: 10px; color: #10b981; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 5px;"><i class="fa-solid fa-up-right-and-down-left-from-center"></i> Volume Entregue</span>
                        <strong style="font-size: 28px; color: var(--mobile-text);">${a.quantidade || '0'}</strong>
                    </div>

                    <!-- Mensagem do Colaborador -->
                    <div style="margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 8px;">Mensagem do Colaborador</span>
                        <p style="margin: 0; font-size: 14px; color: var(--mobile-text); line-height: 1.5; opacity: 0.9;">${esc(a.respostaFuncionario || 'Nenhuma observação enviada.')}</p>
                    </div>

                    <!-- Anexos da Entrega -->
                    ${(a.attachments && a.attachments.length > 0) ? `
                        <div style="margin-bottom: 25px;">
                            <span style="font-size: 10px; color: #94a3b8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 10px;">Anexos da Entrega (Baixar)</span>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${a.attachments.map(an => `
                                    <a href="${escAttr(an.url)}" download="${escAttr(an.name)}" style="background: white; color: #10b981; padding: 8px 15px; border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.2); font-size: 11px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 6px;">
                                        <i class="fa-solid fa-download"></i> ${esc(an.name)}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <div style="height: 1px; background: rgba(59, 130, 246, 0.1); margin: 25px 0;"></div>

                    <!-- Feedback de Correção -->
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;"><i class="fa-solid fa-triangle-exclamation"></i> Feedback caso esteja incorreto</label>
                        <textarea id="mRevFeedback" placeholder="Descreva o que o funcionário precisa corrigir..." style="padding: 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); color: white; width: 100%; height: 80px; resize: none; outline: none;"></textarea>
                    </div>

                    <!-- Anexos de Correção -->
                    <div style="margin-bottom: 25px;">
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;"><i class="fa-solid fa-paperclip"></i> Anexar arquivos de correção</label>
                        <div id="mFileAreaRev" style="background: rgba(239, 68, 68, 0.05); border: 2px dashed rgba(239, 68, 68, 0.3); border-radius: 14px; padding: 22px; text-align: center; position: relative; transition: 0.2s;">
                            <input type="file" id="mRevFiles" multiple style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;" onchange="handleMobileFileSelectionRev(this)">
                            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 28px; color: #ef4444; margin-bottom: 10px;"></i>
                            <p style="margin: 0; font-size: 12px; color: var(--mobile-text); opacity: 0.7;">Toque para anexar arquivos</p>
                        </div>
                        <div id="mRevFilesList" style="margin-top: 10px; display: flex; flex-direction: column; gap: 5px;"></div>
                    </div>

                    <!-- Classificação -->
                    <div style="margin-bottom: 30px; text-align: center;">
                        <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;"><i class="fa-solid fa-star"></i> Classifique a Qualidade</label>
                        <div id="mStarRating" style="display: flex; justify-content: center; gap: 10px; font-size: 28px; color: rgba(255,255,255,0.1);">
                            <i class="fa-solid fa-star" onclick="setMobileRevRating(1)" style="cursor: pointer;"></i>
                            <i class="fa-solid fa-star" onclick="setMobileRevRating(2)" style="cursor: pointer;"></i>
                            <i class="fa-solid fa-star" onclick="setMobileRevRating(3)" style="cursor: pointer;"></i>
                            <i class="fa-solid fa-star" onclick="setMobileRevRating(4)" style="cursor: pointer;"></i>
                            <i class="fa-solid fa-star" onclick="setMobileRevRating(5)" style="cursor: pointer;"></i>
                        </div>
                    </div>

                    <!-- Ações -->
                    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px;">
                        <button onclick="submitMobileRevision('${a.id}', 'devolver')" style="padding: 18px; border-radius: 15px; font-weight: 800; background: #ef4444; color: white; border: none; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-rotate-left"></i> DEVOLVER
                        </button>
                        <button onclick="submitMobileRevision('${a.id}', 'aprovar')" style="padding: 18px; border-radius: 15px; font-weight: 900; background: #10b981; color: white; border: none; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-check-double"></i> APROVAR
                        </button>
                    </div>
                </div>
            ` : `
                <!-- Visão de Entrega Concluída -->
                <div style="background: hsla(160, 80%, 45%, 0.1); border: 2px dashed hsla(160, 80%, 45%, 0.3); padding: 22px; border-radius: 22px;">
                    <h4 style="margin: 0 0 18px 0; font-size: 15px; color: #10b981; font-weight: 900; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-circle-check"></i> SUA ENTREGA</h4>
                    
                    <div style="margin-bottom: 15px;">
                        <span style="display:block; font-size: 10px; color: #10b981; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; opacity: 0.8;">Título e Volume</span>
                        <p style="margin: 0; font-size: 15px; color: var(--mobile-text); font-weight: 700;">${esc(a.tituloEntrega || a.title)} ${a.quantidade ? `(${a.quantidade})` : ''}</p>
                    </div>

                    <div style="margin-bottom: 18px;">
                        <span style="display:block; font-size: 10px; color: #10b981; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; opacity: 0.8;">Observações enviadas</span>
                        <p style="margin: 0; font-size: 14px; color: var(--mobile-text-secondary); line-height: 1.6;">${esc(a.respostaFuncionario || 'Nenhum comentário adicional.')}</p>
                    </div>

                    ${((a.attachments && a.attachments.length > 0) || a.attachmentUrl) ? `
                        <button onclick="openAttachmentModal('${a.id}')" style="width: 100%; background: hsla(215, 90%, 50%, 0.1); border: 1px solid hsla(215, 90%, 50%, 0.3); color: #3b82f6; padding: 14px; border-radius: 15px; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-paperclip"></i> VER ARQUIVOS ENVIADOS
                        </button>
                    ` : ''}

                    ${// Lógica de Bloqueio Pro: 
        // 1. Se estiver no modo Admin, sempre pode.
        // 2. Se for uma tarefa DELEGADA e estiver CONCLUÍDA, colaborador NÃO pode (mesmo que seja o dono).
        // 3. Se for pessoal (não delegada), o dono pode.
        (isAdmin || (!isDelegated && isOwner) || (!isConcluido && isOwner)) ? `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(16, 185, 129, 0.1); display: flex; gap: 10px;">
                            <button onclick="openMobileEditModal('${a.id}')" style="flex: 1; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.3); color: #0ea5e9; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fa-solid fa-pen"></i> EDITAR
                            </button>
                            <button onclick="closeMobileModal(); deleteActivity('${a.id}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    ` : `
                        <div style="margin-top: 15px; padding: 12px; border-radius: 12px; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 11px; font-weight: 700; color: var(--mobile-text-secondary); opacity: 0.6; border: 1px dashed rgba(255,255,255,0.05);">
                            <i class="fa-solid fa-lock"></i> EDIÇÃO BLOQUEADA (GESTÃO)
                        </div>
                    `}
                </div>
            `)}
        </div>
    `);
}

window.markMobileComplete = function (id) {
    db.collection('atividades').doc(id.toString()).update({ status: 'concluido' }).then(() => {
        showToast('Atividade concluída!');
        closeMobileModal();
        if (typeof refreshLiveData === 'function') refreshLiveData();
    });
};

window.openMobileNewTask = function () {
    openMobileModal('Nova Atividade', `
        <form id="mobileNewTaskForm" style="display: flex; flex-direction: column; gap: 15px;">
            <div class="form-group">
                <label>Data</label>
                <input type="date" id="mNewDate" required value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Título</label>
                <input type="text" id="mNewTitle" placeholder="O que você fez?" required>
            </div>
            <div class="form-group">
                <label>Categoria</label>
                <select id="mNewCategory">
                    ${defaultCategories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <textarea id="mNewDesc" rows="3" placeholder="Detalhes opcionais..."></textarea>
            </div>
            <button type="submit" class="btn btn-mobile-primary" style="margin-top: 10px;">Salvar Atividade</button>
        </form>
    `);

    document.getElementById('mobileNewTaskForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const nTask = {
            id: Date.now(),
            userId: currentUser.id,
            companyId: currentUser.companyId,
            date: document.getElementById('mNewDate').value,
            title: document.getElementById('mNewTitle').value,
            category: document.getElementById('mNewCategory').value,
            description: document.getElementById('mNewDesc').value,
            status: 'concluido',
            createdAt: new Date().toISOString()
        };

        db.collection('atividades').doc(nTask.id.toString()).set(nTask).then(() => {
            if (window.registrarAcao) {
                window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'CRIAR_ATIVIDADE', `Registrou a atividade: ${nTask.title}`);
            }
            showToast('Atividade salva!');
            closeMobileModal();
            if (typeof refreshLiveData === 'function') refreshLiveData();
        });
    });
};

function renderMobileProfile(container) {
    const isAdmin = currentUser.role === 'admin' || (currentUser.role === 'hibrido' && (localStorage.getItem('feedbackgo_modo_hibrido') || 'admin') === 'admin');

    container.innerHTML = `
        <div class="m-settings-list">
        <div class="m-settings-header" style="margin-bottom: 30px; background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); border-radius: 24px; padding: 24px; box-shadow: var(--mobile-card-shadow); display: flex; align-items: center; gap: 20px;">
            ${(() => {
                const c = companies.find(x => String(x.id) === String(currentUser.companyId));
                let pat = null;
                if (c && c.gamificationEnabled && typeof getPatente === 'function') {
                    pat = getPatente(currentUser.level || 1);
                }
                const avatarColor = pat ? pat.cor : 'var(--mobile-primary)';
                const roleBadge = currentUser.role === 'hibrido' ?
                    `<span style="font-size: 9px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b; padding: 4px 10px; border-radius: 10px; font-weight: 900; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.5px;"><i class="fa-solid fa-bolt"></i> HÍBRIDO</span>` :
                    `<span style="font-size: 9px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 4px 10px; border-radius: 10px; font-weight: 900; display: inline-block; letter-spacing: 0.5px;">${currentUser.role.toUpperCase()}</span>`;
                const patBadge = pat ? `<span style="font-size: 9px; background: ${pat.cor}15; border: 1px solid ${pat.cor}30; color: ${pat.cor}; padding: 4px 10px; border-radius: 10px; font-weight: 900; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.5px;"><img src="${pat.imagem}" style="width: 12px; height: 12px; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));" onerror="this.style.display='none'"> ${pat.nome}</span>` : '';

                return `
                    <div class="m-settings-avatar" style="width: 64px; height: 64px; flex-shrink: 0; box-shadow: 0 0 0 4px var(--mobile-bg), 0 0 0 6px ${avatarColor}50; ${currentUser.avatarUrl ? `background-image: url('${safeUrl(currentUser.avatarUrl)}'); background-size: cover; color: transparent;` : ''}">${esc(currentUser.name.charAt(0).toUpperCase())}</div>
                    <div class="m-settings-user-info" style="flex: 1; min-width: 0;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: var(--mobile-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.5px;">${esc(currentUser.name)}</h3>
                        <p style="margin: 2px 0 10px 0; font-size: 12px; color: var(--mobile-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${esc(currentUser.email)}</p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${roleBadge}
                            ${patBadge}
                        </div>
                    </div>
                `;
            })()}
        </div>

            <div class="m-settings-group">
                ${isAdmin ? `
                <div class="m-settings-item" onclick="showMobileCompanySettings()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-building"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Empresa & Categorias</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
                ` : ''}

                <div class="m-settings-item" onclick="showMobileProfileDetail()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-user-astronaut"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Perfil & Avatar</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>

                <div class="m-settings-item" onclick="showMobileAppearance()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-desktop"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Aparência</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>

                ${isAdmin ? `
                <div class="m-settings-item" onclick="showMobileGamification()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-gamepad"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Gamificação</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>

                <div class="m-settings-item" onclick="showMobileSpendingControl()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-credit-card"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Controle de Gastos</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>

                <div class="m-settings-item" onclick="showMobileExtraFunctions()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-puzzle-piece"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Funções Extras</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
                ` : ''}

                <div class="m-settings-item" onclick="showMobileLicenses()">
                    <div class="m-settings-icon">
                        <i class="fa-solid fa-scale-balanced"></i>
                    </div>
                    <div class="m-settings-label">
                        <span>Licenças & Sobre</span>
                    </div>
                    <i class="fa-solid fa-chevron-right"></i>
                </div>
            </div>

            <div class="m-settings-group" style="margin-top: 30px;">
                <div class="m-settings-item" onclick="logout()" style="justify-content: center; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; color: #ef4444;">
                    <i class="fa-solid fa-right-from-bracket" style="margin-right: 10px;"></i>
                    <span style="font-weight: 700;">SAIR DA CONTA</span>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; opacity: 0.2; font-size: 10px;">
                <p>FeedbackGo Enterprise • v2.1.0</p>
            </div>
        </div>
    `;
}

// =======================================================
// ESTÚDIO DE AVATARES FUNCIONÁRIO - MOBILE
// =======================================================
const __v = (c) => Array.from({ length: c }, (_, i) => `variant${String(i + 1).padStart(2, '0')}`);
const loreleiConfigFuncMobile = {
    f1: { prop: 'hair', values: __v(48) },
    f2: { prop: 'eyes', values: __v(24) },
    f3: { prop: 'mouth', values: ["happy01", "happy02", "happy03", "happy04", "happy05", "happy06", "happy07", "happy08", "happy18", "happy09", "happy10", "happy11", "happy12", "happy13", "happy14", "happy17", "happy15", "happy16", "sad01", "sad02", "sad03", "sad04", "sad05", "sad06", "sad07", "sad08", "sad09"] },
    f4: { prop: 'glasses', values: __v(5) }
};

let mAvatarState = { f1: 0, f2: 0, f3: 0, f4: -1, backgroundColor: 'b6e3f4', skinColor: 'ffdbb4', hairColor: '2a2a2a' };

window.changeAvatarValueMobile = function (traco, direcao) {
    const opcoes = loreleiConfigFuncMobile[traco].values;
    let minIdx = (traco === 'f4') ? -1 : 0;

    mAvatarState[traco] += direcao;
    if (mAvatarState[traco] > opcoes.length - 1) mAvatarState[traco] = minIdx;
    if (mAvatarState[traco] < minIdx) mAvatarState[traco] = opcoes.length - 1;

    const lbl = document.getElementById(`lbl_${traco}`);
    if (lbl) lbl.innerText = mAvatarState[traco] === -1 ? 0 : (traco === 'f4' ? mAvatarState[traco] + 1 : mAvatarState[traco]);

    updateMobileAvatarPreview();
};

window.updateSelectedAvatarColor = function (key, hexColor) {
    mAvatarState[key] = hexColor.replace('#', '');
    const circle = document.getElementById(`circ-${key}`);
    if (circle) circle.style.background = '#' + mAvatarState[key];
    updateMobileAvatarPreview();
};

function getLoreleiUrlMobile() {
    let gVal = mAvatarState.f4 === -1 ? 'variant01' : loreleiConfigFuncMobile.f4.values[mAvatarState.f4];
    return `https://api.dicebear.com/9.x/lorelei/svg?seed=Func&backgroundColor=${mAvatarState.backgroundColor}&skinColor=${mAvatarState.skinColor}&hairColor=${mAvatarState.hairColor}&hair=${loreleiConfigFuncMobile.f1.values[mAvatarState.f1]}&eyes=${loreleiConfigFuncMobile.f2.values[mAvatarState.f2]}&mouth=${loreleiConfigFuncMobile.f3.values[mAvatarState.f3]}&glasses=${gVal}&glassesProbability=${mAvatarState.f4 === -1 ? 0 : 100}`;
}


window.updateMobileAvatarPreview = function () {
    const img = document.getElementById('mAvatarPreview');
    if (img) img.src = getLoreleiUrlMobile();
};



window.showMobileProfileDetail = function () {
    if (currentUser && currentUser.avatarUrl && currentUser.avatarUrl.includes('lorelei')) {
        try {
            const urlObj = new URL(currentUser.avatarUrl);
            const getIdx = (param, arr) => {
                const idx = arr.indexOf(urlObj.searchParams.get(param) || '');
                return idx !== -1 ? idx : 0;
            };
            mAvatarState.f1 = getIdx('hair', loreleiConfigFuncMobile.f1.values);
            mAvatarState.f2 = getIdx('eyes', loreleiConfigFuncMobile.f2.values);
            mAvatarState.f3 = getIdx('mouth', loreleiConfigFuncMobile.f3.values);

            const glassesVal = urlObj.searchParams.get('glasses');
            const glassesProb = urlObj.searchParams.get('glassesProbability');
            if (glassesProb === '0' || !glassesVal || glassesVal === 'none') {
                mAvatarState.f4 = -1;
            } else {
                mAvatarState.f4 = loreleiConfigFuncMobile.f4.values.indexOf(glassesVal);
                if (mAvatarState.f4 === -1) mAvatarState.f4 = 0;
            }

            mAvatarState.backgroundColor = (urlObj.searchParams.get('backgroundColor') || 'b6e3f4').replace('#', '');
            mAvatarState.skinColor = (urlObj.searchParams.get('skinColor') || 'ffdbb4').replace('#', '');
            mAvatarState.hairColor = (urlObj.searchParams.get('hairColor') || '2a2a2a').replace('#', '');
        } catch (e) { }
    }

    const accordionStyles = `
        .m-accordion { background: #0f172a; border-radius: 16px; margin-bottom: 15px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .m-accordion-header { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: rgba(255,255,255,0.02); }
        .m-accordion-header:active { background: rgba(255,255,255,0.05); }
        .m-accordion-title { font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 12px; }
        .m-accordion-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .m-accordion-content { padding: 20px; display: none; border-top: 1px solid rgba(255,255,255,0.05); background: #0f172a; }
        .m-accordion.open .m-accordion-content { display: block; }
        .acc-icon { transition: transform 0.3s ease; color: #64748b; }
        .m-input-label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; }
        .m-dark-input { width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-weight: 700; outline: none; font-size: 16px; transition: 0.2s; }
        .m-dark-input:focus { border-color: #10b981; }
    `;

    const html = `
        <style>${accordionStyles}</style>
        <div class="settings-detail-view" style="padding: 15px; max-height: 85vh; overflow-y: auto; padding-bottom: 100px;">
            
            <!-- Accordion: Dados da Conta -->
            <div class="m-accordion">
                <div class="m-accordion-header" onclick="window.toggleMobileAccordion(this)">
                    <div class="m-accordion-title">
                        <div class="m-accordion-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;"><i class="fa-solid fa-id-card"></i></div>
                        Dados da Conta
                    </div>
                    <i class="fa-solid fa-chevron-down acc-icon"></i>
                </div>
                <div class="m-accordion-content">
                    <div style="margin-bottom: 20px;">
                        <label class="m-input-label">Seu Nome</label>
                        <input type="text" id="mProfileName" value="${currentUser.name}" class="m-dark-input" placeholder="Como quer ser chamado?">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label class="m-input-label">Senha Atual</label>
                        <input type="password" id="mProfileOldPass" placeholder="••••••••" class="m-dark-input">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label class="m-input-label">Nova Senha (opcional)</label>
                        <input type="password" id="mProfileNewPass" placeholder="••••••••" class="m-dark-input">
                    </div>

                    <div>
                        <label class="m-input-label">Confirme a Nova Senha</label>
                        <input type="password" id="mProfileNewPassConfirm" placeholder="••••••••" class="m-dark-input">
                    </div>
                </div>
            </div>

            <div class="m-card" style="margin-bottom: 25px; border: 1px solid rgba(16, 185, 129, 0.2); background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 100%); padding: 25px; border-radius: 16px;">
                
                <div style="text-align: center; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 25px 0; font-size: 20px; font-weight: 900; color: #10b981; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fa-solid fa-user-astronaut"></i> Criador de Avatar
                    </h3>
                    
                    <div style="position: relative; display: inline-block; margin-bottom: 25px;">
                        <img id="mAvatarPreview" src="${getLoreleiUrlMobile()}" style="width: 180px; height: 180px; background: #2c1b18; border-radius: 30px; border: 4px solid rgba(16, 185, 129, 0.3); box-shadow: 0 15px 35px rgba(16, 185, 129, 0.2);">
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.2); padding: 15px 25px; border-radius: 20px; display: inline-flex; flex-direction: column; align-items: center; border: 1px solid rgba(255,255,255,0.02);">
                        <span style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 12px; letter-spacing: 1px;">CORES PRINCIPAIS</span>
                        <div style="display: flex; gap: 20px;">
                            ${['backgroundColor', 'skinColor', 'hairColor'].map(k => `
                                <div style="text-align: center; position: relative;">
                                    <input type="color" value="#${mAvatarState[k]}" oninput="updateSelectedAvatarColor('${k}', this.value)" style="position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 40px; height: 40px; opacity: 0; cursor: pointer; z-index: 2;">
                                    <div id="circ-${k}" style="width: 40px; height: 40px; border-radius: 50%; background: #${mAvatarState[k]}; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-bottom: 8px; position: relative; z-index: 1;"></div>
                                    <span style="font-size: 9px; font-weight: 800; opacity: 0.8; color: #fff;">${k === 'backgroundColor' ? 'Fundo' : k === 'skinColor' ? 'Pele' : 'Cabelo'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div>
                    <span style="display:block; font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 15px; letter-spacing: 1px; text-transform: uppercase;">Aparência</span>
                    <div style="display: grid; gap: 12px;">
                        ${[
            { label: 'Cabelo', icon: 'fa-scissors', key: 'f1' },
            { label: 'Olhos', icon: 'fa-eye', key: 'f2' },
            { label: 'Boca', icon: 'fa-face-smile', key: 'f3' },
            { label: 'Óculos', icon: 'fa-glasses', key: 'f4' }
        ].map(it => `
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between;">
                                <div style="display:flex; align-items:center; gap:12px; font-size:14px; font-weight:700; color: #fff;">
                                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center;">
                                        <i class="fa-solid ${it.icon}"></i>
                                    </div>
                                    ${it.label}
                                </div>
                                <div style="display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.02);">
                                    <button onclick="changeAvatarValueMobile('${it.key}', -1)" style="background: transparent; border: none; color: #94a3b8; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-minus"></i></button>
                                    <span id="lbl_${it.key}" style="width: 25px; text-align: center; font-weight: 900; font-size: 15px; color: #10b981;">${mAvatarState[it.key]}</span>
                                    <button onclick="changeAvatarValueMobile('${it.key}', 1)" style="background: rgba(16, 185, 129, 0.15); border: none; color: #10b981; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;"><i class="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 15px 20px 25px; background: linear-gradient(0deg, var(--mobile-bg) 70%, transparent 100%); z-index: 10;">
            <button class="btn btn-mobile-primary" onclick="saveMobileProfileInfo()" style="width: 100%; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.4);">
                SALVAR ALTERAÇÕES
            </button>
        </div>
    `;
    openMobileModal('Perfil & Avatar', html);
};

window.saveMobileProfileInfo = async function () {
    const btn = event.currentTarget;
    const name = document.getElementById('mProfileName').value.trim();
    const oldPass = document.getElementById('mProfileOldPass').value.trim();
    const newPass = document.getElementById('mProfileNewPass').value.trim();
    const newPassConfirm = document.getElementById('mProfileNewPassConfirm').value.trim();
    const avatarUrl = getLoreleiUrlMobile();

    if (!name) return showToast('Nome é obrigatório', 'error');

    let updateData = { name: name, avatarUrl: avatarUrl };

    if (newPass || oldPass || newPassConfirm) {
        if (!oldPass) return showToast('Digite a senha atual para alterar', 'error');
        if (!newPass) return showToast('Digite a nova senha', 'error');
        if (newPass !== newPassConfirm) return showToast('As novas senhas não coincidem', 'error');
        if (newPass.length < 6) return showToast('A nova senha deve ter no mínimo 6 caracteres', 'warning');
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> SALVANDO...';

    try {
        if (newPass) {
            // Reautentica com a senha atual (validada no Firebase Auth) e troca a senha
            const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPass);
            await firebase.auth().currentUser.reauthenticateWithCredential(cred);
            await firebase.auth().currentUser.updatePassword(newPass);
        }

        await db.collection('usuarios').doc(String(currentUser.id)).update(updateData);

        currentUser.name = name;
        currentUser.avatarUrl = avatarUrl;

        const avatarEl = document.getElementById('mobileUserAvatar');
        if (avatarEl) {
            avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.innerText = '';
        }
        const miniAvatar = document.querySelector('.m-settings-avatar');
        if (miniAvatar) {
            miniAvatar.innerHTML = '';
            miniAvatar.style.backgroundImage = `url('${avatarUrl}')`;
            miniAvatar.style.backgroundSize = 'cover';
        }

        showToast('Perfil atualizado com sucesso!', 'success');
        closeMobileModal();
    } catch (err) {
        console.error(err);
        const map = {
            'auth/wrong-password': 'Senha atual incorreta.',
            'auth/invalid-credential': 'Senha atual incorreta.',
            'auth/requires-recent-login': 'Faça login novamente antes de alterar a senha.',
            'auth/weak-password': 'A nova senha deve ter no mínimo 6 caracteres.'
        };
        showToast(map[err.code] || 'Erro ao salvar perfil', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
};

// Sub-abas de Configuração Atualizadas
window.showMobileCompanySettings = function () {
    const comp = companies.find(c => c.id === currentUser.companyId) || { name: 'Minha Empresa', categories: [] };
    const categories = comp.categories || [];

    const html = `
        <div class="settings-detail-view" style="padding: 10px;">
            <!-- Dados da Empresa -->
            <div class="m-card" style="margin-bottom: 25px; border: 1px solid var(--mobile-border); background: var(--mobile-card-bg); box-shadow: var(--mobile-card-shadow);">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid var(--mobile-border);">
                    <i class="fa-solid fa-building" style="color:var(--mobile-primary);"></i>
                    <h3 style="margin:0; font-size:16px; color: var(--mobile-text);">Dados da Empresa</h3>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display:block; font-size:11px; color: var(--mobile-text-secondary); margin-bottom:5px; text-transform:uppercase; font-weight: 800; letter-spacing: 0.5px;">Nome da Empresa</label>
                    <input type="text" id="mCompanyName" value="${comp.name}" style="width:100%; padding:12px; background: var(--mobile-input-bg); border:1px solid var(--mobile-border); border-radius:12px; color: var(--mobile-text); font-weight:600; outline:none; font-size: 14px;">
                </div>
                
                <button onclick="saveMobileCompanyInfo()" class="btn btn-mobile-primary" style="padding:10px 20px; font-size:13px; border-radius:12px;">
                    <i class="fa-solid fa-floppy-disk"></i> Guardar Alterações
                </button>
            </div>

            <!-- Gerenciar Categorias -->
            <div class="m-card" style="border: 1px solid var(--mobile-border); background: var(--mobile-card-bg); box-shadow: var(--mobile-card-shadow);">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid var(--mobile-border);">
                    <i class="fa-solid fa-tags" style="color:var(--mobile-primary);"></i>
                    <h3 style="margin:0; font-size:16px; color: var(--mobile-text);">Gerenciar Categorias</h3>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 12px;">
                        <div>
                            <label style="display:block; font-size:10px; color: var(--mobile-text-secondary); margin-bottom:5px; text-transform:uppercase; font-weight: 800; letter-spacing: 0.5px;">Grupo</label>
                            <input type="text" id="mNewCategoryGroup" placeholder="Ex: TI" style="width:100%; padding:12px; background: var(--mobile-input-bg); border:1px solid var(--mobile-border); border-radius:12px; color: var(--mobile-text); outline:none; font-size: 14px;">
                        </div>
                        <div>
                            <label style="display:block; font-size:10px; color: var(--mobile-text-secondary); margin-bottom:5px; text-transform:uppercase; font-weight: 800; letter-spacing: 0.5px;">Serviço</label>
                            <input type="text" id="mNewCategoryService" placeholder="Ex: Suporte" style="width:100%; padding:12px; background: var(--mobile-input-bg); border:1px solid var(--mobile-border); border-radius:12px; color: var(--mobile-text); outline:none; font-size: 14px;">
                        </div>
                    </div>
                    <button onclick="addMobileCategory()" class="btn btn-mobile-primary" style="padding:10px 20px; font-size:13px; border-radius:12px; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-plus"></i> Adicionar
                    </button>
                </div>

                <div style="background: var(--mobile-input-bg); padding:15px; border-radius:14px; border:1px solid var(--mobile-border);">
                    ${(() => {
            const isDark = document.body.classList.contains('dark-mode');
            const groups = {};
            categories.forEach(cat => {
                let g = 'Outros', sub = cat;
                if (cat.includes(' - ')) {
                    const parts = cat.split(' - ');
                    g = parts[0].trim();
                    sub = parts[1].trim();
                }
                if (!groups[g]) groups[g] = [];
                groups[g].push({ full: cat, name: sub });
            });

            if (Object.keys(groups).length === 0) {
                return '<div style="text-align:center; padding:20px; opacity:0.5; font-size:13px; color: var(--mobile-text-secondary);">Nenhuma categoria cadastrada.</div>';
            }

            let out = '';
            Object.keys(groups).forEach(g => {
                out += '<div style="margin-bottom: 15px;">';
                out += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:12px; font-weight: 800; color: var(--mobile-text); border-bottom: 1px solid var(--mobile-border); padding-bottom: 8px;">';
                out += '<i class="fa-solid fa-layer-group" style="color: var(--mobile-primary);"></i> ' + esc(g);
                out += '</div>';
                out += '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
                groups[g].forEach(item => {
                    const hue = getCategoryHue(item.full);
                    const tagBg = isDark ? 'hsla(' + hue + ', 70%, 50%, 0.15)' : 'hsla(' + hue + ', 80%, 95%, 1)';
                    const tagBorder = isDark ? 'hsla(' + hue + ', 70%, 50%, 0.4)' : 'hsla(' + hue + ', 70%, 70%, 0.5)';
                    const tagColor = isDark ? 'hsla(' + hue + ', 70%, 75%, 1)' : 'hsla(' + hue + ', 60%, 35%, 1)';
                    const safeName = item.full.replace(/'/g, "\\'");
                    out += '<div style="background:' + tagBg + '; border:1px solid ' + tagBorder + '; color:' + tagColor + '; padding:6px 12px; border-radius:20px; font-size:11px; font-weight:700; display:flex; align-items:center; gap:8px;">' + esc(item.name) + ' <i class="fa-solid fa-circle-xmark" onclick="removeMobileCategory(\'' + escAttr(safeName) + '\')" style="cursor:pointer; font-size:13px; opacity:0.7;"></i></div>';
                });
                out += '</div></div>';
            });
            return out;
        })()}
                </div>
            </div>
            
            <div style="height: 40px;"></div>
        </div>
    `;
    openMobileModal('Empresa & Categorias', html);
};

// Logica de manipulação de dados da empresa
window.saveMobileCompanyInfo = async function () {
    const newName = document.getElementById('mCompanyName').value.trim();
    if (!newName) return showToast('O nome não pode estar vazio', 'error');

    try {
        await db.collection('empresas').doc(String(currentUser.companyId)).update({ name: newName });

        // Atualiza localmente
        const comp = companies.find(c => c.id === currentUser.companyId);
        if (comp) comp.name = newName;

        showToast('Empresa atualizada!', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erro ao salvar empresa', 'error');
    }
};

window.addMobileCategory = async function () {
    const grupoInput = document.getElementById('mNewCategoryGroup');
    const serviceInput = document.getElementById('mNewCategoryService');
    const grupo = grupoInput.value.trim();
    const servico = serviceInput.value.trim();

    if (!grupo || !servico) return showToast('Preencha o Grupo e o Serviço', 'error');

    const val = grupo + ' - ' + servico;

    const comp = companies.find(c => c.id === currentUser.companyId);
    if (!comp) return;

    let cats = comp.categories || [];
    if (cats.includes(val)) return showToast('Esta subcategoria já existe neste grupo!', 'error');

    cats.push(val);

    try {
        await db.collection('empresas').doc(String(currentUser.companyId)).update({ categories: cats });
        grupoInput.value = '';
        serviceInput.value = '';
        showMobileCompanySettings(); // Refresh UI
        showToast('Subcategoria adicionada!', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erro ao adicionar', 'error');
    }
};

window.removeMobileCategory = async function (catName) {
    if (!confirm(`Excluir a categoria "${catName}"?`)) return;

    const comp = companies.find(c => c.id === currentUser.companyId);
    if (!comp) return;

    let cats = comp.categories.filter(c => c !== catName);

    try {
        await db.collection('empresas').doc(String(currentUser.companyId)).update({ categories: cats });
        showMobileCompanySettings(); // Refresh UI
        showToast('Categoria removida', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erro ao remover', 'error');
    }
};

window.showMobileAppearance = function () {
    const isDark = document.body.classList.contains('dark-mode');
    const html = `
        <div class="settings-detail-view" style="padding: 10px;">
            <div class="m-card">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid var(--mobile-border);">
                    <i class="fa-solid fa-desktop" style="font-size: 20px; opacity: 0.9;"></i>
                    <h3 style="margin:0; font-size:18px; font-weight: 700;">Aparência</h3>
                </div>

                <div class="m-item-box" onclick="toggleDarkModeMobile()" style="cursor: pointer; padding: 18px 20px;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <i class="fa-solid fa-moon" style="color: #f59e0b; font-size: 18px;"></i>
                        <span style="font-weight: 700; font-size: 15px;">Modo Escuro</span>
                    </div>
                    <div class="toggle-switch ${isDark ? 'on' : ''}"></div>
                </div>
            </div>
        </div>
    `;
    openMobileModal('Aparência', html);
};

window.toggleGamificationMobile = function (el) {
    const switchBtn = el.querySelector('.toggle-switch');
    if (!switchBtn) return;

    // Detecta status atual pela classe (Dinâmico)
    const currentStatus = switchBtn.classList.contains('on');
    const newStatus = !currentStatus;
    const companyId = String(currentUser.companyId);

    // 🔥 INSTANTÂNEO COM ANIMAÇÃO (Optimistic UI)
    // 1. Atualizar cache local
    const cIndex = companies.findIndex(x => String(x.id) === companyId);
    if (cIndex !== -1) {
        companies[cIndex].gamificationEnabled = newStatus;
    }

    // 2. Manipular o DOM DIRETAMENTE sem recarregar tudo
    const statusSpan = el.querySelector('span');
    const icon = el.querySelector('i');

    switchBtn.classList.toggle('on', newStatus);
    if (statusSpan) statusSpan.innerText = `Gamificação ${newStatus ? 'Ativada' : 'Desativada'}`;
    if (icon) icon.style.color = newStatus ? '#10b981' : '#ef4444';

    if (currentMobileTab === 'dashboard') {
        refreshMobileDashboard();
    }

    // 🔥 BACKGROUND (Sincronização)
    db.collection('empresas').doc(companyId).update({
        gamificationEnabled: newStatus
    }).then(() => {
        showToast(`Gamificação ${newStatus ? 'Ativada' : 'Desativada'}!`, 'success');
    }).catch(err => {
        console.error("Erro ao sincronizar gamificação:", err);
        showToast("Erro ao salvar no banco de dados.", "error");

        // REVERTER (Rollback) se falhar
        switchBtn.classList.toggle('on', currentStatus);
        if (statusSpan) statusSpan.innerText = `Gamificação ${currentStatus ? 'Ativada' : 'Desativada'}`;
        if (icon) icon.style.color = currentStatus ? '#10b981' : '#ef4444';

        if (cIndex !== -1) {
            companies[cIndex].gamificationEnabled = currentStatus;
            if (currentMobileTab === 'dashboard') refreshMobileDashboard();
        }
    });
};

window.toggleRewardsMobile = function (el) {
    const switchBtn = el.querySelector('.toggle-switch');
    if (!switchBtn) return;
    const currentStatus = switchBtn.classList.contains('on');
    const newStatus = !currentStatus;
    const companyId = String(currentUser.companyId);
    
    // Optimistic UI update
    switchBtn.classList.toggle('on', newStatus);
    
    const cIndex = companies.findIndex(x => String(x.id) === companyId);
    if (cIndex !== -1) {
        companies[cIndex].rewardsEnabled = newStatus;
    }
    
    db.collection('empresas').doc(companyId).update({
        rewardsEnabled: newStatus
    }).then(() => {
        showToast(`Loja e Moedas ${newStatus ? 'Ativadas' : 'Desativadas'}!`, 'success');
        // Refresh view to show/hide sections
        setTimeout(showMobileGamification, 200);
    }).catch(err => {
        console.error("Erro:", err);
        showToast("Erro ao salvar no banco de dados.", "error");
        switchBtn.classList.toggle('on', currentStatus);
        if (cIndex !== -1) companies[cIndex].rewardsEnabled = currentStatus;
    });
};

window.toggleInternalPrizesMobile = function (el) {
    const switchBtn = el.querySelector('.toggle-switch');
    if (!switchBtn) return;
    const currentStatus = switchBtn.classList.contains('on');
    const newStatus = !currentStatus;
    const companyId = String(currentUser.companyId);
    
    // Optimistic UI update
    switchBtn.classList.toggle('on', newStatus);
    
    const cIndex = companies.findIndex(x => String(x.id) === companyId);
    if (cIndex !== -1) {
        companies[cIndex].internalPrizesEnabled = newStatus;
    }
    
    db.collection('empresas').doc(companyId).update({
        internalPrizesEnabled: newStatus
    }).then(() => {
        showToast(`Prêmios Internos ${newStatus ? 'Ativados' : 'Desativados'}!`, 'success');
    }).catch(err => {
        console.error("Erro:", err);
        showToast("Erro ao salvar no banco de dados.", "error");
        switchBtn.classList.toggle('on', currentStatus);
        if (cIndex !== -1) companies[cIndex].internalPrizesEnabled = currentStatus;
    });
};

window.toggleMobileAccordion = function(headerElem) {
    const content = headerElem.nextElementSibling;
    const icon = headerElem.querySelector('.acc-icon');
    const isExpanded = content.style.display === 'block';
    
    if (isExpanded) {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    }
};

window.renderMobileGiftCardCheckboxes = function(c) {
    const cbContainer = document.getElementById('mGiftCardsContainer');
    if (!cbContainer) return;
    
    const activeList = c.activeGiftCards || [];

    if (window.apiGiftCardsCatalog) {
        let cbHtml = '';
        window.apiGiftCardsCatalog.forEach(card => {
            const isActive = activeList.includes(card.id);
            const icon = card.bgColor === '#000000' ? '#fff' : card.bgColor;
            cbHtml += `
                <label style="padding: 15px 10px; background: ${isActive ? 'hsla(160, 80%, 50%, 0.1)' : 'rgba(0,0,0,0.2)'}; border: 1px solid ${isActive ? '#10b981' : 'rgba(255,255,255,0.05)'}; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; position: relative; cursor: pointer;">
                    <i class="${card.fallbackIcon}" style="font-size: 28px; color: ${isActive ? icon : '#64748b'};"></i>
                    <span style="font-size: 12px; font-weight: 700; text-align: center; color: ${isActive ? '#fff' : '#64748b'};">${card.name}</span>
                    <input type="checkbox" class="m-gift-check" data-id="${card.id}" value="${card.id}" ${isActive ? 'checked' : ''} style="position: absolute; top: 10px; right: 10px; width: 18px; height: 18px; accent-color: #10b981;" onchange="this.parentElement.style.background = this.checked ? 'hsla(160, 80%, 50%, 0.1)' : 'rgba(0,0,0,0.2)'; this.parentElement.style.borderColor = this.checked ? '#10b981' : 'rgba(255,255,255,0.05)'; this.parentElement.querySelector('span').style.color = this.checked ? '#fff' : '#64748b'; this.parentElement.querySelector('i').style.color = this.checked ? '${icon}' : '#64748b';">
                </label>
                `;
        });
        cbContainer.innerHTML = cbHtml;
    }
};

window.showMobileSpendingControl = function () {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c) return;
    
    const limitEmpresa = c.monthlyBudget || 500;
    const gamiEmployeeLimitBRL = c.gamiEmployeeLimitBRL || '';
    const gamiBudgetAlertEnabled = c.gamiBudgetAlertEnabled === true;
    const gamiBudgetAlertEmail = c.gamiBudgetAlertEmail || '';
    const spentThisMonth = c.spentThisMonth || 0;
    
    const percentSpent = limitEmpresa > 0 ? Math.min(100, (spentThisMonth / limitEmpresa) * 100) : 0;
    let barColor = '#10b981';
    if (percentSpent >= 90) barColor = '#ef4444';
    else if (percentSpent >= 80) barColor = '#f59e0b';

    const accordionStyles = `
        .m-accordion { background: #0f172a; border-radius: 16px; margin-bottom: 15px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .m-accordion-header { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: rgba(255,255,255,0.02); }
        .m-accordion-header:active { background: rgba(255,255,255,0.05); }
        .m-accordion-title { font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 12px; }
        .m-accordion-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .m-accordion-content { padding: 20px; display: none; border-top: 1px solid rgba(255,255,255,0.05); background: #0f172a; }
        .m-accordion.open .m-accordion-content { display: block; }
        .acc-icon { transition: transform 0.3s ease; color: #64748b; }
        .m-input-label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; }
        .m-dark-input { width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-weight: 700; outline: none; font-size: 16px; transition: 0.2s; }
        .m-dark-input:focus { border-color: #10b981; }
    `;

    const html = `
        <style>${accordionStyles}</style>
        <div class="settings-detail-view" style="padding: 15px; max-height: 85vh; overflow-y: auto; padding-bottom: 100px;">

            <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:25px; margin-top: 10px;">
                <div style="background: rgba(16, 185, 129, 0.15); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #10b981; margin-bottom: 15px;">
                    <i class="fa-solid fa-credit-card" style="font-size: 32px;"></i>
                </div>
                <h3 style="margin:0; font-size:22px; font-weight: 900; color: var(--mobile-text); text-align: center;">Controle de Gastos</h3>
                <p style="font-size: 13px; color: var(--mobile-text-secondary); text-align: center; margin-top: 5px; max-width: 80%;">Configure a integração da Loja, API e limites de orçamento.</p>
            </div>

            <!-- Dashboard de Gastos -->
            <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: var(--mobile-text-secondary);"><i class="fa-solid fa-chart-pie"></i> ORÇAMENTO GASTO (MÊS)</span>
                    <span style="font-size: 13px; font-weight: 900; color: #fff;">R$ ${spentThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${limitEmpresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; background: ${barColor}; width: ${percentSpent}%; border-radius: 4px; transition: 0.3s;"></div>
                </div>
            </div>



            <!-- Accordion 2: Limites e Alertas -->
            <div class="m-accordion">
                <div class="m-accordion-header" onclick="window.toggleMobileAccordion(this)">
                    <div class="m-accordion-title">
                        <div class="m-accordion-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;"><i class="fa-solid fa-scale-balanced"></i></div>
                        Limites e Alertas
                    </div>
                    <i class="fa-solid fa-chevron-down acc-icon"></i>
                </div>
                <div class="m-accordion-content">
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div>
                            <label class="m-input-label">ORÇAMENTO MÁXIMO GLOBAL (R$/MÊS)</label>
                            <input type="number" id="mAdminMonthlyBudget" value="${limitEmpresa}" class="m-dark-input">
                        </div>
                        <div>
                            <label class="m-input-label">LIMITE DE RESGATE POR COLABORADOR (R$/MÊS)</label>
                            <input type="number" id="mGamiEmployeeLimitBRL" value="${gamiEmployeeLimitBRL}" placeholder="Deixe em branco para sem limite" class="m-dark-input">
                        </div>
                        
                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 5px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 15px;">
                                <input type="checkbox" id="mGamiBudgetAlertEnabled" ${gamiBudgetAlertEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981;">
                                <span style="font-size: 13px; font-weight: bold; color: #fff;">Ativar alertas de Orçamento</span>
                            </label>
                            <label class="m-input-label">EMAIL PARA NOTIFICAÇÕES DE LIMITE</label>
                            <input type="email" id="mGamiBudgetAlertEmail" value="${gamiBudgetAlertEmail}" placeholder="financeiro@empresa.com" class="m-dark-input">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Accordion 3: Loja & Marcas (Gift Cards) -->
            <div class="m-accordion">
                <div class="m-accordion-header" onclick="window.toggleMobileAccordion(this)">
                    <div class="m-accordion-title">
                        <div class="m-accordion-icon" style="background: rgba(236, 72, 153, 0.1); color: #ec4899;"><i class="fa-solid fa-store"></i></div>
                        Loja & Marcas (Gift Cards)
                    </div>
                    <i class="fa-solid fa-chevron-down acc-icon"></i>
                </div>
                <div class="m-accordion-content">
                    <div style="margin-bottom: 25px;">
                        <label class="m-input-label" style="display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-money-bill-transfer"></i> TAXA DE CÂMBIO (1 R$ = X GOCOINS)
                        </label>
                        <input type="number" id="mGamiExchange" value="${c.exchangeRate || 10}" class="m-dark-input">
                        <p style="font-size: 11px; opacity: 0.5; margin-top: 8px; color: #fff;">Ex: Com taxa 10, um prêmio de R$ 50 custará 500 GoCoins.</p>
                    </div>
                    
                    <label class="m-input-label" style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
                        <i class="fa-solid fa-tags"></i> MARCAS ATIVAS NA LOJA
                    </label>
                    <div id="mGiftCardsContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <!-- Renderizado via JS -->
                    </div>
                </div>
            </div>

            <!-- Aviso Cartão -->
            <div style="margin-top: 20px; text-align: center; font-size: 12px; color: var(--mobile-text-secondary); opacity: 0.7; padding: 0 10px;">
                <i class="fa-solid fa-info-circle"></i> Para cadastrar ou atualizar o seu <strong>Cartão Corporativo</strong> de faturamento, por favor, acesse o painel pelo computador.
            </div>

        </div>

        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 15px 20px 25px; background: linear-gradient(0deg, var(--mobile-bg) 70%, transparent 100%); z-index: 10;">
            <button class="btn btn-mobile-primary" onclick="saveMobileSpendingControlSettings()" style="width: 100%; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.4);">
                SALVAR ALTERAÇÕES
            </button>
        </div>
    `;

    openMobileModal('', html);
    window.renderMobileGiftCardCheckboxes(c);
};

window.saveMobileSpendingControlSettings = async function () {
    const btn = document.querySelector('.btn-mobile-primary');
    const txtOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        const storeMode = 'internal';
        const monthlyBudget = parseFloat(document.getElementById('mAdminMonthlyBudget').value) || 500;
        
        const gamiEmployeeLimitBRL = document.getElementById('mGamiEmployeeLimitBRL').value ? parseFloat(document.getElementById('mGamiEmployeeLimitBRL').value) : '';
        const gamiBudgetAlertEnabled = document.getElementById('mGamiBudgetAlertEnabled').checked;
        const gamiBudgetAlertEmail = document.getElementById('mGamiBudgetAlertEmail').value.trim();
        const exchangeRate = parseFloat(document.getElementById('mGamiExchange').value) || 10;
        const activeGiftCards = Array.from(document.querySelectorAll('.m-gift-check:checked')).map(el => el.dataset.id);

        await db.collection('empresas').doc(String(currentUser.companyId)).set({
            storeMode,
            monthlyBudget,
            gamiEmployeeLimitBRL,
            gamiBudgetAlertEnabled,
            gamiBudgetAlertEmail,
            exchangeRate,
            activeGiftCards,
            storeBudget: monthlyBudget // storeBudget e monthlyBudget são mantidos em sync por segurança no legado
        }, { merge: true });

        const cIndex = companies.findIndex(x => String(x.id) === String(currentUser.companyId));
        if (cIndex !== -1) {
            companies[cIndex].storeMode = storeMode;
            companies[cIndex].monthlyBudget = monthlyBudget;
            companies[cIndex].storeBudget = monthlyBudget;
            companies[cIndex].gamiEmployeeLimitBRL = gamiEmployeeLimitBRL;
            companies[cIndex].gamiBudgetAlertEnabled = gamiBudgetAlertEnabled;
            companies[cIndex].gamiBudgetAlertEmail = gamiBudgetAlertEmail;
            companies[cIndex].exchangeRate = exchangeRate;
            companies[cIndex].activeGiftCards = activeGiftCards;
        }

        btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
        showToast('Configurações de Gastos salvas!', 'success');
        
        setTimeout(() => {
            btn.innerHTML = txtOriginal;
            btn.disabled = false;
        }, 1500);

    } catch (err) {
        console.error("Erro ao salvar controle de gastos:", err);
        btn.innerHTML = 'Erro!';
        showToast('Erro ao salvar!', 'error');
        setTimeout(() => {
            btn.innerHTML = txtOriginal;
            btn.disabled = false;
        }, 1500);
    }
};

window.showMobileGamification = function () {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const isGamfActive = c ? c.gamificationEnabled === true : false;
    const isRewardsActive = c ? (c.rewardsEnabled !== false) : true;

    // Load configs
    const reglas = (c && c.gamificacao) ? c.gamificacao : { xpBase: 50, xpNivel: 500, gocoinsNivel: 100 };
    const difs = (c && c.dificuldade) ? c.dificuldade : { facil: 2, media: 3, dificil: 4 };
    const rankArr = (c && c.premiosRanking) ? c.premiosRanking : [500, 400, 300, 200, 100];


    const premios = [
        { l: '1º Lugar', v: rankArr[0], c: '#f59e0b' },
        { l: '2º Lugar', v: rankArr[1], c: '#94a3b8' },
        { l: '3º Lugar', v: rankArr[2], c: '#d97706' },
        { l: '4º Lugar', v: rankArr[3], c: '#10b981' },
        { l: '5º Lugar', v: rankArr[4], c: '#3b82f6' }
    ];

    const accordionStyles = `
        .m-accordion { background: #0f172a; border-radius: 16px; margin-bottom: 15px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        .m-accordion-header { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: rgba(255,255,255,0.02); }
        .m-accordion-header:active { background: rgba(255,255,255,0.05); }
        .m-accordion-title { font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 12px; }
        .m-accordion-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
        .m-accordion-content { padding: 20px; display: none; border-top: 1px solid rgba(255,255,255,0.05); background: #0f172a; }
        .m-accordion.open .m-accordion-content { display: block; }
        .acc-icon { transition: transform 0.3s ease; color: #64748b; }
        .m-input-label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; margin-bottom: 8px; }
        .m-dark-input { width: 100%; padding: 14px 16px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-weight: 700; outline: none; font-size: 16px; transition: 0.2s; }
        .m-dark-input:focus { border-color: #10b981; }
    `;

    const html = `
        <style>${accordionStyles}</style>
        <div class="settings-detail-view" style="padding: 15px; max-height: 85vh; overflow-y: auto; padding-bottom: 100px;">
            
            <!-- Header Título Principal -->
            <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:25px; margin-top: 10px;">
                <div style="background: rgba(16, 185, 129, 0.15); width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #10b981; margin-bottom: 15px;">
                    <i class="fa-solid fa-gamepad" style="font-size: 32px;"></i>
                </div>
                <h3 style="margin:0; font-size:22px; font-weight: 900; color: var(--mobile-text); text-align: center;">Gamificação</h3>
                <p style="font-size: 13px; color: var(--mobile-text-secondary); text-align: center; margin-top: 5px; max-width: 80%;">Configure regras, dificuldades e prêmios da sua loja corporativa.</p>
            </div>

            <!-- Status Global -->
            <div class="m-accordion" style="background: ${isGamfActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${isGamfActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};">
                <div onclick="toggleGamificationMobile(this)" style="padding: 18px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display:flex; align-items:center; gap:15px; flex: 1; min-width: 0;">
                        <i class="fa-solid fa-power-off" style="color: ${isGamfActive ? '#10b981' : '#ef4444'}; font-size: 20px; flex-shrink: 0;"></i>
                        <span style="font-weight: 800; font-size: 15px; color: var(--mobile-text);">Gamificação Ativada</span>
                    </div>
                    <div class="toggle-switch ${isGamfActive ? 'on' : ''}"></div>
                </div>
            </div>

            <!-- Loja e Moedas -->
            <div class="m-accordion" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px;">
                <div onclick="toggleRewardsMobile(this)" style="padding: 18px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display:flex; align-items:center; gap:15px; flex: 1; min-width: 0;">
                        <i class="fa-solid fa-sack-dollar" style="color: #10b981; font-size: 20px; flex-shrink: 0;"></i>
                        <span style="font-weight: 800; font-size: 15px; color: var(--mobile-text);">Loja e Moedas (GoCoins)</span>
                    </div>
                    <div class="toggle-switch ${isRewardsActive ? 'on' : ''}"></div>
                </div>
            </div>
            
            <!-- Prêmios Internos -->
            <div class="m-accordion" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 25px;">
                <div onclick="toggleInternalPrizesMobile(this)" style="padding: 18px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display:flex; align-items:center; gap:15px; flex: 1; min-width: 0;">
                        <i class="fa-solid fa-gift" style="color: #8b5cf6; font-size: 20px; flex-shrink: 0;"></i>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight: 800; font-size: 14px; color: var(--mobile-text);">Prêmios Internos no Catálogo</span>
                            <span style="font-size: 11px; color: var(--mobile-text-secondary); opacity: 0.8;">Exibe prêmios manuais</span>
                        </div>
                    </div>
                    <div class="toggle-switch ${c && c.internalPrizesEnabled !== false ? 'on' : ''}"></div>
                </div>
            </div>

            ${isRewardsActive ? `
            <!-- (Orçamento foi movido para Controle de Gastos) -->
            ` : ''}

            <!-- Accordion 2: Regras e XP -->
            <div class="m-accordion">
                <div class="m-accordion-header" onclick="window.toggleMobileAccordion(this)">
                    <div class="m-accordion-title">
                        <div class="m-accordion-icon" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;"><i class="fa-solid fa-bolt"></i></div>
                        Regras de Experiência (XP)
                    </div>
                    <i class="fa-solid fa-chevron-down acc-icon"></i>
                </div>
                <div class="m-accordion-content">
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div>
                            <label class="m-input-label">XP BASE POR FEEDBACK</label>
                            <input type="number" id="mGamiXpBase" value="${reglas.xpBase || 50}" class="m-dark-input">
                        </div>
                        <div>
                            <label class="m-input-label">XP NECESSÁRIO POR NÍVEL</label>
                            <input type="number" id="mGamiXpNivel" value="${reglas.xpNivel || 500}" class="m-dark-input">
                        </div>
                        ${isRewardsActive ? `
                        <div>
                            <label class="m-input-label">GOCOINS GANHAS POR NÍVEL</label>
                            <input type="number" id="mGamiGocoins" value="${reglas.gocoinsNivel || 100}" class="m-dark-input">
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Accordion 3: Dificuldade -->
            <div class="m-accordion">
                <div class="m-accordion-header" onclick="window.toggleMobileAccordion(this)">
                    <div class="m-accordion-title">
                        <div class="m-accordion-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;"><i class="fa-solid fa-layer-group"></i></div>
                        Pesos de Dificuldade
                    </div>
                    <i class="fa-solid fa-chevron-down acc-icon"></i>
                </div>
                <div class="m-accordion-content">
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div>
                            <label class="m-input-label">MULTIPLICADOR: FÁCIL</label>
                            <input type="number" id="mGamiDifFacil" value="${difs.facil || 2}" class="m-dark-input">
                        </div>
                        <div>
                            <label class="m-input-label">MULTIPLICADOR: MÉDIA</label>
                            <input type="number" id="mGamiDifMedia" value="${difs.media || 3}" class="m-dark-input">
                        </div>
                        <div>
                            <label class="m-input-label">MULTIPLICADOR: DIFÍCIL</label>
                            <input type="number" id="mGamiDifDificil" value="${difs.dificil || 4}" class="m-dark-input">
                        </div>
                    </div>
                </div>
            </div>

            ${isRewardsActive ? `
            <!-- Accordion 4: Prêmios Ranking -->
            <div class="m-accordion">
                <div class="m-accordion-header" onclick="window.toggleMobileAccordion(this)">
                    <div class="m-accordion-title">
                        <div class="m-accordion-icon" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6;"><i class="fa-solid fa-trophy"></i></div>
                        Prêmios do Ranking (GoCoins)
                    </div>
                    <i class="fa-solid fa-chevron-down acc-icon"></i>
                </div>
                <div class="m-accordion-content">
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        ${premios.map((p, idx) => `
                            <div>
                                <label class="m-input-label" style="display: flex; align-items: center; gap: 6px;">
                                    <i class="fa-solid fa-medal" style="color: ${p.c}; font-size: 14px;"></i> ${p.l.toUpperCase()}
                                </label>
                                <input type="number" id="mGamiRank_${idx}" value="${p.v}" class="m-dark-input">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

        </div>

        <!-- Sticky Footer com o Botão de Salvar -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 15px 20px 25px; background: linear-gradient(0deg, var(--mobile-bg) 70%, transparent 100%); z-index: 10;">
            <button class="btn btn-mobile-primary" onclick="saveMobileGamificationSettings()" style="width: 100%; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 15px; box-shadow: 0 10px 25px -5px rgba(16,185,129,0.4);">
                SALVAR ALTERAÇÕES
            </button>
        </div>
    `;

    openMobileModal('', html);
};

window.saveMobileGamificationSettings = function () {
    const companyId = String(currentUser.companyId);
    const c = companies.find(x => String(x.id) === companyId);
    const isRewardsActive = c ? (c.rewardsEnabled !== false) : true;
    showToast("Salvando configurações...", "info");

    const xpBase = parseInt(document.getElementById('mGamiXpBase')?.value || c?.gamificacao?.xpBase || 50);
    const xpNivel = parseInt(document.getElementById('mGamiXpNivel')?.value || c?.gamificacao?.xpNivel || 500);
    const gocoins = isRewardsActive
        ? parseInt(document.getElementById('mGamiGocoins')?.value || c?.gamificacao?.gocoinsNivel || 100)
        : (c?.gamificacao?.gocoinsNivel || 100);

    const difFacil = parseInt(document.getElementById('mGamiDifFacil')?.value || c?.dificuldade?.facil || 2);
    const difMedia = parseInt(document.getElementById('mGamiDifMedia')?.value || c?.dificuldade?.media || 3);
    const difDificil = parseInt(document.getElementById('mGamiDifDificil')?.value || c?.dificuldade?.dificil || 4);

    const rank0 = isRewardsActive ? parseInt(document.getElementById('mGamiRank_0')?.value || 500) : (c?.premiosRanking?.[0] || 500);
    const rank1 = isRewardsActive ? parseInt(document.getElementById('mGamiRank_1')?.value || 400) : (c?.premiosRanking?.[1] || 400);
    const rank2 = isRewardsActive ? parseInt(document.getElementById('mGamiRank_2')?.value || 300) : (c?.premiosRanking?.[2] || 300);
    const rank3 = isRewardsActive ? parseInt(document.getElementById('mGamiRank_3')?.value || 200) : (c?.premiosRanking?.[3] || 200);
    const rank4 = isRewardsActive ? parseInt(document.getElementById('mGamiRank_4')?.value || 100) : (c?.premiosRanking?.[4] || 100);

    if (!(xpBase >= 10 && xpNivel >= 50 && difFacil >= 0.5 && difMedia >= 0.5 && difDificil >= 0.5)) {
        showToast("Valores inválidos: XP Base mínimo 10, XP/Nível mínimo 50, pesos a partir de 0.5.", "error");
        return;
    }
    if (isRewardsActive && (gocoins < 0 || rank0 < 0 || rank1 < 0 || rank2 < 0 || rank3 < 0 || rank4 < 0)) {
        showToast("Valores inválidos: GoCoins e prêmios não podem ser negativos.", "error");
        return;
    }

    const dataToUpdate = {
        gamificacao: { 
            xpBase, 
            xpNivel, 
            coinsNivel: gocoins,
            pesoFacil: difFacil,
            pesoMedia: difMedia,
            pesoDificil: difDificil,
            premioTop1: rank0,
            premioTop2: rank1,
            premioTop3: rank2,
            premioTop4: rank3,
            premioTop5: rank4
        },
        dificuldade: { facil: difFacil, media: difMedia, dificil: difDificil },
        premiosRanking: [rank0, rank1, rank2, rank3, rank4],
        storeBudget: budget,
        exchangeRate: exchange,
        activeGiftCards: activeBrands
    };

    db.collection('empresas').doc(companyId).update(dataToUpdate).then(() => {
        // Atualizar cache local
        const cIndex = companies.findIndex(x => String(x.id) === companyId);
        if (cIndex !== -1) {
            companies[cIndex] = { ...companies[cIndex], ...dataToUpdate };
        }
        showToast("Configurações salvas com sucesso!", "success");
        closeMobileModal();
    }).catch(err => {
        console.error("Erro ao salvar:", err);
        showToast("Erro ao salvar.", "error");
    });
};

window.toggleCalendarMobile = function (el) {
    const switchBtn = el.querySelector('.toggle-switch');
    if (!switchBtn) return;

    const currentStatus = switchBtn.classList.contains('on');
    const newStatus = !currentStatus;
    const companyId = String(currentUser.companyId);

    // 🔥 OPTIMISTIC UI
    const cIndex = companies.findIndex(x => String(x.id) === companyId);
    if (cIndex !== -1) {
        companies[cIndex].calendarioEnabled = newStatus;
    }

    const statusSpan = el.querySelector('span');
    const icon = el.querySelector('i');

    switchBtn.classList.toggle('on', newStatus);
    if (statusSpan) statusSpan.innerText = `Calendário ${newStatus ? 'Ativado' : 'Desativado'}`;
    if (icon) icon.style.color = newStatus ? '#10b981' : '#64748b';

    db.collection('empresas').doc(companyId).update({
        calendarioEnabled: newStatus
    }).then(() => {
        showToast(`Módulo Calendário ${newStatus ? 'Ativado' : 'Desativado'}!`, 'success');
        // Atualiza a visibilidade do ícone no menu principal se necessário
        if (typeof window.aplicarVisibilidadeCalendario === 'function') window.aplicarVisibilidadeCalendario();
    }).catch(err => {
        console.error("Erro ao alternar calendário:", err);
        showToast("Erro ao sincronizar.", "error");
        // Rollback parcial
        switchBtn.classList.toggle('on', currentStatus);
    });
};

window.addCalendarCategoryMobile = function () {
    const input = document.getElementById('mNewCalCat');
    const val = input.value.trim();
    if (!val) return;

    const companyId = String(currentUser.companyId);
    const c = companies.find(x => String(x.id) === companyId);
    if (!c) return;

    let categories = c.calendarCategories || ['Reunião', 'Prazo', 'Evento', 'Feriado', 'Outro'];
    if (categories.includes(val)) {
        showToast("Essa categoria já existe.", "warning");
        return;
    }

    categories.push(val);

    db.collection('empresas').doc(companyId).update({
        calendarCategories: categories
    }).then(() => {
        c.calendarCategories = categories;
        if (input) input.value = '';
        showMobileExtraFunctions(); // Refresh modal
        showToast("Categoria adicionada!", "success");
    }).catch(() => showToast("Erro ao salvar.", "error"));
};

window.removeCalendarCategoryMobile = function (cat) {
    const companyId = String(currentUser.companyId);
    const c = companies.find(x => String(x.id) === companyId);
    if (!c) return;

    let categories = c.calendarCategories || ['Reunião', 'Prazo', 'Evento', 'Feriado', 'Outro'];
    categories = categories.filter(x => x !== cat);

    db.collection('empresas').doc(companyId).update({
        calendarCategories: categories
    }).then(() => {
        c.calendarCategories = categories;
        showMobileExtraFunctions(); // Refresh modal
        showToast("Categoria removida.", "success");
    }).catch(() => showToast("Erro ao remover.", "error"));
};

window.showMobileExtraFunctions = function () {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const isCalActive = c ? c.calendarioEnabled === true : false;
    const categories = c.calendarCategories || ['Reunião', 'Prazo', 'Evento', 'Feriado', 'Outro'];

    const html = `
        <div class="settings-detail-view" style="padding: 10px; max-height: 85vh; overflow-y: auto;">
            <div class="m-card">
                <!-- Header -->
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid var(--mobile-border);">
                    <div style="background: rgba(139, 92, 246, 0.15); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #8b5cf6;">
                        <i class="fa-solid fa-puzzle-piece" style="font-size: 18px;"></i>
                    </div>
                    <h3 style="margin:0; font-size:18px; font-weight: 700; color: var(--mobile-text);">Funções Extras</h3>
                </div>

                <p style="opacity: 0.6; font-size: 14px; margin-bottom: 25px; line-height: 1.4;">Ative ou desative módulos opcionais da plataforma para sua empresa.</p>

                <!-- Calendário Toggle -->
                <div class="m-item-box" onclick="toggleCalendarMobile(this)" style="padding: 18px 20px; margin-bottom: 30px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; -webkit-tap-highlight-color: transparent;">
                    <div style="display:flex; align-items:center; gap:15px; flex: 1; min-width: 0;">
                        <i class="fa-solid fa-calendar-days" style="color: ${isCalActive ? '#10b981' : '#64748b'}; font-size: 18px; flex-shrink: 0;"></i>
                        <span style="font-weight: 700; font-size: 15px; color: var(--mobile-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Calendário ${isCalActive ? 'Ativado' : 'Desativado'}</span>
                    </div>
                    <div class="toggle-switch ${isCalActive ? 'on' : ''}" style="margin-left: 20px;"></div>
                </div>

                <!-- Categorias do Calendário Section -->
                <div style="background: hsla(215, 80%, 50%, 0.05); border: 1px solid hsla(215, 80%, 50%, 0.15); border-radius: 18px; padding: 20px; margin-bottom: 25px;">
                    <div style="display:flex; align-items:center; gap:10px; color: var(--mobile-text); font-weight: 800; font-size: 13px; margin-bottom: 20px;">
                        <i class="fa-solid fa-tags" style="color: #3b82f6;"></i>
                        <span>CATEGORIAS DO CALENDÁRIO</span>
                    </div>

                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <input type="text" id="mNewCalCat" placeholder="Ex: Treinamento" style="flex: 1; background: rgba(0,0,0,0.1); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 14px 15px; border-radius: 12px; font-size: 14px; outline: none; font-weight: 600;">
                        <button onclick="addCalendarCategoryMobile()" style="background: #10b981; color: white; border: none; padding: 0 18px; border-radius: 12px; font-weight: 900; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>

                    <div id="mCalCatList" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${categories.map(cat => `
                            <div class="m-cat-tag" style="background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: var(--mobile-text); box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                                ${cat}
                                <i class="fa-solid fa-circle-xmark" onclick="removeCalendarCategoryMobile('${cat}')" style="color: #ef4444; opacity: 0.8; cursor: pointer; font-size: 14px;"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="text-align: right; margin-top: 10px;">
                    <button class="btn btn-mobile-primary" onclick="closeMobileModal()" style="width: auto; padding: 14px 40px; border-radius: 15px; font-weight: 900; background: var(--mobile-border); color: var(--mobile-text); border: none;">
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    `;
    openMobileModal('Funções Extras', html);
};

window.showMobileLicenses = function () {
    const html = `
        <div class="settings-detail-view" style="padding: 10px; max-height: 80vh; overflow-y: auto;">
            <div class="m-card" style="padding: 20px;">
                <!-- Header -->
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid var(--mobile-border);">
                    <div style="background: rgba(16, 185, 129, 0.1); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #10b981;">
                        <i class="fa-solid fa-scale-balanced" style="font-size: 18px;"></i>
                    </div>
                    <h3 style="margin:0; font-size:18px; font-weight: 700; color: var(--mobile-text);">Licenças & Atribuições</h3>
                </div>

                <p style="font-size: 13px; line-height: 1.6; color: var(--mobile-text-secondary); margin-bottom: 25px;">
                    Esta plataforma cumpre rigorosamente as leis de direitos autorais. O nosso sistema de avatares é alimentado de forma externa pela infraestrutura aberta da <strong>DiceBear API (v9)</strong>. As obras de arte abaixo foram criadas por designers talentosos e disponibilizadas sob licenças de uso comercial e pessoal:
                </p>

                <!-- Lorelei Attribution Card -->
                <div style="background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); border-radius: 15px; padding: 18px; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <i class="fa-solid fa-paintbrush" style="font-size: 14px; color: var(--mobile-text);"></i>
                            <span style="font-weight: 800; font-size: 15px; color: var(--mobile-text);">Lorelei</span>
                        </div>
                        <p style="margin: 0; font-size: 12px; color: var(--mobile-text-secondary); line-height: 1.4;">
                            Arte por Lisa Wischofsky.<br>
                            Licença: <strong>CC0 1.0 Universal</strong>.
                        </p>
                    </div>
                    <a href="https://www.figma.com/community/file/1198749693280469639/lorelei-dicebear" target="_blank" style="background: var(--mobile-card-bg); border: 1px solid var(--mobile-border); padding: 10px 15px; border-radius: 10px; color: var(--mobile-text); text-decoration: none; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <i class="fa-solid fa-link"></i> Fonte
                    </a>
                </div>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--mobile-border); text-align: center;">
                    <p style="font-size: 11px; opacity: 0.3; margin-bottom: 20px;">FeedbackGo Enterprise • v2.1.0 • © 2026</p>
                    <button class="btn btn-mobile-primary" onclick="closeMobileModal()" style="width: 100%; padding: 14px; border-radius: 12px; font-weight: 800;">FECHAR</button>
                </div>
            </div>
        </div>
    `;
    openMobileModal('Licenças & Sobre', html);
};

// Modal System
window.openMobileModal = function (title, contentHtml) {
    const overlay = document.getElementById('mobileModal');
    if (!overlay) return;

    const sheet = overlay.querySelector('.mobile-modal-sheet');
    const titleEl = document.getElementById('mobileModalTitle');
    const contentEl = document.getElementById('mobileModalContent');

    // MÁGICA: Limpa TUDO para garantir que nada trave a abertura e resete o swipe
    if (sheet) {
        sheet.style.cssText = '';
        sheet.style.transform = '';
        sheet.style.transition = '';
    }

    const headerEl = overlay.querySelector('.mobile-modal-header');
    if (titleEl) titleEl.innerText = title || '';
    if (headerEl) {
        headerEl.style.setProperty('display', (title === '' || !title) ? 'none' : 'flex', 'important');
    }
    if (contentEl) contentEl.innerHTML = contentHtml;

    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');

    // MÁGICA: Fechar ao clicar fora (no fundo escuro)
    overlay.onclick = function (e) {
        if (e.target === overlay) closeMobileModal();
    };

    // Trava o fundo
    document.body.style.overflow = 'hidden';

    // Pequeno delay para a animação do CSS ativar suavemente
    setTimeout(() => overlay.classList.add('active'), 20);
};


window.closeMobileModal = function () {
    const overlay = document.getElementById('mobileModal');
    if (!overlay) return;

    const sheet = overlay.querySelector('.mobile-modal-sheet');

    // Força a animação de descida suave igual ao arraste
    if (sheet) {
        sheet.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        sheet.style.transform = 'translateY(100%)';
    }

    overlay.classList.remove('active');

    // Destrava o fundo
    document.body.style.overflow = '';

    setTimeout(() => {

        overlay.style.display = 'none';
        overlay.classList.add('hidden');

        // Limpa tudo para a próxima abertura vir do zero
        sheet.style.cssText = '';
    }, 400);
};

// ============ LOJA DE PRÊMIOS MOBILE ============
window.renderMobileStore = async function (container) {
    if (!container) return;
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c) return;

    let html = `
        <div class="m-store-header animate__animated animate__fadeIn">
            <div class="m-balance-card">
                <div class="m-balance-info">
                    <span class="m-balance-label">MEU SALDO</span>
                    <strong class="m-balance-value"><img src="Patentes/Moedas/Amount_GoCoins.svg" alt="Coins"> ${currentUser.goCoins || 0}</strong>
                </div>
                <div class="m-balance-icon">
                    <i class="fa-solid fa-cart-shopping"></i>
                </div>
            </div>
        </div>
        
        <div class="m-store-grid" id="mobileStoreGrid" style="margin-top: 25px;">
            <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: var(--color-primary); margin-bottom: 10px;"></i>
                <p style="font-size: 13px; opacity: 0.7;">Sincronizando prêmios...</p>
            </div>
        </div>
        <div style="height: 100px;"></div>
    `;

    container.innerHTML = html;
    const grid = document.getElementById('mobileStoreGrid');
    if (!grid) return;

    const configLoja = c.giftCardConfig || {};
    const taxaCambio = configLoja.rate || c.exchangeRate || 10;
    // Lista estática local de Gift Cards suportados pelo sistema
    const localGiftCardsCatalog = [];
    const activeBrands = (configLoja.active && configLoja.active.length > 0) ? configLoja.active : (c.activeGiftCards && c.activeGiftCards.length > 0 ? c.activeGiftCards : localGiftCardsCatalog.map(x => x.id));

    try {
        let gridHtml = '';

        const cartoesAtivos = localGiftCardsCatalog.filter(card => activeBrands.includes(card.id));
        cartoesAtivos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        cartoesAtivos.forEach(card => {
            const logo = card.logo || '';
            const valoresPadrao = [20, 30, 50, 100];

            gridHtml += `
                <div class="m-store-card animate__animated animate__fadeInUp">
                    ${(() => {
                        const name = card.name ? card.name.toLowerCase() : '';
                        const isLogo = ['mcdonald', 'piraja', 'minecoi', 'gnc', 'santa luzia', 'decathlon', 'roblox', 'carrefour', 'tinder', 'jawaker', 'ea sports', 'braz pizzaria', 'bitfy', 'shopee', 'zift'].some(ex => name.includes(ex));
                        if (!isLogo) {
                            let extraStyle = '';
                            let topBg = '';
                            if (name.includes('anacapri')) extraStyle = 'transform: scale(2.2) translateY(10%);';
                            if (name.includes('fogo de ch')) extraStyle = 'transform: scale(1.2) translateY(-5%);';
                            if (name.includes('looke')) {
                                extraStyle = 'transform: scale(1.15) translateY(7%);';
                                topBg = 'background-color: #0062cc;';
                            }
                            if (name.includes('applebee') || name.includes('buser')) extraStyle = 'object-position: right center;';
                            if (name.includes('aramis')) extraStyle = 'transform: scale(1.15);';
                            return `<div class="m-store-card-top" style=" display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; ${topBg}">
                                     ${logo ? `<img src="${logo}" class="m-store-logo" style="${extraStyle}">` : `<i class="fa-solid fa-gift" style="font-size: 35px; color: white; opacity: 0.2;"></i>`}
                                   </div>`;
                        }
                        let bg = '#ffffff';
                        let extraLogoStyle = '';
                        if (name.includes('mcdonald')) bg = '#da291c';
                        else if (name.includes('roblox') || name.includes('ea sports')) bg = '#000000';
                        
                        return `<div class="m-store-card-top" style="display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background-color: ${bg};">
                                 <img src="${logo}" class="m-store-logo" style="object-fit: contain; width: 80%; padding: 15px; ${extraLogoStyle}">
                               </div>`;
                    })()}
                    <div class="m-store-card-body">
                        <h4 class="m-store-title">${card.name}</h4>
                        <p class="m-store-desc">Resgate enviado para aprovação.</p>
                        
                        <select id="select-val-mobile-${card.id}" class="m-store-select">
                            <option value="" disabled selected>Escolha o valor</option>
                            ${valoresPadrao.map(val => {
                const custo = Math.round(val * taxaCambio);
                return `<option value="${val}">R$ ${val} (${custo} GC)</option>`;
            }).join('')}
                        </select>
                        
                        <button onclick="solicitarResgateLocalGiftCardMobile('${card.id}')" class="m-store-btn">
                            Resgatar
                        </button>
                    </div>
                </div>
            `;
        });

        // 2. Prêmios Internos da Empresa
        const snap = await db.collection('premios').where('companyId', '==', currentUser.companyId).where('ativo', '==', true).get();
        if (!snap.empty) {
            snap.forEach(doc => {
                const p = doc.data();
                gridHtml += `
                    <div class="m-store-card internal animate__animated animate__fadeInUp">
                        <div class="m-store-card-top" style="display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background-color: #ffffff;">
                            <i class="fa-solid fa-gift" style="font-size: 44px; color: #fbbf24;"></i>
                        </div>
                        <div class="m-store-card-body">
                            <h4 class="m-store-title">${esc(p.nome)}</h4>
                            <p class="m-store-desc">Prêmio corporativo exclusivo.</p>
                            
                            <select class="m-store-select" disabled style="opacity: 1; cursor: default;">
                                <option>Valor único: ${p.preco} GC</option>
                            </select>
                            
                            <button onclick="solicitarResgateInternoMobile('${escAttr(doc.id)}', '${escAttr(p.nome)}', ${p.preco})" class="m-store-btn">
                                Resgatar
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        grid.innerHTML = gridHtml || '<p style="grid-column:1/-1; text-align:center; padding:20px; opacity:0.5;">A loja está vazia.</p>';

    } catch (err) {
        console.error("Mobile Store Error:", err);
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:20px; color:var(--color-danger);">Erro ao carregar a Loja.</p>`;
    }
};

window.solicitarResgateLocalGiftCardMobile = async function (productId) {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c) return;
    if (!c.creditCard) {
        return showToast('Sua empresa não possui um cartão corporativo de faturamento cadastrado. Resgates suspensos pelo administrador.', 'warning');
    }
    // Buscar no mesmo catálogo local
    const localGiftCardsCatalog = [];

    const cardData = localGiftCardsCatalog.find(x => x.id === productId);
    if (!cardData) return showToast('Produto não encontrado.', 'error');

    const select = document.getElementById(`select-val-mobile-${productId}`);
    if (!select) return;
    const valorBRL = parseFloat(select.value);

    if (!valorBRL) {
        return showToast('Escolha um valor.', 'warning');
    }

    const taxaCambio = c.exchangeRate || 10;
    const custoCoins = Math.round(valorBRL * taxaCambio);

    if ((currentUser.goCoins || 0) < custoCoins) {
        return showToast('Saldo insuficiente!', 'error');
    }

    const orcamentoRestante = (c.storeBudget || 500) - (c.spentThisMonth || 0);
    if (valorBRL > orcamentoRestante) {
        return showToast('Limite da empresa esgotado.', 'error');
    }

    // --- NOVO: Limite de Gasto Individual do Colaborador ---
    const limiteIndividual = c.gamiEmployeeLimitBRL || 0;
    if (limiteIndividual > 0) {
        const anoMesAtual = new Date().toISOString().substring(0, 7);
        try {
            const resgatesSnapshot = await db.collection('resgates')
                .where('userId', '==', currentUser.id)
                .get();
                
            let totalGastoMes = 0;
            resgatesSnapshot.forEach(doc => {
                const r = doc.data();
                if (r.createdAt && r.createdAt.substring(0, 7) === anoMesAtual) {
                    if (r.tipo === 'giftcard' || r.tipo === 'giftcard_reloadly') {
                        totalGastoMes += parseFloat(r.valorReais || 0);
                    }
                }
            });
            
            if (totalGastoMes + valorBRL > limiteIndividual) {
                return showToast(`Você já atingiu seu limite individual de resgates de R$ ${limiteIndividual.toLocaleString('pt-BR')} este mês. (Gasto atual: R$ ${totalGastoMes.toLocaleString('pt-BR')})`, 'error');
            }
        } catch (err) {
            console.error("Erro ao validar limite do colaborador:", err);
            return showToast('Falha ao validar seu limite de gastos mensal.', 'error');
        }
    }

    const logo = cardData.logo || '';
    const mensagemHtml = `
        <div style="text-align: center;">
            <div style="background: #1e293b; padding: 15px; border-radius: 12px; margin-bottom: 10px; display: inline-block;">
                <img src="${logo}" style="width: 60px; height: 60px; object-fit: contain;">
            </div>
            <p style="font-size: 15px; margin-bottom: 5px; font-weight: 800;">${cardData.name}</p>
            <p style="font-size: 13px; margin-bottom: 15px; opacity: 0.7;">Valor: R$ ${valorBRL}</p>
            <div style="display: inline-block; background: #fef3c7; color: #b45309; padding: 10px 20px; border-radius: 10px; font-weight: 900; font-size: 18px; border: 2px dashed #f59e0b;">
                - ${custoCoins} GC
            </div>
            <p style="font-size: 10px; color: var(--color-text-secondary); margin-top: 12px; line-height: 1.3;">O pedido será enviado para aprovação.<br>O código será disponibilizado em breve no seu painel.</p>
        </div>
    `;

    showConfirm(mensagemHtml, async () => {
        try {
            // Atualizar Saldos
            const novoSaldo = (currentUser.goCoins || 0) - custoCoins;
            await db.collection('usuarios').doc(String(currentUser.id)).update({ goCoins: novoSaldo });
            currentUser.goCoins = novoSaldo;

            const novoGasto = (c.spentThisMonth || 0) + valorBRL;
            await db.collection('empresas').doc(String(c.id)).update({ spentThisMonth: novoGasto });
            c.spentThisMonth = novoGasto;

            // Registrar Resgate
            const resgateId = Date.now().toString();
            await db.collection('resgates').doc(resgateId).set({
                id: resgateId,
                userId: currentUser.id,
                userName: currentUser.name,
                companyId: currentUser.companyId,
                premioNome: `${cardData.name} R$ ${valorBRL}`,
                preco: custoCoins,
                valorReais: valorBRL,
                status: 'pendente',
                tipo: 'giftcard',
                createdAt: new Date().toISOString()
            });

            showToast('🎉 Resgate solicitado com sucesso!', 'success');
            renderMobileStore(document.getElementById('mobileContent'));
        } catch (e) {
            showToast(`Erro: ${e.message}`, 'error');
        }
    }, 'Confirmar Resgate', 'Resgatar', 'btn-info');
};

window.solicitarResgateInternoMobile = function (id, nome, preco) {
    if ((currentUser.goCoins || 0) < preco) {
        return showToast('Saldo insuficiente de GoCoins!', 'error');
    }

    showConfirm(`Deseja resgatar o prêmio "${nome}" por ${preco} GoCoins?`, async () => {
        try {
            const newBalance = (currentUser.goCoins || 0) - preco;
            // Atualizar banco
            await db.collection('usuarios').doc(String(currentUser.id)).update({ goCoins: newBalance });
            currentUser.goCoins = newBalance;

            // Registrar solicitação
            await db.collection('resgates').add({
                userId: currentUser.id,
                userName: currentUser.name,
                companyId: currentUser.companyId,
                premioId: id,
                premioNome: nome,
                preco: preco,
                status: 'pendente',
                tipo: 'interno',
                createdAt: new Date().toISOString()
            });

            showToast('Resgate solicitado! O administrador entrará em contato para a entrega.', 'success');
            renderMobileStore(document.getElementById('mobileContent'));
            closeMobileModal();
        } catch (e) {
            showToast('Erro ao processar resgate.', 'error');
        }
    }, 'Confirmar Resgate', 'Sim, Resgatar', 'btn-success');
};

window.toggleMobileHybridMode = function () {
    const current = localStorage.getItem('feedbackgo_modo_hibrido') || 'admin';
    const next = current === 'admin' ? 'worker' : 'admin';
    localStorage.setItem('feedbackgo_modo_hibrido', next);

    // Fecha o menu gaveta/modal instantaneamente
    if (typeof closeMobileModal === 'function') closeMobileModal();

    showToast(`Modo ${next === 'admin' ? 'Administrador' : 'Colaborador'} ativado!`, 'success');

    // Força o retorno ao dashboard ao trocar de modo
    localStorage.setItem('feedbackgo_mobile_tab', 'dashboard');

    // Reinicializa a UI mobile para refletir as permissões do novo modo
    if (typeof initMobileApp === 'function') {
        initMobileApp();
    }
};

window.openMobileMenuGaveta = function () {
    const isAdmin = currentUser.role === 'admin' || (currentUser.role === 'hibrido' && (localStorage.getItem('feedbackgo_modo_hibrido') || 'admin') === 'admin');

    // Obter status do calendário
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const isCalActive = c ? c.calendarioEnabled === true : false;

    const menuHtml = `
        <div class="m-drawer-user-header">
             <div class="mobile-avatar" style="${currentUser.avatarUrl ? `background-image: url('${currentUser.avatarUrl}'); background-size: cover; color: transparent; border: none;` : ''}">
                ${currentUser.avatarUrl ? '' : currentUser.name.charAt(0).toUpperCase()}
            </div>
            <h4 style="margin: 0; font-size: 18px; color: var(--mobile-text);">${currentUser.name}</h4>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.6; color: var(--mobile-text-secondary);">${currentUser.email}</p>
            
            ${currentUser.role === 'hibrido' ? `
                ${(localStorage.getItem('feedbackgo_modo_hibrido') || 'admin') === 'admin' ? `
                    <button onclick="toggleMobileHybridMode()" style="margin-top: 15px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; color: white; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.25); width: 100%; font-family: inherit;">
                        <i class="fa-solid fa-user-astronaut"></i> Modo Colaborador
                    </button>
                ` : `
                    <button onclick="toggleMobileHybridMode()" style="margin-top: 15px; background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%); border: none; color: white; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.25); width: 100%; font-family: inherit;">
                        <i class="fa-solid fa-user-shield"></i> Modo Admin
                    </button>
                `}



            ` : ''}
        </div>

        <div class="m-drawer-nav-list">
            <div class="m-drawer-section-title">Preferências</div>
            <button class="m-nav-drawer-item" onclick="switchMobileTab('profile'); closeMobileModal();">
                <i class="fa-solid fa-gear"></i>
                <span>Configurações</span>
            </button>

            <div class="m-drawer-section-title">Navegação</div>
            ${isCalActive ? `
            <button class="m-nav-drawer-item" onclick="switchMobileTab('calendario'); closeMobileModal();">
                <i class="fa-regular fa-calendar-days"></i>
                <span>Calendário</span>
            </button>
            ` : ''}
            ${!isAdmin ? `
                ${(c && c.rewardsEnabled !== false) ? `
                <button class="m-nav-drawer-item" onclick="switchMobileTab('store'); closeMobileModal();">
                    <i class="fa-solid fa-store"></i>
                    <span>Loja de Recompensas</span>
                </button>
                <button class="m-nav-drawer-item" onclick="switchMobileTab('resgates'); closeMobileModal();">
                    <i class="fa-solid fa-ticket"></i>
                    <span>Meus Resgates</span>
                </button>
                ` : ''}
            ` : `
                ${(c && c.rewardsEnabled !== false) ? `
                <button class="m-nav-drawer-item" onclick="switchMobileTab('resgate_admin'); closeMobileModal();">
                    <i class="fa-solid fa-shop"></i>
                    <span>Loja & Recompensas</span>
                </button>
                ` : ''}
            `}
            
            ${isAdmin ? `
                <div class="m-drawer-section-title">Ferramentas Admin</div>
                <button class="m-nav-drawer-item" onclick="switchMobileTab('users'); closeMobileModal();">
                    <i class="fa-solid fa-users"></i>
                    <span>Colaboradores</span>
                </button>
                <button class="m-nav-drawer-item" onclick="switchMobileTab('teams'); closeMobileModal();">
                    <i class="fa-solid fa-people-group"></i>
                    <span>Equipes</span>
                </button>
                <button class="m-nav-drawer-item" onclick="switchMobileTab('reports'); closeMobileModal();">
                    <i class="fa-solid fa-chart-line"></i>
                    <span>Relatórios</span>
                </button>
            ` : ''}
        </div>
    `;

    openMobileModal('', menuHtml);
};

// Lógica de Arrastar para Fechar (Swipe-to-Close) - Versão Robusta
(function () {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let rafId = null;

    const TARGET_THRESHOLD = 110;

    const onTouchStart = (e) => {
        const sheet = e.target.closest('.mobile-modal-sheet');
        // Identifica se clicou no topo (handle ou header)
        const isHeader = e.target.closest('.sheet-handle') || e.target.closest('.sheet-header') || e.target.closest('.sheet-body-top-padding');

        if (sheet && (isHeader || sheet.scrollTop <= 0)) {
            startY = e.touches[0].pageY;
            currentY = startY;
            isDragging = true;
            sheet.style.transition = 'none';
        }
    };

    const onTouchMove = (e) => {
        if (!isDragging) return;

        const sheet = document.querySelector('.mobile-modal-overlay.active .mobile-modal-sheet');
        if (!sheet) return;

        currentY = e.touches[0].pageY;
        const diff = currentY - startY;

        if (diff > 0) {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                sheet.style.transform = `translateY(${diff}px)`;
            });
        }
    };

    const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        if (rafId) cancelAnimationFrame(rafId);

        const sheet = document.querySelector('.mobile-modal-overlay.active .mobile-modal-sheet');
        if (!sheet) return;

        const diff = currentY - startY;

        if (diff > TARGET_THRESHOLD) {
            // Anima a descida suavemente antes de fechar o modal
            sheet.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
            sheet.style.transform = 'translateY(100%)';

            // Aguarda a animação de descida terminar para limpar tudo e fechar de verdade
            setTimeout(() => {
                closeMobileModal();
            }, 300);
        } else {
            // Volta para o lugar com animação de "mola" (snap back)
            sheet.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            sheet.style.transform = 'translateY(0)';

            // Limpa o inline style após a animação de retorno
            setTimeout(() => { if (!isDragging) sheet.style.cssText = ''; }, 410);
        }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
})();

// --- SISTEMA DE EDIÇÃO MOBILE ---
window.openMobileEditModal = function (id) {
    const targetId = String(id);
    let a = activities.find(x => String(x.id) === targetId);

    // Se não achou em atividades, busca em tarefas delegadas
    if (!a && typeof tarefasDelegadas !== 'undefined') {
        a = tarefasDelegadas.find(x => String(x.id) === targetId);
    }

    if (!a) return;


    const comp = companies.find(c => c.id === currentUser.companyId);
    const categorias = comp && comp.categories ? comp.categories : ['Geral', 'Suporte', 'Desenvolvimento', 'Reunião'];

    const html = `
        <div style="padding: 10px;">
            <input type="hidden" id="mEditTaskId" value="${a.id}">

            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Título da Missão</label>
                <input type="text" id="mEditTitle" value="${a.title}" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 12px; font-size: 15px; font-weight: 600; outline: none;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Descrição / Notas</label>
                <textarea id="mEditDescription" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 12px; font-size: 14px; height: 100px; outline: none; resize: none;">${a.description || ''}</textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                     <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Status</label>
                     <select id="mEditStatus" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 12px; font-weight: 600; outline: none;">
                        <option value="pendente" ${a.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="andamento" ${a.status === 'andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluido" ${a.status === 'concluido' ? 'selected' : ''}>Concluido</option>
                        <option value="em_revisao" ${a.status === 'em_revisao' ? 'selected' : ''}>Em Revisão</option>
                     </select>
                </div>
                <div>
                    <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Data</label>
                    <input type="date" id="mEditDate" value="${a.date}" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 12px; font-weight: 600; outline: none;">
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <label style="display:block; font-size: 11px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Categoria</label>
                <select id="mEditCategory" style="width: 100%; background: var(--mobile-input-bg); border: 1px solid var(--mobile-border); color: var(--mobile-text); padding: 15px; border-radius: 12px; font-weight: 600; outline: none;">
                    ${categorias.map(cat => `<option value="${cat}" ${a.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                </select>
            </div>

            <button onclick="saveMobileEditTask()" id="btnSaveMEdit" style="width: 100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 16px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3); border: none; letter-spacing: 1px;">
                <i class="fa-solid fa-floppy-disk"></i> GUARDAR ALTERAÇÕES
            </button>
            <div style="height: 40px;"></div>
        </div>
    `;

    openMobileModal('Editar Missão', html);
};

window.saveMobileEditTask = function () {
    const targetId = String(document.getElementById('mEditTaskId').value);
    let a = activities.find(x => String(x.id) === targetId);

    // Se não achou em atividades, busca em tarefas delegadas
    if (!a && typeof tarefasDelegadas !== 'undefined') {
        a = tarefasDelegadas.find(x => String(x.id) === targetId);
    }

    if (!a) return;


    const btn = document.getElementById('btnSaveMEdit');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A GUARDAR...';

    const updates = {
        title: document.getElementById('mEditTitle').value,
        description: document.getElementById('mEditDescription').value,
        respostaFuncionario: document.getElementById('mEditDescription').value, // Sincroniza com observações
        status: document.getElementById('mEditStatus').value,
        date: document.getElementById('mEditDate').value,
        category: document.getElementById('mEditCategory').value

    };

    // Registro de Log se o status mudou
    if (a.status !== updates.status) {
        if (!a.logs) a.logs = [];
        a.logs.push({
            date: new Date().toISOString(),
            userName: currentUser.name,
            from: a.status,
            to: updates.status
        });
        updates.logs = a.logs;
    }

    // Determinar a coleção correta baseada no tipo de tarefa
    const collectionName = (a.adminId || a.senderId || a.delegadaPor || a.tipo === 'delegada') ? 'tarefas' : 'atividades';

    db.collection(collectionName).doc(targetId).update(updates).then(() => {

        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EDITAR_ATIVIDADE', `Editou a atividade: ${updates.title}`);
        }

        showToast('Missão atualizada!');
        closeMobileModal();

        // Atualiza a tela mantendo você onde estava (Dashboard ou Histórico)
        // Isso sincroniza o conteúdo E os botões da barra inferior
        if (typeof switchMobileTab === 'function') {
            switchMobileTab(currentMobileTab);
        } else if (typeof refreshMobileDashboard === 'function') {
            refreshMobileDashboard();
        }
    }).catch(err => {
        console.error("Erro ao salvar:", err);
        showToast('Erro ao salvar', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    });
};
// --- SISTEMA DE NOTIFICAÇÕES MOBILE (OVERRIDE DE ATALHOS) ---
window.abrirAbaPelaNotificacao = function (alvo, notifId) {
    if (notifId && notifId !== 'undefined' && notifId !== 'null') {
        db.collection('notificacoes').doc(String(notifId)).update({ lida: true }).catch(err => console.error("Erro ao marcar lida:", err));
    }

    if (!alvo || alvo === 'undefined' || alvo === 'null') {
        showToast('Esta notificação não possui um atalho configurado.', 'warning');
        return;
    }

    const isVisualAdmin = isCurrentModeAdmin();

    // Mapeamento de abas Desktop (acaoAlvo) -> IDs reais das abas no mobile.js
    const map = {
        'delegar': 'dashboard',
        'admin-loja': 'resgate_admin',
        'tarefas-recebidas': 'tasks',
        'calendario': 'calendario',
        'dashboard': 'dashboard',
        'perfil': 'profile',
        'history': 'history',
        'store': isVisualAdmin ? 'resgate_admin' : 'store',
        'resgates': 'resgates'
    };

    const mobileTab = map[alvo] || alvo;

    // Fecha o modal antes de trocar de aba
    closeMobileModal();

    // Validação final: Verifica se a aba alvo existe na UI mobile
    const validTabs = ['dashboard', 'tasks', 'history', 'profile', 'calendario', 'store', 'resgates', 'resgate_admin', 'reports', 'users', 'teams'];
    if (!validTabs.includes(mobileTab)) {
        showToast('Esta funcionalidade ainda não está disponível no mobile.', 'warning');
        return;
    }

    if (typeof renderMobileTab === 'function') {
        renderMobileTab(mobileTab);
    }
};

// --- SISTEMA DE NOTIFICAÇÕES MOBILE ---
window.toggleMobileNotifications = function () {
    // 1. Primeiro pegamos TUDO o que pertence ao usuário
    let allNotifs = (window.todasNotificacoesGlobais || []).filter(n => {
        return String(n.userId) === String(currentUser.id);
    });

    // 2. Aplicamos o filtro de Visibilidade (Role Context)
    const isVisualAdmin = isCurrentModeAdmin();
    allNotifs = allNotifs.filter(n => {
        const title = (n.titulo || '').toLowerCase();
        if (isVisualAdmin) {
            // Admins NÃO veem mensagens de "recebi tarefa" ou "missão aprovada"
            if (title.includes('aprovada') || title.includes('recebida')) return false;
        } else {
            // Colaboradores NÃO veem avisos de gestão
            if (title.includes('concluiu') || title.includes('entregue')) return false;
        }
        return true;
    });

    // 3. Só agora ordenamos e pegamos as 20 mais recentes
    let list = allNotifs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 20);

    const html = `
        <div style="padding: 5px; padding-bottom: 40px;">
            ${list.length ? list.map(n => {
        // Lógica de Ícone e Cor baseada no tipo (titulo)
        let icon = 'fa-bell';
        let color = '#3b82f6';
        const t = n.titulo.toLowerCase();

        if (t.includes('missão')) { icon = 'fa-trophy'; color = '#f59e0b'; }
        else if (t.includes('concluiu') || t.includes('entregue')) { icon = 'fa-envelope-open-text'; color = '#8b5cf6'; }
        else if (t.includes('recebida') || t.includes('nova tarefa')) { icon = 'fa-bullseye'; color = '#ef4444'; }
        else if (t.includes('aprovada')) { icon = 'fa-check-circle'; color = '#10b981'; }
        else if (t.includes('resgate') || t.includes('gocoins')) { icon = 'fa-coins'; color = '#f59e0b'; }

        return `
                <div onclick="window.abrirAbaPelaNotificacao('${n.acaoAlvo}', '${n.id}'); closeMobileModal();" 
                     style="padding: 16px; border-radius: 20px; background: ${n.lida ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${n.lida ? 'var(--mobile-border)' : color + '40'}; margin-bottom: 12px; transition: all 0.2s; position: relative; overflow: hidden;">
                    
                    ${!n.lida ? `<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${color};"></div>` : ''}

                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: ${color + '15'}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <strong style="font-size: 14px; color: var(--mobile-text);">${esc(n.titulo)}</strong>
                                <span style="font-size: 10px; color: var(--mobile-text-secondary); opacity: 0.7;">${n.createdAt ? new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--/--'}</span>
                            </div>
                            <p style="margin: 0; font-size: 12px; color: var(--mobile-text-secondary); line-height: 1.5;">${esc(n.mensagem)}</p>
                        </div>
                    </div>
                </div>
            `;
    }).join('') : `
                <div style="text-align: center; padding: 40px; opacity: 0.5;">
                    <i class="fa-solid fa-bell-slash" style="font-size: 40px; margin-bottom: 15px;"></i>
                    <p>Você não tem notificações no momento.</p>
                </div>
            `}
            <div style="height: 60px;"></div>
        </div>
    `;

    openMobileModal('Notificações', html);
};

// Toggle logic
window.toggleDarkModeMobile = function () {
    const isDark = !document.body.classList.contains('dark-mode');
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('feedbackgo_dark_mode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('feedbackgo_dark_mode', 'false');
    }

    // 🔥 SINCRONIZAÇÃO COM FIREBASE (INTEGRAÇÃO TOTAL)
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
        db.collection('usuarios').doc(currentUser.id.toString()).update({
            darkMode: isDark
        }).then(() => {
            currentUser.darkMode = isDark;
        }).catch(err => console.error("Erro ao salvar tema mobile:", err));
    }

    // Update any toggle switches on the screen
    document.querySelectorAll('.toggle-switch').forEach(sw => {
        if (isDark) sw.classList.add('on');
        else sw.classList.remove('on');
    });

    if (currentMobileTab === 'profile') renderMobileTab('profile');
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileApp);
} else {
    initMobileApp();
}

// --- OVERRIDE DE NOTIFICAÇÕES (TOAST) PARA MOBILE ---
window.showToast = function (message, type = 'success') {
    let toast = document.getElementById('mobileToast');

    // Auto-correção: Se o elemento não existir, cria um na hora
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mobileToast';
        toast.className = 'mobile-toast';
        document.body.appendChild(toast);
    }

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${esc(message)}</span>`;
    toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';

    // Mostra usando a classe do CSS
    toast.classList.add('show');
    toast.style.display = 'flex';

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3000);
};

window.renderMobileMyRedemptions = function (container) {
    if (!container) return;

    container.innerHTML = `
        <div id="mobileSharedPanel" class="m-section">
            <div class="loading-placeholder"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Carregando seus resgates...</p></div>
        </div>
    `;

    db.collection('resgates')
        .where('userId', '==', currentUser.id)
        .get()
        .then(snap => {
            let html = `
                <div class="m-section animate__animated animate__fadeIn">
            `;

            if (snap.empty) {
                html += `
                    <div style="text-align: center; padding: 60px 20px; opacity: 0.5;">
                        <i class="fa-solid fa-ticket" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p style="font-size: 14px; font-weight: 600;">Você ainda não resgatou prêmios.</p>
                        <small>Troque seus GoCoins na loja!</small>
                    </div>
                `;
            } else {
                let resgates = [];
                snap.forEach(doc => resgates.push({ id: doc.id, ...doc.data() }));

                resgates.sort((a, b) => {
                    const dateA = a.createdAt || '';
                    const dateB = b.createdAt || '';
                    return dateB.localeCompare(dateA);
                });

                html += `<div style="display: flex; flex-direction: column; gap: 15px;">`;
                resgates.forEach(r => {
                    const statusMap = {
                        'pendente': { label: 'Pendente', color: '#f59e0b', icon: 'fa-clock' },
                        'aprovado': { label: 'Aprovado', color: '#10b981', icon: 'fa-check' },
                        'entregue': { label: 'Entregue', color: '#3b82f6', icon: 'fa-box-open' },
                        'cancelado': { label: 'Cancelado', color: '#ef4444', icon: 'fa-xmark' }
                    };
                    const s = statusMap[r.status] || { label: r.status, color: '#64748b', icon: 'fa-circle-question' };

                    let dataFormatada = '--/--';
                    if (r.createdAt) {
                        try {
                            const d = new Date(r.createdAt);
                            dataFormatada = d.toLocaleDateString('pt-BR');
                        } catch (e) { }
                    }

                    html += `
                        <div class="m-card animate__animated animate__fadeInUp" style="padding: 20px; border-left: 5px solid ${s.color}; background: linear-gradient(145deg, var(--mobile-card-bg) 0%, rgba(30, 41, 59, 0.4) 100%); border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); border-top: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden;">
                            <!-- Subtle background glow -->
                            <div style="position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: ${s.color}; opacity: 0.05; filter: blur(30px); border-radius: 50%;"></div>
                            
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: relative; z-index: 2;">
                                <span style="font-size: 11px; font-weight: 800; opacity: 0.6; text-transform: uppercase; color: var(--mobile-text-secondary); letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">
                                    <i class="fa-regular fa-calendar" style="font-size: 12px;"></i> ${dataFormatada}
                                </span>
                                <span style="padding: 6px 14px; border-radius: 30px; background: ${s.color}15; color: ${s.color}; font-size: 10px; font-weight: 900; display: flex; align-items: center; gap: 6px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid ${s.color}33; box-shadow: 0 2px 8px ${s.color}15;">
                                    <i class="fa-solid ${s.icon}"></i> ${s.label}
                                </span>
                            </div>
                            
                            <h4 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: var(--mobile-text); letter-spacing: -0.3px; line-height: 1.3; position: relative; z-index: 2;">${esc(r.premioNome)}</h4>
                            
                            <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; position: relative; z-index: 2;">
                                <span style="color: #f59e0b; font-weight: 800; display: flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.1); padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.2);">
                                    <img src="Patentes/Moedas/GoCoins.svg" class="gocoin-icon" alt="Coins" style="width: 16px; height: 16px;"> ${r.preco} GC
                                </span>
                                ${r.valorReais ? `<span style="opacity: 0.7; color: var(--mobile-text-secondary); font-weight: 700; font-size: 13px; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 10px;">R$ ${r.valorReais}</span>` : ''}
                            </div>
                            
                             ${(r.voucherCode || r.codigoResgate || r.tipo === 'interno') ? `
                                <div style="margin-top: 20px; position: relative; z-index: 2;">
                                    <button onclick="verCodigoResgateMobile('${r.id}')" class="m-store-btn" style="width: 100%; padding: 14px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: white; border: none; border-radius: 12px; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3); transition: all 0.2s;">
                                        <i class="fa-solid fa-eye"></i> Detalhes do Prêmio
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                html += `</div>`;
            }
            html += `<div style="height: 100px;"></div></div>`;
            container.innerHTML = html;
        });
};

window.renderMobileAdminStore = function (container, activeTab = 'catalogo') {
    if (!container) return;

    // Layout Base com Abas
    container.innerHTML = `
        <div class="m-section animate__animated animate__fadeIn">


            <!-- Tabs -->
            <div style="display: flex; gap: 20px; border-bottom: 1px solid var(--mobile-border); margin-bottom: 20px;">
                <div onclick="renderMobileAdminStore(document.getElementById('mobileContent'), 'catalogo')" 
                     style="padding: 10px 0; font-size: 13px; font-weight: 700; cursor: pointer; color: ${activeTab === 'catalogo' ? '#10b981' : 'var(--mobile-text-secondary)'}; border-bottom: 2px solid ${activeTab === 'catalogo' ? '#10b981' : 'transparent'}; transition: 0.2s;">
                    Catálogo de Prêmios
                </div>
                <div onclick="renderMobileAdminStore(document.getElementById('mobileContent'), 'pedidos')" 
                     style="padding: 10px 0; font-size: 13px; font-weight: 700; cursor: pointer; color: ${activeTab === 'pedidos' ? '#10b981' : 'var(--mobile-text-secondary)'}; border-bottom: 2px solid ${activeTab === 'pedidos' ? '#10b981' : 'transparent'}; transition: 0.2s;">
                    Pedidos de Resgate
                </div>
            </div>

            <div id="mAdminStoreContent">
                <div class="loading-placeholder"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Carregando...</p></div>
            </div>
        </div>
    `;

    const contentDiv = document.getElementById('mAdminStoreContent');

    if (activeTab === 'catalogo') {
        renderMobileAdminStoreCatalogo(contentDiv);
    } else {
        renderMobileAdminStorePedidos(contentDiv);
    }
};

async function renderMobileAdminStoreCatalogo(container) {
    let html = `
        <div class="m-card animate__animated animate__fadeInUp" style="padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-weight: 800; font-size: 14px; color: var(--mobile-text);">
                <i class="fa-solid fa-circle-plus"></i> Adicionar Prêmio
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; opacity: 0.6; margin-bottom: 5px;">NOME DO PRÊMIO</label>
                    <input type="text" id="mAdminStoreNome" placeholder="Ex: iFood R$ 50,00" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--mobile-border); background: rgba(0,0,0,0.15); color: #fff; font-size: 14px; outline: none;">
                </div>
                <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; opacity: 0.6; margin-bottom: 5px;">PREÇO EM GOCOINS</label>
                    <input type="number" id="mAdminStorePreco" placeholder="Ex: 500" style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--mobile-border); background: rgba(0,0,0,0.15); color: #fff; font-size: 14px; outline: none;">
                </div>
                <div>
                    <label style="display: block; font-size: 11px; font-weight: 700; opacity: 0.6; margin-bottom: 5px;">DESCRIÇÃO</label>
                    <textarea id="mAdminStoreDesc" placeholder="Ex: Cartão presente digital do iFood..." style="width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--mobile-border); background: rgba(0,0,0,0.15); color: #fff; font-size: 14px; min-height: 80px; outline: none;"></textarea>
                </div>
                <button class="btn btn-mobile-primary" onclick="addMobilePremioInterno()" style="margin-top: 5px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-floppy-disk"></i> CADASTRAR PRÊMIO
                </button>
            </div>
        </div>

        <div id="mAdminStoreList" style="display: flex; flex-direction: column; gap: 12px;"></div>
    `;
    container.innerHTML = html;

    const listDiv = document.getElementById('mAdminStoreList');
    db.collection('premios').where('companyId', '==', currentUser.companyId).get().then(snap => {
        if (snap.empty) {
            listDiv.innerHTML = `<p style="text-align: center; opacity: 0.4; padding: 40px 0; font-size: 13px;">Nenhum prêmio cadastrado no seu cofre.</p>`;
            return;
        }

        let innerHtml = '';
        snap.forEach(doc => {
            const p = doc.data();
            const isAtivo = p.ativo !== false;
            innerHtml += `
            <div class="m-card animate__animated animate__fadeInUp" style="padding: 16px; margin-bottom: 12px; border-left: 4px solid ${isAtivo ? '#10b981' : '#64748b'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1; min-width: 0;">
                        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-gift" style="color: #10b981; font-size: 14px;"></i> ${esc(p.nome)}
                        </h4>
                        ${p.descricao ? `<p style="margin: 0 0 10px 0; font-size: 11px; opacity: 0.5; line-height: 1.4;">${esc(p.descricao)}</p>` : ''}
                        
                        <div style="display: inline-flex; align-items: center; gap: 5px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900;">
                            <img src="Patentes/Moedas/GoCoins.svg" class="gocoin-icon" alt="Coins"> ${p.preco} Coins
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px;">
                        <button onclick="toggleMobilePremioAtivo('${doc.id}', ${isAtivo})" 
                                style="background: ${isAtivo ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isAtivo ? '#ef4444' : '#10b981'}; border: none; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; transition: 0.2s;">
                            ${isAtivo ? 'Ocultar' : 'Mostrar na Loja'}
                        </button>
                        <button onclick="deleteMobilePremioInterno('${doc.id}')" 
                                style="background: rgba(239, 68, 68, 0.8); color: #fff; border: none; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        });
        listDiv.innerHTML = innerHtml;
    });
}

async function renderMobileAdminStorePedidos(container) {
    container.innerHTML = `
        <div id="mAdminResgatesList" style="display: flex; flex-direction: column; gap: 15px;">
            <div class="loading-placeholder"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
        </div>
        <div style="height: 100px;"></div>
    `;

    const listDiv = document.getElementById('mAdminResgatesList');
    db.collection('resgates')
        .where('companyId', '==', currentUser.companyId)
        .where('status', '==', 'pendente')
        .get()
        .then(snap => {
            if (snap.empty) {
                listDiv.innerHTML = `<p style="text-align: center; opacity: 0.4; padding: 40px 0; font-size: 13px;">Nenhum pedido pendente no momento.</p>`;
                return;
            }

            let innerHtml = '';
            let resgates = [];
            snap.forEach(doc => resgates.push({ id: doc.id, ...doc.data() }));
            resgates.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

            resgates.forEach(r => {
                const dataF = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '--/--';
                innerHtml += `
            <div class="m-card animate__animated animate__fadeInUp" style="padding: 16px; border-left: 4px solid #f59e0b;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; opacity: 0.5; margin-bottom: 8px; text-transform: uppercase;">
                    <i class="fa-regular fa-calendar"></i> PEDIDO EM: ${dataF}
                </div>
                <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800;">${esc(r.premioNome)}</h4>
                <div style="font-size: 12px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 4px;">
                    <span style="opacity: 0.8;"><strong>Colaborador:</strong> ${esc(r.userName)}</span>
                    <span style="opacity: 0.8;"><strong>Custo de Resgate:</strong> <span style="color: #f59e0b; font-weight: 700;"><img src="Patentes/Moedas/GoCoins.svg" class="gocoin-icon" alt="Coins"> ${r.preco} Coins</span></span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button onclick="updateMobileResgateStatus('${r.id}', 'entregue')" class="btn" style="background: #10b981; color: white; border: none; font-size: 11px; font-weight: 800; padding: 10px; border-radius: 8px;">
                        <i class="fa-solid fa-check"></i> ENTREGUE
                    </button>
                    <button onclick="updateMobileResgateStatus('${r.id}', 'cancelado')" class="btn" style="background: #ef4444; color: white; border: none; font-size: 11px; font-weight: 800; padding: 10px; border-radius: 8px;">
                        <i class="fa-solid fa-xmark"></i> CANCELAR
                    </button>
                </div>
            </div>
            `;
            });
            listDiv.innerHTML = innerHtml;
        });
}

window.addMobilePremioInterno = function () {
    const nome = document.getElementById('mAdminStoreNome').value.trim();
    const preco = parseInt(document.getElementById('mAdminStorePreco').value);
    const desc = document.getElementById('mAdminStoreDesc').value.trim();

    if (!nome || isNaN(preco)) return showToast('Nome e preço são obrigatórios!', 'warning');

    const id = Date.now().toString();
    showToast('Salvando prêmio...', 'info');
    db.collection('premios').doc(id).set({
        id: parseInt(id),
        companyId: currentUser.companyId,
        nome: nome,
        preco: preco,
        descricao: desc,
        ativo: true,
        createdAt: new Date().toISOString()
    }).then(() => {
        showToast('Prêmio cadastrado com sucesso!', 'success');
        renderMobileAdminStore(document.getElementById('mobileContent'), 'catalogo');
    }).catch(() => showToast('Erro ao salvar prêmio.', 'error'));
};

window.deleteMobilePremioInterno = function (id) {
    showConfirm('Deseja realmente excluir este prêmio do catálogo?', async () => {
        try {
            await db.collection('premios').doc(id).delete();
            showToast('Prêmio removido!', 'success');
            renderMobileAdminStore(document.getElementById('mobileContent'), 'catalogo');
        } catch (e) { showToast('Erro ao remover.', 'error'); }
    }, 'Excluir Prêmio', 'Sim, Excluir', 'btn-danger');
};

window.toggleMobilePremioAtivo = function (id, currentStatus) {
    const newStatus = !currentStatus;
    showToast(newStatus ? 'Ativando prêmio...' : 'Ocultando prêmio...', 'info');

    db.collection('premios').doc(id).update({
        ativo: newStatus
    }).then(() => {
        showToast(newStatus ? 'Prêmio visível na loja!' : 'Prêmio ocultado com sucesso.', 'success');
        renderMobileAdminStore(document.getElementById('mobileContent'), 'catalogo');
    }).catch(() => showToast('Erro ao atualizar status.', 'error'));
};

window.updateMobileResgateStatus = async function (id, status) {
    try {
        const resSnap = await db.collection('resgates').doc(id).get();
        if (!resSnap.exists) return showToast('Pedido não encontrado.', 'error');
        const rData = resSnap.data();

        // 🔥 Se for Gift Card e for para ENTREGAR, pede o PIN
        if (status === 'entregue' && rData.tipo === 'giftcard') {
            return openMobilePINModal(id);
        }

        const msg = status === 'entregue' ? 'Confirmar entrega deste prêmio?' : 'Cancelar este pedido? O saldo será devolvido ao colaborador.';
        const title = status === 'entregue' ? 'Finalizar Pedido' : 'Cancelar Pedido';

        showConfirm(msg, async () => {
            try {
                showToast('Processando...', 'info');

                if (status === 'cancelado') {
                    // Devolver GoCoins ao usuário
                    const uSnap = await db.collection('usuarios').doc(String(rData.userId)).get();
                    const uData = uSnap.data();
                    if (uData) {
                        const novoSaldo = (uData.goCoins || 0) + rData.preco;
                        await db.collection('usuarios').doc(String(rData.userId)).update({ goCoins: novoSaldo });
                    }
                }

                await db.collection('resgates').doc(id).update({
                    status: status,
                    updatedAt: new Date().toISOString()
                });

                showToast(status === 'entregue' ? 'Pedido finalizado!' : 'Pedido cancelado e saldo devolvido.', 'success');
                renderMobileAdminStore(document.getElementById('mobileContent'), 'pedidos');
            } catch (e) {
                console.error(e);
                showToast('Erro ao atualizar status.', 'error');
            }
        }, title, status === 'entregue' ? 'Sim, Entregue' : 'Sim, Cancelar', status === 'entregue' ? 'btn-success' : 'btn-danger');
    } catch (err) {
        showToast('Erro ao carregar dados do pedido.', 'error');
    }
};

window.openMobilePINModal = function (resgateId) {
    const html = `
        <div style="padding: 10px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
                <div style="background: rgba(16, 185, 129, 0.15); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #10b981;">
                    <i class="fa-solid fa-gift" style="font-size: 20px;"></i>
                </div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--mobile-text); letter-spacing: -0.5px;">Entregar PIN ao Colaborador</h3>
            </div>
            
            <p style="font-size: 13px; opacity: 0.7; line-height: 1.6; margin-bottom: 20px; color: var(--mobile-text);">
                Cole aqui o código PIN ou o Link do Gift Card (ex: IFD-8472-9912) para finalizar o resgate:
            </p>
            
            <input type="text" id="mPinInput" placeholder="Digite o código aqui..." 
                   style="width: 100%; padding: 16px; border-radius: 14px; border: 2.5px solid #10b981; background: rgba(0,0,0,0.25); color: #fff; font-size: 15px; font-weight: 600; outline: none; margin-bottom: 25px; transition: 0.3s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <button onclick="closeMobileModal()" class="btn" style="background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); padding: 14px; border-radius: 14px; font-weight: 700; border: none; font-size: 14px;">Cancelar</button>
                <button onclick="confirmarEntregaPINMobile('${resgateId}')" class="btn" style="background: #10b981; color: #fff; padding: 14px; border-radius: 14px; font-weight: 800; border: none; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                    <i class="fa-solid fa-check"></i> Aprovar Resgate
                </button>
            </div>
        </div>
    `;
    openMobileModal('Entrega', html);
    setTimeout(() => { document.getElementById('mPinInput')?.focus(); }, 300);
};

window.confirmarEntregaPINMobile = async function (resgateId) {
    const pin = document.getElementById('mPinInput').value.trim();
    if (!pin) return showToast('Por favor, digite o código do voucher.', 'warning');

    showToast('Finalizando resgate...', 'info');
    try {
        await db.collection('resgates').doc(resgateId).update({
            status: 'entregue',
            voucherCode: pin,
            updatedAt: new Date().toISOString()
        });

        showToast('Resgate aprovado e PIN entregue!', 'success');
        closeMobileModal();
        renderMobileAdminStore(document.getElementById('mobileContent'), 'pedidos');
    } catch (err) {
        showToast('Erro ao aprovar resgate.', 'error');
    }
};

window.copyMobileVoucher = function (texto) {
    if (!navigator.clipboard) {
        const textArea = document.createElement("textarea");
        textArea.value = texto;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Código copiado!', 'success');
        } catch (err) {
            showToast('Erro ao copiar.', 'error');
        }
        document.body.removeChild(textArea);
        return;
    }

    navigator.clipboard.writeText(texto).then(() => {
        showToast('Código copiado com sucesso!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar código.', 'error');
    });
};

window.traduzirParaPTBRMobile = async function(text) {
    if (!text) return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const json = await res.json();
        let translatedText = '';
        if (json && json[0]) {
            json[0].forEach(chunk => {
                if (chunk[0]) translatedText += chunk[0];
            });
        }
        return translatedText || text;
    } catch (e) {
        console.error('Erro na tradução:', e);
        return text;
    }
};

window.verCodigoResgateMobile = async function (resgateId) {
    showToast('Buscando informações...', 'info');
    try {
        const snap = await db.collection('resgates').doc(resgateId).get();
        if (!snap.exists) return showToast('Resgate não encontrado.', 'error');
        const r = snap.data();

        let codigo = r.voucherCode || r.codigoResgate;
        let instrucoes = r.instrucoes || '';

        if (!codigo || codigo === 'undefined' || codigo === '' || codigo === 'null') {
            return showToast('O código ainda não está disponível. Tente novamente em instantes.', 'warning');
        }

        // Tradução automática para Português
        const manualOverride = typeof window.getInstrucoesBrasil === 'function' ? window.getInstrucoesBrasil(r.premioNome) : null;

        if (instrucoes && !r.traduzidoParaPT && !manualOverride) {
            showToast('Traduzindo instruções para Português...', 'info');
            const traduzido = await window.traduzirParaPTBRMobile(instrucoes);
            
            if (traduzido && traduzido !== instrucoes) {
                instrucoes = traduzido;
                await db.collection('resgates').doc(String(resgateId)).update({ 
                    instrucoes: instrucoes,
                    traduzidoParaPT: true 
                });
            }
        }

        // Sobrescritas Manuais (evitar instruções incorretas ou de outras regiões)
        if (manualOverride) {
            instrucoes = manualOverride;
        }

        let instructionsHtml = '';
        if (instrucoes) {
            let formattedInstrucoes = instrucoes;
            formattedInstrucoes = formattedInstrucoes.replace(/https?:\/\/m\.mobilelegends\.com\/en\/codexchange\.?/gi, 'https://www.mobilelegends.com/redeem');
            formattedInstrucoes = formattedInstrucoes.replace(/(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.(?:com|org|net|io|us|br)[^\s]*)/gi, function(match) {
                let url = match;
                let suffix = '';
                if (url.match(/[.,;:)]$/)) {
                    suffix = url.slice(-1);
                    url = url.slice(0, -1);
                }
                let href = url.startsWith('http') ? url : 'https://' + url;
                return `<a href="${safeUrl(href)}" target="_blank" style="color: #3b82f6; text-decoration: underline;">${esc(url)}</a>${suffix}`;
            });
            formattedInstrucoes = formattedInstrucoes.replace(/\n/g, '<br>');

            instructionsHtml = `
                <div style="margin-bottom: 25px; font-size: 13px; color: var(--mobile-text-secondary); background: rgba(16, 185, 129, 0.05); padding: 15px; border-radius: 12px; text-align: left; border: 1px solid rgba(16, 185, 129, 0.2); max-height: 200px; overflow-y: auto;">
                    <strong style="color: #10b981; display: block; margin-bottom: 8px;"><i class="fa-solid fa-circle-info"></i> Como Resgatar:</strong>
                    <div style="line-height: 1.5;">${formattedInstrucoes}</div>
                </div>
            `;
        } else {
            instructionsHtml = `
                <div style="margin-bottom: 25px; font-size: 13px; color: var(--mobile-text-secondary); background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 12px; text-align: left; border: 1px solid rgba(245, 158, 11, 0.2);">
                    <i class="fa-solid fa-circle-exclamation" style="color: #f59e0b;"></i> Nenhuma instrução de resgate adicional fornecida para este prêmio.
                </div>
            `;
        }

        const isLink = codigo.startsWith('http');
        const html = `
            <div style="padding: 10px; text-align: center;">
                <div style="background: rgba(16, 185, 129, 0.1); width: 60px; height: 60px; border-radius: 20px; display: flex; align-items: center; justify-content: center; color: #10b981; margin: 0 auto 20px;">
                    <i class="fa-solid fa-gift" style="font-size: 30px;"></i>
                </div>
                
                <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 800; color: var(--mobile-text);">${esc(r.premioNome)}</h3>
                
                ${instructionsHtml}
                
                <div style="background: var(--mobile-input-bg); padding: 20px; border-radius: 15px; border: 2px dashed #10b981; margin-bottom: 25px;">
                    ${isLink ? `
                        <a href="${safeUrl(codigo)}" target="_blank" style="color: #3b82f6; font-weight: 800; font-size: 14px; word-break: break-all; text-decoration: underline;">
                            CLIQUE AQUI PARA ACESSAR O VOUCHER
                        </a>
                    ` : `
                        <span style="font-family: monospace; font-size: 22px; font-weight: 900; color: #10b981; letter-spacing: 2px; display: block; margin-bottom: 10px; word-break: break-all;">${esc(codigo)}</span>
                        <button onclick="copyMobileVoucher('${escAttr(codigo)}')" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; padding: 10px 18px; border-radius: 10px; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                            <i class="fa-solid fa-copy"></i> COPIAR CÓDIGO
                        </button>
                    `}
                </div>
                
                <button onclick="closeMobileModal()" style="width: 100%; padding: 15px; border-radius: 14px; background: var(--mobile-border); color: var(--mobile-text); border: none; font-weight: 800;">FECHAR</button>
            </div>
        `;
        openMobileModal('Detalhes do Resgate', html);
    } catch (err) {
        console.error(err);
        showToast('Erro ao recuperar código.', 'error');
    }
};


