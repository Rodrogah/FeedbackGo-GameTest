// 1. LÓGICA DO PAINEL DE ADMINISTRAÇÃO
function initAdminPanel(abaForcada = null) {
    // Inicialização de elementos do usuário
    if (!currentUser) return;

    // Foto de Perfil e Nome
    document.getElementById('sidebarAdminName').textContent = currentUser.name.split(' ')[0];
    const sideAvatar = document.getElementById('adminAvatar');
    if (sideAvatar) {
        if (currentUser.avatarUrl && currentUser.avatarUrl.includes('http')) {
            sideAvatar.innerHTML = `<img src="${currentUser.avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            sideAvatar.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--color-primary); color:white; border-radius:50%; font-weight:bold;">${currentUser.name.charAt(0).toUpperCase()}</div>`;
        }
    }

    // Botão do Modo Híbrido (Obrigatório se tiver o cargo)
    if (currentUser.role === 'hibrido') {
        let btnBox = document.getElementById('boxSwitchToFunc');
        if (!btnBox) {
            const nav = document.querySelector('#adminPanel .sidebar-nav');
            if (nav) {
                nav.insertAdjacentHTML('afterbegin', `
              <div id="boxSwitchToFunc" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; padding-left: 12px; padding-right: 12px; padding-top: 5px;">
                  <button onclick="alternarVisaoHibrida('func')" class="btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 100%; border-radius: 8px; font-size: 13px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2); border: none; color: white;">
                      <i class="fa-solid fa-user-astronaut"></i> Modo Colaborador
                  </button>
              </div>
            `);
            }
        }
    }

    // Carregamento paralelo dos dados da empresa
    const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
    if (c) {
        document.getElementById('admCompanySidebar').textContent = c.name;
    }

    updateCurrentDate('adminCurrentDate');

    // Navegação de abas
    let abaParaAbrir = abaForcada || localStorage.getItem('feedbackgo_aba_admin') || 'dashboard';
    abaParaAbrir = String(abaParaAbrir).replace(/['"]/g, '').trim();
    if (abaParaAbrir === 'null' || abaParaAbrir === 'undefined' || abaParaAbrir === '') {
        abaParaAbrir = 'dashboard';
    }

    showAdminSection(abaParaAbrir);

    // Visibilidade de funções extras (Gamificação e Calendário)
    if (typeof window.aplicarVisibilidadeGamificacao === 'function') window.aplicarVisibilidadeGamificacao();
    if (typeof window.aplicarVisibilidadeCalendario === 'function') window.aplicarVisibilidadeCalendario();

    setTimeout(runAutoCleanup, 5000);
}

window.aplicarVisibilidadeGamificacao = function () {
    if (!currentUser) return;

    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const isAtiva = c ? (c.gamificationEnabled === true) : false;
    const isRewardsAtiva = c ? (c.rewardsEnabled !== false) : true;

    // 1. IDs das abas laterais (Menu)
    const idsMenu = window.APP_CONFIG.defaults.ui.gamificationMenuIds;
    idsMenu.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            let mostrar = isAtiva;
            if (id.includes('loja') || id.includes('store') || id.includes('resgate')) {
                mostrar = isAtiva && isRewardsAtiva;
            }
            el.style.display = mostrar ? 'flex' : 'none';
        }
    });

    // 2. IDs de containers do Dashboard (Pódio, XP, etc.)
    const idsDash = window.APP_CONFIG.defaults.ui.gamificationDashboardIds;
    idsDash.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const container = el.closest('.card') || el.parentElement;
            if (container) container.style.display = isAtiva ? 'block' : 'none';
        }
    });

    // 3. Saldo de Moedas (GoCoins)
    const goCoinsDisplay = document.getElementById('goCoinsDisplay');
    if (goCoinsDisplay) {
        const coinStats = goCoinsDisplay.closest('.gami-item') || goCoinsDisplay.closest('.gami-stat-coins') || goCoinsDisplay.parentElement;
        if (coinStats) coinStats.style.setProperty('display', (isAtiva && isRewardsAtiva) ? 'flex' : 'none', 'important');
    }
};

window.aplicarVisibilidadeCalendario = function () {
    if (!currentUser) return;
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));

    const isAtiva = c ? (c.calendarioEnabled === true) : false;

    // console.log(`[Visibilidade] Calendário: ${isAtiva} | Empresa: ${c ? c.name : 'N/A'}`);

    const ids = window.APP_CONFIG.defaults.ui.calendarMenuIds;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isAtiva ? 'flex' : 'none';
    });
};

// Função global para troca de tela instantânea
window.alternarVisaoHibrida = function (destino) {
    // SALVA A ROUPA NOVA
    localStorage.setItem('feedbackgo_modo_hibrido', destino);

    const pAdmin = document.getElementById('adminPanel');
    const pFunc = document.getElementById('employeePanel');
    const splash = document.getElementById('splashLoadingGlobal');

    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 400);
    }

    if (destino === 'func') {
        if (pAdmin) { pAdmin.classList.add('hidden'); pAdmin.style.display = 'none'; }
        if (pFunc) {
            pFunc.classList.remove('hidden');
            pFunc.style.display = 'flex';
        }
        if (typeof initEmployeePanel === 'function') initEmployeePanel(localStorage.getItem('feedbackgo_aba_func'));
    } else {
        if (pFunc) { pFunc.classList.add('hidden'); pFunc.style.display = 'none'; }
        if (pAdmin) {
            pAdmin.classList.remove('hidden');
            pAdmin.style.display = 'flex';
        }
        if (typeof initAdminPanel === 'function') initAdminPanel(localStorage.getItem('feedbackgo_aba_admin'));
    }
};

async function showAdminSection(sec) {
    const palco = document.getElementById('adminConteudoDinamico');
    if (!palco) return;

    // Validação de rota
    sec = String(sec).replace(/['"]/g, '').trim();
    if (sec === 'null' || sec === 'undefined' || sec === '') sec = 'dashboard';
    localStorage.setItem('feedbackgo_aba_admin', sec);

    // O bloco try/catch impede que a tela fique branca se o botão não for encontrado
    try {
        document.querySelectorAll('#adminPanel .nav-item').forEach((i) => i.classList.remove('active'));
        const activeNav = document.querySelector(`#adminPanel .nav-item[onclick*="${sec}"]`);
        if (activeNav) activeNav.classList.add('active');
    } catch (e) { console.warn("Erro inofensivo no menu resolvido."); }

    const c = companies.find((x) => String(x.id) === String(currentUser?.companyId));

    if (!c) {
        palco.innerHTML = `
        <div style="text-align:center; padding:50px; color:var(--color-text-secondary); opacity: 0.8;">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><br><br>
            <strong>Carregando dados da empresa...</strong><br>
            <div style="margin-top:15px; font-size:12px; border-top:1px solid #333; padding-top:10px;">
                ID do seu utilizador: <code style="color:var(--color-primary)">${currentUser?.companyId || 'Nenhum'}</code><br>
                Empresas no banco: <code style="color:var(--color-primary)">${companies.length}</code>
            </div>
            <p style="margin-top:10px; font-size:11px;">Se o número de empresas for 0, o banco está vazio ou sem permissão.</p>
        </div>`;
        return;
    }

    const isGamiAtiva = c.gamificationEnabled === true;
    const isRewardsAtiva = c.rewardsEnabled !== false;

    const menuLojaAdmin = document.querySelector('#adminPanel .nav-item[onclick*="store"]');
    if (menuLojaAdmin) menuLojaAdmin.style.display = (isGamiAtiva && isRewardsAtiva) ? 'flex' : 'none';

    setTimeout(() => {
        const rankingAdmin = document.getElementById('rankingAdminContainer');
        if (rankingAdmin && !isGamiAtiva) rankingAdmin.parentElement.style.display = 'none';
    }, 100);

    palco.style.transition = 'opacity 0.1s ease';
    palco.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 50));

    palco.innerHTML = '<div style="text-align:center; padding:50px; opacity: 0.4;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
    palco.style.opacity = '1';

    try {
        const rotas = {
            dashboard: 'admin-dashboard.html',
            'new-task': 'admin-nova-atividade.html',
            'all-activities': 'admin-historico.html',
            users: 'admin-usuarios.html',
            teams: 'admin-equipes.html',
            reports: 'admin-relatorios.html',
            settings: 'admin-configuracoes.html',
            delegar: 'admin-delegar.html',
            store: 'admin-loja.html',
            calendario: 'admin-calendario.html'
        };

        if (sec === 'store' && (!isGamiAtiva || !isRewardsAtiva)) {
            sec = 'dashboard';
        }

        if (!rotas[sec]) sec = 'dashboard';

        const resposta = await fetch(`./telas/${rotas[sec]}?v=${new Date().getTime()}`);
        if (!resposta.ok) throw new Error('Ficheiro não encontrado.');
        palco.innerHTML = await resposta.text();
        palco.classList.remove('fade-entrar');
        void palco.offsetWidth;
        palco.classList.add('fade-entrar');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (sec === 'dashboard') {
            const dashTeam = document.getElementById('dashFilterTeam');
            if (dashTeam) dashTeam.innerHTML = '<option value="">Todas as Equipes</option>' + (c.teams || []).map((t) => `<option value="${t}">${t}</option>`).join('');
            refreshAdminDashboard();
        } else if (sec === 'new-task') {
            if (typeof setTodayDate === 'function') setTodayDate('adminTaskDate');
            const catEl = document.getElementById('adminTaskCategory');
            if (catEl) catEl.innerHTML = buildCategorySelectOptions(c.categories || defaultCategories);
            setupAdminNewTaskForm();
        } else if (sec === 'all-activities') {
            populateAdminFilters(c);
            loadAllActivities();
        } else if (sec === 'users') {
            const teamEl = document.getElementById('newUserTeam');
            if (teamEl) teamEl.innerHTML = (c.teams || []).map((t) => `<option value="${t}">${t}</option>`).join('');
            loadUsersTable();
            setupNewUserForm();
        } else if (sec === 'teams') {
            loadTeams(c);
            setupNewTeamForm();
        } else if (sec === 'reports') {
            const teamFilter = document.getElementById('reportFilterTeam');
            if (teamFilter) teamFilter.innerHTML = '<option value="">Todas as Equipes</option>' + (c.teams || []).map((t) => `<option value="${t}">${t}</option>`).join('');
            const userFilter = document.getElementById('reportFilterUser');
            if (userFilter) userFilter.innerHTML = '<option value="">Todos os Colaboradores</option>' + users.filter((u) => u.companyId === c.id).map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
            const catFilter = document.getElementById('reportFilterCategory');
            if (catFilter) catFilter.innerHTML = '<option value="">Todas as Categorias</option>' + (typeof buildCategorySelectOptions === 'function' ? buildCategorySelectOptions(c.categories || defaultCategories) : '');
            
            if (typeof window.setupAdminReports === 'function') window.setupAdminReports();
        } else if (sec === 'store') {
            if (typeof setupAdminStore === 'function') setupAdminStore();
        } else if (sec === 'settings') {
            const compInput = document.getElementById('settingsCompanyName');
            if (compInput) compInput.value = c.name;
            const profileInput = document.getElementById('admProfileName');
            if (profileInput) profileInput.value = currentUser.name;
            loadCategories(c);
            setupAdminSettingsForms();
            if (typeof window.setupAdminGamification === 'function') window.setupAdminGamification();
            if (typeof window.setupAdminCalendario === 'function') window.setupAdminCalendario();

            // Configuração do modo escuro na aba configurações
            setTimeout(() => {
                const check = document.getElementById('chkDarkMode');
                if (check && currentUser) {
                    check.checked = currentUser.darkMode === true;
                }
            }, 200);
        } else if (sec === 'delegar') {
            const catEl = document.getElementById('delegarCategoria');
            if (catEl) catEl.innerHTML = buildCategorySelectOptions(c.categories || defaultCategories);
            setupAdminDelegarForm();
            if (typeof loadTarefasEnviadas === 'function') loadTarefasEnviadas();
        } else if (sec === 'calendario') {
            if (typeof window.iniciarRadarCalendario === 'function') window.iniciarRadarCalendario();
            if (typeof window.renderizarCalendario === 'function') window.renderizarCalendario();
        }
    } catch (err) {
        palco.innerHTML = `<div class="alert alert-error">Erro ao carregar ecrã: ${err.message}</div>`;
    }

    setTimeout(() => {
        if (typeof window.aplicarVisibilidadeGamificacao === 'function') {
            window.aplicarVisibilidadeGamificacao();
        }
    }, 200);
}

window.refreshAdminDashboard = function () {
    updateAdminStats();
    loadAdminRecentActivities();
    if (typeof renderAdminCharts === 'function') renderAdminCharts();

    if (typeof window.renderRankingMensal === 'function') {
        window.renderRankingMensal('rankingAdminContainer');
    }

    const c = companies.find((x) => x.id === currentUser.companyId);
    const elAviso = document.getElementById('adminAnnouncementText');
    if (elAviso && c) elAviso.value = c.announcement || '';
};

window.saveAnnouncement = function () {
    const txt = document.getElementById('adminAnnouncementText').value;
    const btn = document.getElementById('btnSaveAnnouncement');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Publicar...';
    btn.disabled = true;
    db.collection('empresas')
        .doc(currentUser.companyId.toString())
        .update({ announcement: txt })
        .then(() => {
            showToast('Aviso publicado para todos!');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
};

window.dashActiveStatus = null;
window.dashActiveCategory = null;

window.clearAllDashFilters = function () {
    document.getElementById('dashFilterTeam').value = '';
    document.getElementById('dashFilterUser').value = '';
    document.getElementById('dashFilterCategory').value = '';
    document.getElementById('dashFilterStartDate').value = '';
    document.getElementById('dashFilterEndDate').value = '';
    window.dashActiveStatus = null;
    window.dashActiveCategory = null;
    refreshAdminDashboard();
};

function getFilteredDashboardData(ignoreStatus = false, ignoreCategory = false) {
    const team = document.getElementById('dashFilterTeam')?.value;
    const user = document.getElementById('dashFilterUser')?.value;
    const domCat = document.getElementById('dashFilterCategory')?.value;
    const startDate = document.getElementById('dashFilterStartDate')?.value;
    const endDate = document.getElementById('dashFilterEndDate')?.value;

    let f = activities.filter(a => a.companyId === currentUser.companyId);

    if (team) {
        const teamUsers = users.filter(u => u.team === team).map(u => u.id);
        f = f.filter(a => teamUsers.includes(a.userId));
    }
    if (user) f = f.filter(a => String(a.userId) === String(user));
    if (domCat) f = f.filter(a => a.category === domCat);
    if (startDate) f = f.filter(a => a.date >= startDate);
    if (endDate) f = f.filter(a => a.date <= endDate);

    if (!ignoreCategory && window.dashActiveCategory) {
        f = f.filter(a => a.category === window.dashActiveCategory);
    }
    if (!ignoreStatus && window.dashActiveStatus) {
        f = f.filter(a => a.status === window.dashActiveStatus);
    }
    return f;
}

function updateAdminStats() {
    const filtered = getFilteredDashboardData();

    const elTotal = document.getElementById('dashTotalActivities');
    const elConcluidas = document.getElementById('dashCompletedActivities');
    const elPendentes = document.getElementById('dashPendingActivities');
    const elAtivos = document.getElementById('dashActiveUsers');

    if (elTotal) elTotal.textContent = filtered.length;
    if (elConcluidas) elConcluidas.textContent = filtered.filter(a => a.status === 'concluido').length;
    if (elPendentes) elPendentes.textContent = filtered.filter(a => a.status === 'pendente' || a.status === 'andamento').length;

    if (elAtivos) {
        const countAtivos = users.filter(u => u.companyId === currentUser.companyId && u.isOnline).length;
        elAtivos.textContent = countAtivos;
    }
}

function loadAdminRecentActivities() {
    const el = document.getElementById('adminRecentActivities');
    if (!el) return;
    const lista = getFilteredDashboardData()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);
    el.innerHTML = generateActivityTableHTML(lista, true);
}

window.refreshAdminDashboard = function () {
    const c = companies.find((x) => x.id === currentUser.companyId);
    if (!c) return;

    const userSelect = document.getElementById('dashFilterUser');
    if (userSelect && userSelect.options.length <= 1) {
        userSelect.innerHTML = '<option value="">Todos Usuários</option>' +
            users.filter(u => u.companyId === currentUser.companyId && u.active)
                .map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }

    const catSelect = document.getElementById('dashFilterCategory');
    if (catSelect && catSelect.options.length <= 1) {
        catSelect.innerHTML = '<option value="">Todas Categorias</option>' +
            (c.categories || defaultCategories).map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    updateAdminStats();
    loadAdminRecentActivities();
    if (typeof renderAdminCharts === 'function') renderAdminCharts();
    if (typeof window.updateTaskCompletionChart === 'function') window.updateTaskCompletionChart();
    if (typeof renderRankingMensal === 'function') renderRankingMensal('rankingAdminContainer');
};

let adminStatusChartInstance = null;
let adminCategoryChartInstance = null;
let adminTimelineChartInstance = null;

window.renderAdminCharts = function () {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const actsForStatus = getFilteredDashboardData(true, false);
    const ctxStatus = document.getElementById('adminStatusChart');
    if (ctxStatus) {
        let conc = 0, and = 0, pend = 0, exp = 0;
        actsForStatus.forEach((a) => {
            if (a.status === 'concluido') conc++;
            else if (a.status === 'andamento') and++;
            else if (a.status === 'pendente') pend++;
            else if (a.status === 'nao_concluido') exp++;
        });

        const statusMap = ['concluido', 'andamento', 'pendente', 'nao_concluido'];
        const activeColors = isDark
            ? ['rgba(74, 222, 128, 0.9)', 'rgba(253, 224, 71, 0.9)', 'rgba(248, 113, 113, 0.9)', 'rgba(153, 27, 27, 0.9)']
            : ['rgba(34, 197, 94, 0.9)', 'rgba(234, 179, 8, 0.9)', 'rgba(239, 68, 68, 0.9)', 'rgba(153, 27, 27, 0.9)'];

        const inactiveColors = isDark
            ? ['rgba(74, 222, 128, 0.15)', 'rgba(253, 224, 71, 0.15)', 'rgba(248, 113, 113, 0.15)', 'rgba(153, 27, 27, 0.15)']
            : ['rgba(34, 197, 94, 0.2)', 'rgba(234, 179, 8, 0.2)', 'rgba(239, 68, 68, 0.2)', 'rgba(153, 27, 27, 0.2)'];

        const bgStatus = statusMap.map((st, i) => {
            if (!window.dashActiveStatus) return activeColors[i];
            return window.dashActiveStatus === st ? activeColors[i] : inactiveColors[i];
        });

        if (adminStatusChartInstance && document.body.contains(adminStatusChartInstance.canvas)) {
            adminStatusChartInstance.data.datasets[0].data = [conc, and, pend, exp];
            adminStatusChartInstance.data.datasets[0].backgroundColor = bgStatus;
            adminStatusChartInstance.data.datasets[0].borderColor = isDark ? '#1e293b' : '#ffffff';
            adminStatusChartInstance.options.plugins.legend.labels.color = textColor;
            adminStatusChartInstance.update();
        } else {
            if (adminStatusChartInstance) adminStatusChartInstance.destroy();
            adminStatusChartInstance = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Concluído', 'Em Andamento', 'Pendente', 'Expirada'],
                    datasets: [{
                        data: [conc, and, pend, exp],
                        backgroundColor: bgStatus,
                        borderWidth: 2,
                        borderColor: isDark ? '#1e293b' : '#ffffff',
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: {
                        animateRotate: true,
                        animateScale: false,
                        duration: 800,
                        easing: 'easeOutQuart'
                    },
                    onClick: (e, elements) => {
                        if (elements.length > 0) {
                            const clicked = statusMap[elements[0].index];
                            window.dashActiveStatus = (window.dashActiveStatus === clicked) ? null : clicked;
                            refreshAdminDashboard();
                        }
                    },
                    plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
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

                        const dataVals = chart.data.datasets[0].data;
                        const concVal = dataVals[0] || 0;
                        const andVal = dataVals[1] || 0;
                        const pendVal = dataVals[2] || 0;
                        const expVal = dataVals[3] || 0;
                        const total = concVal + andVal + pendVal + expVal;

                        let pct = 0;
                        let lColor = '#22c55e';
                        let lColorLight = 'rgba(34, 197, 94, 0.4)';

                        const activeSt = window.dashActiveStatus;
                        if (!activeSt) {
                            pct = total > 0 ? (concVal / total) : 0;
                            lColor = '#22c55e';
                            lColorLight = 'rgba(34, 197, 94, 0.4)';
                        } else if (activeSt === 'concluido') {
                            pct = total > 0 ? (concVal / total) : 0;
                            lColor = '#22c55e';
                            lColorLight = 'rgba(34, 197, 94, 0.4)';
                        } else if (activeSt === 'andamento') {
                            pct = total > 0 ? (andVal / total) : 0;
                            lColor = '#eab308';
                            lColorLight = 'rgba(234, 179, 8, 0.4)';
                        } else if (activeSt === 'pendente') {
                            pct = total > 0 ? (pendVal / total) : 0;
                            lColor = '#ef4444';
                            lColorLight = 'rgba(239, 68, 68, 0.4)';
                        } else if (activeSt === 'nao_concluido') {
                            pct = total > 0 ? (expVal / total) : 0;
                            lColor = '#991b1b';
                            lColorLight = 'rgba(153, 27, 27, 0.4)';
                        }

                        if (!chart.waveOffset) chart.waveOffset = 0;
                        chart.waveOffset += 0.04;

                        if (chart.currentPct === undefined) chart.currentPct = 0;
                        chart.currentPct += (pct - chart.currentPct) * 0.08;

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

    const actsForCategory = getFilteredDashboardData(false, true);
    const ctxCategory = document.getElementById('adminCategoryChart');
    if (ctxCategory) {
        const catCounts = {};
        actsForCategory.forEach((a) => {
            const c = a.category || 'Geral';
            catCounts[c] = (catCounts[c] || 0) + 1;
        });
        const labels = Object.keys(catCounts);
        const data = Object.values(catCounts);

        const bgColors = labels.map((cat) => {
            const hue = typeof getCategoryHue === 'function' ? getCategoryHue(cat) : 200;
            const isActive = !window.dashActiveCategory || window.dashActiveCategory === cat;
            const alpha = isActive ? (isDark ? '0.85' : '0.9') : '0.2';
            return `hsla(${hue}, 80%, 50%, ${alpha})`;
        });

        if (adminCategoryChartInstance && document.body.contains(adminCategoryChartInstance.canvas)) {
            adminCategoryChartInstance.data.labels = labels;
            adminCategoryChartInstance.data.datasets[0].data = data;
            adminCategoryChartInstance.data.datasets[0].backgroundColor = bgColors;
            adminCategoryChartInstance.options.scales.y.ticks.color = textColor;
            adminCategoryChartInstance.options.scales.y.grid.color = gridColor;
            adminCategoryChartInstance.options.scales.x.ticks.color = textColor;
            adminCategoryChartInstance.update();
        } else {
            if (adminCategoryChartInstance) adminCategoryChartInstance.destroy();
            adminCategoryChartInstance = new Chart(ctxCategory, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Atividades',
                        data: data,
                        backgroundColor: bgColors,
                        borderRadius: 4,
                    }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    onClick: (e, elements, chart) => {
                        if (elements.length > 0) {
                            const chartInstance = chart || e.chart;
                            const clickedCat = chartInstance.data.labels[elements[0].index];
                            window.dashActiveCategory = (window.dashActiveCategory === clickedCat) ? null : clickedCat;
                            refreshAdminDashboard();
                        }
                    },
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                        x: { ticks: { color: textColor }, grid: { display: false } },
                    }
                }
            });
        }
    }

    const actsTimeline = getFilteredDashboardData();
    const ctxTimeline = document.getElementById('adminTimelineChart');
    if (ctxTimeline) {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push(d.toISOString().split('T')[0]);
        }
        const dataTimeline = last7Days.map(date => actsTimeline.filter((a) => a.date === date).length);
        const labelsTimeline = last7Days.map((date) => {
            const p = date.split('-');
            return `${p[2]}/${p[1]}`;
        });

        if (adminTimelineChartInstance) adminTimelineChartInstance.destroy();
        adminTimelineChartInstance = new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: labelsTimeline,
                datasets: [{
                    label: 'Registros',
                    data: dataTimeline,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3, fill: true, tension: 0.3, pointBackgroundColor: '#3b82f6',
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: textColor }, grid: { color: gridColor } },
                    x: { ticks: { color: textColor }, grid: { display: false } },
                }
            }
        });
    }
};

// SISTEMA DE PAGINAÇÃO (ADMINISTRADOR)
let currentAdminPage = 1;
let currentAdminFilteredActs = [];

function loadAllActivities() {
    currentAdminPage = 1;
    applyAdminFilters(1);
}

function populateAdminFilters(c) {
    const tEl = document.getElementById('admFilterTeam');
    const uEl = document.getElementById('adminFilterUser');
    const cEl = document.getElementById('admFilterCategory');
    if (tEl)
        tEl.innerHTML = '<option value="">Todas as Equipes</option>' + (c.teams || []).map((t) => `<option value="${t}">${t}</option>`).join('');
    if (uEl)
        uEl.innerHTML = '<option value="">Todos os Colaboradores</option>' + users.filter((u) => u.companyId === c.id && u.active).map((u) => `<option value="${u.id}">${u.name}</option>`).join('');
    if (cEl)
        cEl.innerHTML = '<option value="">Todas as Categorias</option>' + (typeof buildCategorySelectOptions === 'function' ? buildCategorySelectOptions(c.categories || defaultCategories) : '');
}

window.applyAdminFilters = function (page = window.currentAdminPage || 1) {
    currentAdminPage = page;

    const t = document.getElementById('admFilterTeam') ? document.getElementById('admFilterTeam').value : '';
    const uId = document.getElementById('adminFilterUser') ? document.getElementById('adminFilterUser').value : '';
    const s = document.getElementById('adminFilterStartDate') ? document.getElementById('adminFilterStartDate').value : '';
    const e = document.getElementById('adminFilterEndDate') ? document.getElementById('adminFilterEndDate').value : '';
    const cat = document.getElementById('admFilterCategory') ? document.getElementById('admFilterCategory').value : '';
    const search = document.getElementById('admFilterSearch') ? document.getElementById('admFilterSearch').value.toLowerCase().trim() : '';

    const ordemEl = document.getElementById('ordemHistorico');
    const ordemEscolhida = ordemEl ? ordemEl.value : 'desc';

    let f = activities.filter((a) => a.companyId === currentUser.companyId);

    if (uId) f = f.filter((a) => a.userId === parseInt(uId));
    if (s) f = f.filter((a) => a.date >= s);
    if (e) f = f.filter((a) => a.date <= e);
    if (cat) f = f.filter((a) => a.category === cat);
    if (search) {
        f = f.filter((a) =>
            (a.title && a.title.toLowerCase().includes(search)) ||
            (a.description && a.description.toLowerCase().includes(search))
        );
    }
    if (t) {
        const tUs = users.filter((u) => u.team === t).map((u) => u.id);
        f = f.filter((a) => tUs.includes(a.userId));
    }

    currentAdminFilteredActs = f.sort((a, b) => {
        const dataA = a.date || '';
        const dataB = b.date || '';
        if (dataA === dataB) {
            const tempoA = new Date(a.createdAt || 0).getTime();
            const tempoB = new Date(b.createdAt || 0).getTime();
            return ordemEscolhida === 'asc' ? tempoA - tempoB : tempoB - tempoA;
        }
        return ordemEscolhida === 'asc' ? dataA.localeCompare(dataB) : dataB.localeCompare(dataA);
    });

    if (typeof renderAdminHistoryPage === 'function') renderAdminHistoryPage();
};

window.getFilteredReportData = function () {
    const t = document.getElementById('reportFilterTeam') ? document.getElementById('reportFilterTeam').value : '';
    const uId = document.getElementById('reportFilterUser') ? document.getElementById('reportFilterUser').value : '';
    const s = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
    const e = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

    const cat = document.getElementById('reportFilterCategory') ? document.getElementById('reportFilterCategory').value : '';
    const search = document.getElementById('reportFilterSearch') ? document.getElementById('reportFilterSearch').value.toLowerCase().trim() : '';

    let f = activities.filter((a) => a.companyId === currentUser.companyId);

    if (s) f = f.filter((a) => a.date >= s);
    if (e) f = f.filter((a) => a.date <= e);
    if (cat) {
        const norm = (str) => (str || '').replace(/::/g, '-').replace(/\s+/g, '').toLowerCase();
        f = f.filter((a) => norm(a.category) === norm(cat));
    }
    if (search) {
        f = f.filter((a) =>
            (a.title && a.title.toLowerCase().includes(search)) ||
            (a.description && a.description.toLowerCase().includes(search))
        );
    }

    if (t) {
        const tUs = users.filter((u) => u.team === t).map((u) => u.id);
        f = f.filter((a) => tUs.includes(a.userId));
    }
    if (uId) f = f.filter((a) => a.userId === parseInt(uId));

    return f.sort((a, b) => {
        const dataA = a.date || '';
        const dataB = b.date || '';

        if (dataA === dataB) {
            const tempoA = new Date(a.createdAt || 0).getTime();
            const tempoB = new Date(b.createdAt || 0).getTime();
            return tempoB - tempoA;
        }

        return dataB.localeCompare(dataA);
    });
};

window.renderAdminHistoryPage = function () {
    const el = document.getElementById('adminActivitiesTable');
    if (!el) return;

    const itemsPerPage = 20;
    const totalPages = Math.ceil(currentAdminFilteredActs.length / itemsPerPage) || 1;

    if (currentAdminPage > totalPages) currentAdminPage = totalPages;
    if (currentAdminPage < 1) currentAdminPage = 1;

    const start = (currentAdminPage - 1) * itemsPerPage;
    const actsPage = currentAdminFilteredActs.slice(start, start + itemsPerPage);

    let html = generateActivityTableHTML(actsPage, true);

    if (totalPages > 1) {
        html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; padding: 10px;">
          <button class="btn btn-secondary btn-small" onclick="applyAdminFilters(${currentAdminPage - 1})" ${currentAdminPage === 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-chevron-left"></i> Anterior
          </button>
          <span style="font-size: 14px; font-weight: bold; color: var(--color-text-secondary);">
              Página ${currentAdminPage} de ${totalPages}
          </span>
          <button class="btn btn-secondary btn-small" onclick="applyAdminFilters(${currentAdminPage + 1})" ${currentAdminPage === totalPages ? 'disabled' : ''}>
              Próxima <i class="fa-solid fa-chevron-right"></i>
          </button>
      </div>`;
    }

    el.innerHTML = html;
};

window.unsubscribeUsersTable = null;

window.loadUsersTable = function () {
    const el = document.getElementById('usersTable');
    if (!el) return;

    if (window.unsubscribeUsersTable) window.unsubscribeUsersTable();
    el.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando colaboradores...</div>';

    window.unsubscribeUsersTable = db.collection('usuarios')
        .where('companyId', '==', currentUser.companyId)
        .onSnapshot(snap => {
            let emps = [];
            snap.forEach(doc => emps.push(doc.data()));
            emps = emps.filter(u => u.active);

            if (!emps.length) {
                el.innerHTML = '<p>Sem colaboradores.</p>'; return;
            }

            el.innerHTML = `<div class="table-container"><table><thead><tr>
              <th style="text-align:center; width: 60px;">Status</th>
              <th>Nome</th><th>Equipe</th><th>E-mail</th><th>Ações</th>
          </tr></thead><tbody>${emps.map((u) => {

                const statusDot = u.isOnline
                    ? `<span title="Online agora" style="display:inline-block; width:12px; height:12px; background-color:#10b981; border-radius:50%; box-shadow: 0 0 6px #10b981;"></span>`
                    : `<span title="Offline" style="display:inline-block; width:12px; height:12px; background-color:#64748b; border-radius:50%;"></span>`;

                let badgeRole = '';
                if (u.role === 'admin') badgeRole = '<span class="badge" style="background:#EDE9FE;color:#7C3AED; margin-left: 5px;">Admin</span>';
                if (u.role === 'hibrido') badgeRole = '<span class="badge" style="background:#fef08a;color:#a16207; margin-left: 5px;"><i class="fa-solid fa-bolt"></i> Híbrido</span>';

                return `<tr>
              <td style="text-align:center;">${statusDot}</td>
              <td><strong>${u.name}</strong> ${badgeRole}</td>
              <td>${u.team || '-'}</td><td>${u.email}</td>
              <td style="display: flex; gap: 5px;">
                  <button onclick="abrirModalAcessos(${u.id})" class="btn-icon-only" title="Ver Histórico Diário" style="color: var(--color-info); background: rgba(59,130,246,0.1);"><i class="fa-solid fa-list-check"></i></button>
                  <button onclick="openEditUserModal(${u.id})" class="btn-icon-only edit" title="Editar"><i class="fa-solid fa-pen"></i></button>${u.id !== currentUser.id ? `<button onclick="deleteUser(${u.id})" class="btn-icon-only delete" title="Apagar"><i class="fa-solid fa-trash"></i></button>` : ''
                    }</td></tr>`;
            }).join('')}</tbody></table></div>`;
        });
};

window.deleteUser = function (id) {
    showConfirm(
        'Excluir este colaborador para sempre?',
        () => {
            db.collection('usuarios')
                .doc(id.toString())
                .delete()
                .then(() => {
                    if (window.registrarAcao) {
                        window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EXCLUIR_COLABORADOR', `Removeu o colaborador ID: ${id}`);
                    }
                    showToast('Excluído.');
                });
        },
        'Excluir Colaborador'
    );
};

function loadTeams(c) {
    const el = document.getElementById('teamsList');
    if (!el) return;

    const teamUsers = users.filter(u => u.companyId === currentUser.companyId && u.active);

    el.innerHTML = (c.teams || [])
        .map((t, i) => {
            const members = teamUsers.filter(u => u.team === t);
            const roleLabel = (role) => {
                if (role === 'admin') return '<span style="background:#EDE9FE;color:#7C3AED;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;">Admin</span>';
                if (role === 'hibrido') return '<span style="background:#fef08a;color:#a16207;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;"><i class="fa-solid fa-bolt" style="font-size:8px;"></i> Híbrido</span>';
                return '<span style="background:var(--color-bg-secondary);color:var(--color-text-secondary);padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;">Colaborador</span>';
            };

            return `<li style="padding:0; border:1px solid var(--color-border); border-radius:12px; margin-bottom:16px; overflow:hidden; background:var(--color-bg-primary);">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:var(--color-bg-secondary); border-bottom:1px solid var(--color-border);">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px;height:36px;background:var(--color-primary);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;">
              <i class="fa-solid fa-people-group"></i>
            </div>
            <div>
              <strong style="font-size:15px;">${t}</strong>
              <span style="display:block;font-size:11px;color:var(--color-text-secondary);">${members.length} membro${members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button onclick="deleteTeam(${i})" class="btn-icon-only delete" title="Apagar Equipe"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div style="padding:8px;">
          ${members.length > 0 ? members.map(m => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;margin-bottom:4px;">
              <div style="width:32px;height:32px;border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;${m.avatarUrl ? `background-image:url('${m.avatarUrl}');background-size:cover;color:transparent;` : 'background:rgba(16,185,129,0.1);color:#10b981;'}">
                ${m.avatarUrl ? '' : m.name.charAt(0).toUpperCase()}
                <div style="position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;border:2px solid var(--color-bg-primary);background:${m.isOnline ? '#10b981' : '#64748b'};"></div>
              </div>
              <div style="flex:1;min-width:0;">
                <span style="font-size:13px;font-weight:700;color:var(--color-text-primary);">${m.name}</span>
                <span style="display:block;font-size:11px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.email}</span>
              </div>
              ${roleLabel(m.role)}
            </div>
          `).join('') : '<div style="text-align:center;padding:20px;opacity:0.5;font-size:13px;"><i class="fa-solid fa-user-slash" style="margin-right:6px;"></i> Sem membros nesta equipe</div>'}
        </div>
      </li>`;
        })
        .join('');
}

window.deleteTeam = function (i) {
    let c = companies.find((x) => x.id === currentUser.companyId);
    c.teams.splice(i, 1);
    db.collection('empresas')
        .doc(c.id.toString())
        .update({ teams: c.teams })
        .then(() => {
            loadTeams(c);
            showToast('Equipe apagada');
        });
};

window.loadCategories = function (c) {
    const el = document.getElementById('categoriesList');
    if (!el) return;

    let groups = {};

    (c.categories || []).forEach((cat, i) => {
        let g = "Outros";
        let sub = cat;

        if (cat.includes(' - ')) {
            let parts = cat.split(' - ');
            g = parts[0].trim();
            sub = parts[1].trim();
        }

        if (!groups[g]) groups[g] = [];
        groups[g].push({ id: i, name: sub, full: cat });
    });

    let html = '';

    for (let g in groups) {
        html += `<div style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 8px; padding: 15px;">`;
        html += `<strong style="display:flex; align-items:center; gap: 8px; margin-bottom: 12px; color: var(--color-primary); border-bottom: 1px solid var(--color-border); padding-bottom: 8px;"><i class="fa-solid fa-layer-group"></i> ${g}</strong>`;
        html += `<div style="display: flex; gap: 8px; flex-wrap: wrap;">`;
        groups[g].forEach(item => {
            html += `<span class="badge cat-badge-dynamic" style="${getCategoryStyleString(item.full)} display:inline-flex; align-items:center; gap:6px; padding: 6px 14px; font-size:12px;">${item.name} <i class="fa-solid fa-circle-xmark" style="cursor:pointer; opacity: 0.8;" onclick="deleteCategory(${item.id})"></i></span>`;
        });
        html += `</div></div>`;
    }

    el.innerHTML = html;
};

window.deleteCategory = function (i) {
    let c = companies.find((x) => x.id === currentUser.companyId);
    if (c.categories.length > 1) {
        c.categories.splice(i, 1);
        db.collection('empresas')
            .doc(c.id.toString())
            .update({ categories: c.categories })
            .then(() => loadCategories(c));
    }
};

window.updateCompanyName = function () {
    const n = document.getElementById('settingsCompanyName').value.trim();
    if (!n) return;
    const btn = document.querySelector('button[onclick="updateCompanyName()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    db.collection('empresas')
        .doc(currentUser.companyId.toString())
        .update({ name: n })
        .then(() => {
            document.getElementById('admCompanySidebar').textContent = n;
            showToast('Nome atualizado!');
            if (btn)
                btn.innerHTML =
                    '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
        });
};

function setupAdminNewTaskForm() {
    const form = document.getElementById('adminNewTaskForm');
    if (!form) return;
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    const fileInput = novoForm.querySelector('#adminTaskAttachment');
    const fileListDisplay = novoForm.querySelector('#adminFileListDisplay');
    let arquivosSelecionados = [];

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const files = Array.from(this.files);
            if (files.length > 3) {
                showToast('Máximo de 3 arquivos!', 'error');
                this.value = '';
                fileListDisplay.innerHTML = '';
                arquivosSelecionados = [];
                return;
            }
            arquivosSelecionados = [];
            fileListDisplay.innerHTML = '';
            for (let i = 0; i < files.length; i++) {
                if (files[i].size > 1 * 1024 * 1024) {
                    showToast(`O arquivo ${files[i].name} é maior que 1MB!`, 'error');
                    this.value = '';
                    fileListDisplay.innerHTML = '';
                    arquivosSelecionados = [];
                    return;
                }
                arquivosSelecionados.push(files[i]);
                fileListDisplay.innerHTML += `<div class="custom-file-item"><i class="fa-solid fa-file-lines" style="color: var(--color-info);"></i> ${files[i].name}</div>`;
            }
        });
    }

    novoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = novoForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Processar...';
        btn.disabled = true;

        const novaAtividade = {
            companyId: currentUser.companyId,
            userId: currentUser.id,
            date: document.getElementById('adminTaskDate').value,
            category: document.getElementById('adminTaskCategory').value,
            title: document.getElementById('adminTaskTitle').value,
            description: document.getElementById('adminTaskDescription').value,
            status: document.getElementById('adminTaskStatus').value,
            createdAt: new Date().toISOString(),
            tipo: 'delegada',
            delegadaPor: currentUser.id,
            podeExcluir: false
        };

        const salvarNoBanco = (atividadeFinal) => {
            atividadeFinal.id = Date.now();
            db.collection('atividades').doc(atividadeFinal.id.toString()).set(atividadeFinal).then(() => {

                if (window.registrarAcao) {
                    window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'CRIAR_ATIVIDADE', `Registrou a atividade: ${atividadeFinal.title}`);
                }

                showAdminSection('dashboard').then(() => showToast('Atividade registrada!'));
            }).catch(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                showToast('Erro ao salvar!', 'error');
            });
        };

        if (arquivosSelecionados.length > 0) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Processar Anexos...';
            const promessasDeArquivos = arquivosSelecionados.map((file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function (evento) { resolve({ name: file.name, url: evento.target.result }); };
                    reader.readAsDataURL(file);
                });
            });
            Promise.all(promessasDeArquivos).then((anexosProntos) => {
                novaAtividade.attachments = anexosProntos;
                salvarNoBanco(novaAtividade);
            });
        } else {
            salvarNoBanco(novaAtividade);
        }
    });
}

function setupNewUserForm() {
    const form = document.getElementById('newUserForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('addUserBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...';
        btn.disabled = true;

        const em = document.getElementById('newUserEmail').value.trim();
        if (users.find((u) => u.email === em)) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            return showToast('E-mail já em uso.', 'error');
        }

        const rawPass = document.getElementById('newUserPassword').value;

        try {
            // Cria a conta no Firebase Auth (a senha fica no backend, nunca no Firestore)
            const cred = await firebase.auth().createUserWithEmailAndPassword(em, rawPass);
            const authUid = cred.user.uid;

            const nUser = {
                id: Date.now(),
                authUid: authUid,
                companyId: currentUser.companyId,
                name: document.getElementById('newUserName').value.trim(),
                email: em,
                role: document.getElementById('newUserRole')
                    ? document.getElementById('newUserRole').value
                    : 'funcionario',
                active: true,
                team: document.getElementById('newUserTeam').value,
            };
            await Promise.all([
                db.collection('usuarios').doc(nUser.id.toString()).set(nUser),
                db.collection('usuarioAuth').doc(authUid).set({
                    userId: nUser.id,
                    companyId: nUser.companyId,
                    role: nUser.role
                }),
            ]);

            form.reset();
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (typeof sendWelcomeEmail === 'function')
                sendWelcomeEmail(nUser.name, nUser.email, rawPass);
            if (window.registrarAcao) {
                window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'CRIAR_COLABORADOR', `Cadastrou o colaborador: ${nUser.name}`);
            }
            showToast('Colaborador criado!');
        } catch (err) {
            console.error("Erro ao criar colaborador:", err);
            btn.innerHTML = originalText;
            btn.disabled = false;
            const map = {
                'auth/email-already-in-use': 'E-mail já em uso.',
                'auth/invalid-email': 'E-mail inválido.',
                'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.'
            };
            showToast(map[err.code] || 'Erro ao criar colaborador.', 'error');
        }
    });
}

function setupNewTeamForm() {
    const form = document.getElementById('newTeamForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const n = document.getElementById('newTeamName').value.trim();
        let c = companies.find((x) => x.id === currentUser.companyId);
        if (!c.teams) c.teams = [];
        if (!c.teams.includes(n)) {
            c.teams.push(n);
            db.collection('empresas')
                .doc(c.id.toString())
                .update({ teams: c.teams })
                .then(() => {
                    document.getElementById('newTeamName').value = '';
                    showToast('Equipe criada!');
                    loadTeams(c);
                });
        } else {
            showToast('Equipe já existe!', 'error');
        }
    });
}

function setupAdminSettingsForms() {
    const catForm = document.getElementById('formNovaCategoria');
    if (catForm) {
        catForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const grupo = document.getElementById('newCategoryGroup').value.trim();
            const sub = document.getElementById('newCategoryName').value.trim();

            const n = grupo + " - " + sub;

            let c = companies.find((x) => x.id === currentUser.companyId);
            if (!c.categories) c.categories = [...defaultCategories];

            if (!c.categories.includes(n)) {
                c.categories.push(n);
                db.collection('empresas')
                    .doc(c.id.toString())
                    .update({ categories: c.categories })
                    .then(() => {
                        document.getElementById('newCategoryName').value = '';
                        loadCategories(c);
                        showToast('Subcategoria adicionada!');
                    });
            } else {
                showToast('Esta subcategoria já existe neste grupo!', 'error');
            }
        });
    }

    const profForm = document.getElementById('admProfileForm');
    if (profForm) {
        profForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const newName = document.getElementById('admProfileName').value.trim();
            const newPass = document.getElementById('admProfilePassword').value;
            const btn = profForm.querySelector('button');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

            let updates = { name: newName };
            if (newPass) {
                // A senha é alterada no Firebase Auth (nunca gravada no Firestore)
                try {
                    await firebase.auth().currentUser.updatePassword(newPass);
                } catch (err) {
                    showNotice('admProfileAlert', 'Erro ao alterar senha: ' + (err.message || 'tente novamente'), 'error');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
                    return;
                }
            }

            db.collection('usuarios')
                .doc(currentUser.id.toString())
                .update(updates)
                .then(() => {
                    if (newName) {
                        currentUser.name = newName;
                        document.getElementById('sidebarAdminName').textContent = currentUser.name.split(' ')[0];
                        document.getElementById('adminAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
                    }
                    document.getElementById('admProfilePassword').value = '';
                    showNotice('admProfileAlert', 'Perfil atualizado!', 'success');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
                });
        });
    }
}

window.openSettingsTab = function (tabId, btnElement) {
    document.querySelectorAll('.settings-tab-content').forEach((tab) => {
        tab.style.display = 'none';
    });

    const navContainer = btnElement.closest('.settings-nav-list');
    if (navContainer) {
        navContainer.querySelectorAll('.nav-list-item').forEach((btn) => btn.classList.remove('active'));
    }

    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.style.display = 'block';
    if (btnElement) btnElement.classList.add('active');
    if (tabId === 'tabPerfil' && typeof window.carregarPerfilEAvatar === 'function') {
        setTimeout(window.carregarPerfilEAvatar, 50);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.onTaskChartPeriodChange = function() {
  const periodSel = document.getElementById('taskChartPeriodFilter');
  const dateInput = document.getElementById('taskChartSpecificDate');
  if (dateInput) {
    dateInput.style.display = (periodSel && periodSel.value === 'custom_day') ? 'inline-block' : 'none';
  }
  window.updateTaskCompletionChart();
};

window.updateTaskCompletionChart = function() {
  const canvas = document.getElementById('taskCompletionChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const userSelect = document.getElementById('taskChartUserFilter');
  if (userSelect && currentUser) {
    const currentVal = userSelect.value;
    const companyUsers = (users || []).filter(u => u.companyId === currentUser.companyId && u.active !== false);
    
    let userHTML = '<option value="">Todas as Pessoas</option>';
    companyUsers.forEach(u => {
      const selected = String(u.id) === String(currentVal) ? 'selected' : '';
      userHTML += `<option value="${u.id}" ${selected}>${u.name}</option>`;
    });
    userSelect.innerHTML = userHTML;
  }

  let acts = (activities || []).filter(a => a.companyId === currentUser.companyId && (a.status === 'concluido' || !a.status));

  const selectedUserId = userSelect ? userSelect.value : '';
  if (selectedUserId) {
    acts = acts.filter(a => String(a.userId) === String(selectedUserId));
  }

  const periodSel = document.getElementById('taskChartPeriodFilter');
  const selectedPeriod = periodSel ? periodSel.value : 'all';

  const todayStr = getLocalToday();

  if (selectedPeriod === 'today') {
    acts = acts.filter(a => a.date === todayStr);
  } else if (selectedPeriod === 'week') {
    const curr = new Date();
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay()));
    const firstDayStr = firstDay.toISOString().split('T')[0];
    acts = acts.filter(a => a.date >= firstDayStr);
  } else if (selectedPeriod === 'month') {
    const monthStr = todayStr.substring(0, 7);
    acts = acts.filter(a => a.date && a.date.startsWith(monthStr));
  } else if (selectedPeriod === 'year') {
    const yearStr = todayStr.substring(0, 4);
    acts = acts.filter(a => a.date && a.date.startsWith(yearStr));
  } else if (selectedPeriod === 'custom_day') {
    const dateInput = document.getElementById('taskChartSpecificDate');
    const specificDate = dateInput ? dateInput.value : '';
    if (specificDate) {
      acts = acts.filter(a => a.date === specificDate);
    }
  }

  const volumeByTask = {};
  acts.forEach(a => {
    const title = a.title || 'Sem título';
    const vol = Number(a.quantidade || a.volume || a.qtd || 1);
    volumeByTask[title] = (volumeByTask[title] || 0) + (isNaN(vol) ? 1 : vol);
  });

  const taskTitles = Object.keys(volumeByTask).sort((a, b) => volumeByTask[b] - volumeByTask[a]);
  const volumes = taskTitles.map(t => volumeByTask[t]);

  const ctx = canvas.getContext('2d');
  if (taskCompletionChartInstance) {
    taskCompletionChartInstance.destroy();
  }

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const barColors = [
    'rgba(99, 102, 241, 0.85)',
    'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)',
    'rgba(239, 68, 68, 0.85)',
    'rgba(168, 85, 247, 0.85)',
    'rgba(14, 165, 233, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(20, 184, 166, 0.85)'
  ];
  const bgColors = taskTitles.map((_, i) => barColors[i % barColors.length]);

  taskCompletionChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: taskTitles.length ? taskTitles : ['Nenhuma atividade encontrada'],
      datasets: [{
        label: 'Volume Entregue',
        data: volumes.length ? volumes : [0],
        backgroundColor: bgColors,
        borderRadius: 8,
        borderWidth: 0,
        maxBarThickness: 50
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return ` Volume Total Entregue: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            color: textColor,
            font: { weight: 'bold', size: 11 },
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, precision: 0 }
        }
      }
    }
  });
};

window.generateReport = function () {
    const filtered = getFilteredReportData();
    document.getElementById('periodReport').innerHTML = generateActivityTableHTML(
        filtered,
        true
    );
    if (typeof window.updateTaskCompletionChart === 'function') {
        window.updateTaskCompletionChart();
    }
};

window.setupAdminReports = function () {
    const inputStart = document.getElementById('reportStartDate');
    const inputEnd = document.getElementById('reportEndDate');
    
    // Define initial dates if empty
    if (inputStart && inputEnd) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        if (!inputStart.value) inputStart.value = firstDay;
        if (!inputEnd.value) inputEnd.value = today;
    }

    // Define refresh logic globally if not defined
    if (typeof window.reportUpdateCount !== 'function') {
        window.reportUpdateCount = function () {
            try {
                var rows = window.getFilteredReportData ? window.getFilteredReportData() : [];
                var val  = document.getElementById('reportResultCountValue');
                if (val) val.textContent = rows.length;
            } catch(e) {
                console.error("Erro no reportUpdateCount:", e);
            }
        };
    }

    if (typeof window.reportTriggerRefresh !== 'function') {
        window.reportTriggerRefresh = function () {
            if (typeof generateReport === 'function') generateReport();
            if (typeof reportUpdateCount === 'function') reportUpdateCount();
        };
    }

    let _debounce;
    if (typeof window.reportAutoRefresh !== 'function') {
        window.reportAutoRefresh = function () {
            clearTimeout(_debounce);
            _debounce = setTimeout(window.reportTriggerRefresh, 100);
        };
    }

    // Attach events directly to elements since they are recreated
    ['reportFilterTeam', 'reportFilterUser', 'reportStartDate', 'reportEndDate', 'reportFilterCategory'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', window.reportTriggerRefresh);
            if (el.tagName === 'INPUT') el.addEventListener('input', window.reportTriggerRefresh);
        }
    });

    const search = document.getElementById('reportFilterSearch');
    if (search) {
        search.addEventListener('input', window.reportAutoRefresh);
    }

    // Force first render
    window.reportTriggerRefresh();
};

window.downloadReportExcel = function () {
    const a = getFilteredReportData();
    if (!a.length) return alert('Sem dados.');

    const statusLabel = {
        concluido:     'Concluído',
        andamento:     'Em Andamento',
        pendente:      'Pendente',
        em_revisao:    'Em Revisão',
        nao_concluido: 'Expirada',
    };

    const d = a.map((act) => {
        const u = users.find((x) => x.id === act.userId);
        return {
            Data: formatDate(act.date),
            Equipe: u ? u.team : '-',
            Colaborador: u ? u.name : '-',
            Categoria: act.category || 'Geral',
            Título: act.title,
            Detalhes: act.description || '-',
            Status: statusLabel[act.status] || act.status,
        };
    });
    const ws = XLSX.utils.json_to_sheet(d);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
    XLSX.writeFile(wb, 'Exportacao_FeedbackGo.xlsx');
};

window.openEditUserModal = function (id) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const c = companies.find((x) => x.id === currentUser.companyId);
    const teamEl = document.getElementById('editUserTeam');
    if (teamEl)
        teamEl.innerHTML = (c.teams || [])
            .map((t) => `<option value="${t}">${t}</option>`)
            .join('');
    document.getElementById('editUserId').value = u.id;
    document.getElementById('editUserName').value = u.name;
    document.getElementById('editUserRole').value = u.role;
    document.getElementById('editUserTeam').value = u.team || '';
    document.getElementById('editUserModal').classList.remove('hidden');
};
window.closeEditUserModal = function () {
    document.getElementById('editUserModal').classList.add('hidden');
};

const editUserForm = document.getElementById('editUserForm');
if (editUserForm) {
    editUserForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const btn = editUserForm.querySelector('button[type="submit"]');
        const txtOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Guardar...';
        btn.disabled = true;

        let updates = {
            name: document.getElementById('editUserName').value.trim(),
            role: document.getElementById('editUserRole').value,
            team: document.getElementById('editUserTeam').value,
        };
        db.collection('usuarios')
            .doc(id.toString())
            .update(updates)
            .then(() => {
                if (window.registrarAcao) {
                    window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EDITAR_COLABORADOR', `Editou o perfil de: ${updates.name}`);
                }
                if (id === currentUser.id) {
                    currentUser.name = updates.name;
                    currentUser.role = updates.role;
                    currentUser.team = updates.team;
                    document.getElementById('sidebarAdminName').textContent =
                        currentUser.name.split(' ')[0];
                }
                closeEditUserModal();
                showToast('Atualizado!');
                btn.innerHTML = txtOriginal;
                btn.disabled = false;
            });
    });
}

// =========================================================
// SISTEMA DE DELEGAÇÃO DE TAREFAS (GESTOR DE EQUIPES)
// =========================================================

function setupAdminDelegarForm() {
    const form = document.getElementById('formDelegarTarefa');
    if (!form) return;
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    // 🔥 O "CÉREBRO" DO ALGORITMO (COM CAIXA DUPLA E SCROLL EMBUTIDO)
    const renderizarListaInteligente = () => {
        const container = document.getElementById('listaCheckFuncionarios');
        if (!container) return;

        // 1. DESTRÓI A CAIXA ANTIGA QUE QUEBRAVA O MODO ESCURO E O SCROLL
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.padding = '0';
        container.style.maxHeight = 'none';
        container.style.overflow = 'visible';
        container.style.boxShadow = 'none';

        const selectCat = novoForm.querySelector('#delegarCategoria');
        const categoriaSelecionada = selectCat ? selectCat.value : '';
        const funcDaEmpresa = users.filter(u => u.companyId === currentUser.companyId && u.active);

        // Extração de Estatísticas Complexas
        const stats = {};
        funcDaEmpresa.forEach(u => stats[u.id] = { vezes: 0, somaQtd: 0, mediaQtd: 0, somaXp: 0, score: 0 });

        const atividadesDaCategoria = activities.filter(a =>
            a.companyId === currentUser.companyId &&
            a.status === 'concluido' &&
            a.category === categoriaSelecionada
        );

        let totalQtdGlobal = 0;
        let totalEntregasGlobal = 0;

        atividadesDaCategoria.forEach(a => {
            const uId = a.userId;
            if (stats[uId]) {
                const qtd = parseInt(a.quantidade) || 0;
                stats[uId].vezes++;
                stats[uId].somaQtd += qtd;
                stats[uId].somaXp += (parseInt(a.xpEarned) || 0);

                // Só conta na média global usuários que já saíram da fase de calibragem
                if (stats[uId].vezes >= 5) {
                    totalQtdGlobal += qtd;
                    totalEntregasGlobal++;
                }
            }
        });

        const mediaGlobal = totalEntregasGlobal > 0 ? (totalQtdGlobal / totalEntregasGlobal) : 0;

        // Cálculo do "Score" com Trava de 5 Entregas
        funcDaEmpresa.forEach(u => {
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

        funcDaEmpresa.sort((a, b) => stats[b.id].score - stats[a.id].score);

        if (funcDaEmpresa.length === 0) {
            container.innerHTML = '<p style="text-align: center; opacity: 0.6;">Nenhum colaborador encontrado.</p>';
            return;
        }

        const indicados = funcDaEmpresa.filter(u => stats[u.id].vezes >= 5).slice(0, 6);
        const outros = funcDaEmpresa.filter(u => !indicados.includes(u));

        const gerarCard = (u, isIndicado) => {
            const s = stats[u.id];
            let infoEstatisticas = '';

            if (s.vezes >= 5) {
                const tagDesempenho = s.mediaQtd > mediaGlobal
                    ? '<span style="color: #10b981; font-weight: 900; font-size: 15px;"><i class="fa-solid fa-arrow-trend-up"></i> Acima</span>'
                    : '<span style="color: #64748b; font-weight: 900; font-size: 15px;"><i class="fa-solid fa-minus"></i> Na Média</span>';

                let qualidadeVisual = "⭐⭐⭐⭐⭐";
                if (s.score < 50) qualidadeVisual = "⭐⭐⭐⭐";
                if (s.score < 30) qualidadeVisual = "⭐⭐⭐";

                const mediaArredondada = Math.round(s.mediaQtd);

                // As caixas agora usam var(--color-bg-secondary) para se adaptarem ao Modo Escuro perfeitamente
                infoEstatisticas = `
            <div style="margin-top: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                
                <div style="background: var(--color-bg-secondary, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-left: 4px solid #3b82f6; border-radius: 6px; padding: 6px 15px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                    <span style="font-size: 10px; color: var(--color-text-secondary, #64748b); font-weight: 800; text-transform: uppercase;">Total de Entregas</span>
                    <span style="font-size: 16px; font-weight: 900; color: var(--color-text-primary, #1e293b); margin-top: 2px;">${s.vezes}</span>
                </div>

                <div style="background: var(--color-bg-secondary, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-left: 4px solid #f59e0b; border-radius: 6px; padding: 6px 15px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                    <span style="font-size: 10px; color: var(--color-text-secondary, #64748b); font-weight: 800; text-transform: uppercase;">Média de Entregas</span>
                    <span style="font-size: 16px; font-weight: 900; color: var(--color-text-primary, #1e293b); margin-top: 2px;">${mediaArredondada}</span>
                </div>

                <div style="background: var(--color-bg-secondary, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-left: 4px solid #10b981; border-radius: 6px; padding: 6px 15px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                    <span style="font-size: 10px; color: var(--color-text-secondary, #64748b); font-weight: 800; text-transform: uppercase;">Desempenho</span>
                    <div style="margin-top: 2px;">${tagDesempenho}</div>
                </div>

                <div style="background: var(--color-bg-secondary, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); border-left: 4px solid #a855f7; border-radius: 6px; padding: 6px 15px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                    <span style="font-size: 10px; color: var(--color-text-secondary, #64748b); font-weight: 800; text-transform: uppercase;">Qualidade</span>
                    <span style="font-size: 11px; margin-top: 4px; letter-spacing: 1px;">${qualidadeVisual}</span>
                </div>

            </div>`;
            } else if (s.vezes > 0 && s.vezes < 5) {
                infoEstatisticas = `
            <div style="font-size: 11px; color: #854d0e; background: #fef9c3; margin-top: 8px; padding: 8px; border-radius: 6px; border: 1px dashed #fcd34d; font-weight: 600;">
                <i class="fa-solid fa-hourglass-half"></i> Histórico: <span style="color: #854d0e !important; font-weight: 900;">${s.vezes} de 5</span> entregas anteriores concluídas nesta categoria. (Calibrando perfil...).
            </div>`;
            } else {
                infoEstatisticas = `<div style="font-size: 11px; color: var(--color-text-secondary); margin-top: 8px; opacity: 0.6;"><i class="fa-solid fa-circle-info"></i> Nunca realizou este serviço.</div>`;
            }

            const bordaDestaque = isIndicado ? 'border: 1px solid var(--color-success); background: rgba(16, 185, 129, 0.05);' : '';
            const seloIndicado = isIndicado ? `<span style="background: #10b981; color: white; font-size: 10px; padding: 4px 10px; border-radius: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);"><i class="fa-solid fa-award"></i> Indicado</span>` : '';

            return `
        <div style="margin-bottom: 8px;">
            <input type="checkbox" name="funcDelegado" value="${u.id}" id="checkFunc_${u.id}" class="input-hidden" style="display: none;">
            <label for="checkFunc_${u.id}" class="green-dot-item" style="cursor: pointer; display: flex; flex-direction: column; width: 100%; box-sizing: border-box; transition: 0.2s; ${bordaDestaque}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="dot"></div>
                        <span style="font-size: 14px; color: var(--color-text-primary);"><strong>${u.name}</strong> <small style="opacity:0.7">(${u.team || 'Sem Equipe'})</small></span>
                    </div>
                    ${seloIndicado}
                </div>
                ${infoEstatisticas}
            </label>
        </div>`;
        };

        // 🔥 2. A MÁGICA DA CAIXA DUPLA (Scroll flutuante camuflado na cor do fundo)
        let htmlFinal = `
    <style>
        /* Truque da borda invisível: faz o scroll parecer flutuante e afasta da direita */
        .scroll-inteligente::-webkit-scrollbar { width: 14px; }
        .scroll-inteligente::-webkit-scrollbar-track { background: transparent; }
        .scroll-inteligente::-webkit-scrollbar-thumb { 
            background-color: var(--color-border, #cbd5e1); 
            border-radius: 10px; 
            border: 4px solid var(--color-bg-primary, #ffffff); 
        }
        .scroll-inteligente::-webkit-scrollbar-thumb:hover {
            background-color: var(--color-text-secondary, #94a3b8);
        }
    </style>
    
    <div style="background: var(--color-bg-primary, #ffffff); border: 1px solid var(--color-border, #e2e8f0); border-radius: 12px; padding: 10px 8px 10px 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
        <div class="scroll-inteligente" style="max-height: 250px; overflow-y: auto; overflow-x: hidden; padding-right: 14px;">
    `;

        // Títulos e Linhas construídos com CSS Grid
        if (indicados.length > 0) {
            htmlFinal += `
        <div style="display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 15px; margin: 5px 0 15px 0; width: 100%;">
            <span style="font-size: 12px; font-weight: 900; color: var(--color-success, #10b981); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                <i class="fa-solid fa-ranking-star"></i> Pessoas Indicadas
            </span>
            <div style="height: 2px; background-color: var(--color-border, #e2e8f0); width: 100%; border-radius: 2px;"></div>
        </div>`;
            htmlFinal += indicados.map(u => gerarCard(u, true)).join('');
        } else {
            htmlFinal += `
        <div style="display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 15px; margin: 5px 0 15px 0; width: 100%;">
            <span style="font-size: 12px; font-weight: 900; color: var(--color-success, #10b981); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                <i class="fa-solid fa-ranking-star"></i> Pessoas Indicadas
            </span>
            <div style="height: 2px; background-color: var(--color-border, #e2e8f0); width: 100%; border-radius: 2px;"></div>
        </div>
        <div style="background: rgba(0,0,0,0.02); border: 1px dashed var(--color-border, #cbd5e1); border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 15px;">
            <i class="fa-solid fa-user-astronaut" style="font-size: 20px; color: var(--color-text-secondary, #64748b); margin-bottom: 8px; opacity: 0.5;"></i>
            <p style="margin: 0; font-size: 12px; color: var(--color-text-secondary, #64748b);">Nenhuma indicação ainda.<br><small>Os colaboradores precisam de concluir pelo menos <strong>5 entregas</strong> para registrar suas estátisticas.</small></p>
        </div>`;
        }

        if (outros.length > 0) {
            htmlFinal += `
        <div style="display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 15px; margin: 25px 0 15px 0; width: 100%;">
            <span style="font-size: 12px; font-weight: 800; color: var(--color-text-secondary, #64748b); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                <i class="fa-solid fa-users"></i> Outros Colaboradores
            </span>
            <div style="height: 2px; background-color: var(--color-border, #e2e8f0); width: 100%; border-radius: 2px;"></div>
        </div>`;
            htmlFinal += outros.map(u => gerarCard(u, false)).join('');
        }

        htmlFinal += `
        </div>
    </div>`;

        container.innerHTML = htmlFinal;
    };

    const selectCategoria = novoForm.querySelector('#delegarCategoria');
    if (selectCategoria) {
        selectCategoria.addEventListener('change', renderizarListaInteligente);
    }

    // Roda a primeira vez ao abrir a tela
    renderizarListaInteligente();

    // =============== RESTANTE DA LÓGICA DE UPLOAD E ENVIO ===============
    const areaArquivos = novoForm.querySelector('.file-drop-area');
    if (areaArquivos && !document.getElementById('boxPrazoEDificuldade')) {
        const c = companies.find(x => x.id === currentUser.companyId);
        const isGamiAtiva = c && c.gamificationEnabled === true;

        const formGroupArquivos = areaArquivos.parentNode;
        const divContainer = document.createElement('div');
        divContainer.id = 'boxPrazoEDificuldade';
        divContainer.style.marginTop = "15px";
        divContainer.style.display = "grid";
        // Se a loja estiver ativa divide em 2 colunas, se não, o Prazo ocupa tudo
        divContainer.style.gridTemplateColumns = isGamiAtiva ? "1fr 1fr" : "1fr";
        divContainer.style.gap = "15px";

        let htmlExtra = `
          <div class="form-group" style="margin: 0;">
              <label><i class="fa-solid fa-calendar-day"></i> Prazo Limite (Opcional)</label>
              <input type="date" id="delegarPrazo" class="form-control" style="border: 2px solid var(--color-border); background: var(--color-bg-secondary); cursor: pointer;">
              <small style="color: var(--color-text-secondary); font-size: 11px;">Vence hoje à meia-noite se ficar em branco.</small>
          </div>
      `;

        if (isGamiAtiva) {
            htmlExtra += `
          <div class="form-group" style="margin: 0;">
              <label><i class="fa-solid fa-layer-group"></i> Dificuldade & Recompensa</label>
              <select id="delegarDificuldade" class="form-control" style="border: 2px solid var(--color-primary); background: rgba(16, 185, 129, 0.05);">
                  <option value="2">Fácil (Peso 2 - 100 XP)</option>
                  <option value="3" selected>Média (Peso 3 - 150 XP)</option>
                  <option value="4">Difícil (Peso 4 - 200 XP)</option>
              </select>
          </div>`;
        }

        divContainer.innerHTML = htmlExtra;
        formGroupArquivos.parentNode.insertBefore(divContainer, formGroupArquivos.nextSibling);
    }

    // ... (código dos anexos continua igual)
    let arquivosSelecionados = [];
    const fileInput = novoForm.querySelector('#delegarArquivos');
    const fileListDisplay = novoForm.querySelector('#delegarArquivosLista');

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const files = Array.from(this.files);
            if (files.length > 3) return showToast('Máximo de 3 arquivos!', 'error');
            arquivosSelecionados = [];
            fileListDisplay.innerHTML = '';
            for (let i = 0; i < files.length; i++) {
                if (files[i].size > 1 * 1024 * 1024) return showToast(`Arquivo muito pesado!`, 'error');
                arquivosSelecionados.push(files[i]);
                fileListDisplay.innerHTML += `<div class="custom-file-item" style="font-size:12px; padding:5px 0;"><i class="fa-solid fa-file-lines" style="color: var(--color-info);"></i> ${files[i].name}</div>`;
            }
        });
    }

    novoForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const checkboxes = novoForm.querySelectorAll('input[name="funcDelegado"]:checked');
        if (checkboxes.length === 0) return showToast('Selecione pelo menos um funcionário!', 'error');

        const btn = novoForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Enviar...';
        btn.disabled = true;

        const titulo = document.getElementById('delegarTitulo').value;
        const descricao = document.getElementById('delegarDescricao').value;
        const categoria = document.getElementById('delegarCategoria').value;
        const difSelect = document.getElementById('delegarDificuldade');
        const dificuldade = difSelect ? parseInt(difSelect.value) : 3;
        const dataAtual = new Date().toISOString();

        // 🔥 LÊ O PRAZO SELECIONADO (Se em branco, assume hoje)
        const inputPrazo = document.getElementById('delegarPrazo');
        const prazoEscolhido = (inputPrazo && inputPrazo.value) ? inputPrazo.value : dataAtual.split('T')[0];

        const dispararTarefas = (anexosProntos) => {
            let promessasFirebase = [];

            checkboxes.forEach((box, index) => {
                const val = box.value;
                const userId = !isNaN(val) && val.trim() !== "" ? Number(val) : val;
                const tarefaId = Date.now() + index;

                const novaTarefa = {
                    id: tarefaId,
                    companyId: currentUser.companyId,
                    senderId: currentUser.id,
                    userId: userId,
                    title: titulo,
                    description: descricao,
                    category: categoria,
                    dificuldade: dificuldade,
                    deadline: prazoEscolhido, // 🔥 GRAVA O PRAZO NO BANCO DE DADOS
                    attachments: anexosProntos || [],
                    status: 'pendente',
                    createdAt: dataAtual
                };

                promessasFirebase.push(db.collection('tarefas').doc(tarefaId.toString()).set(novaTarefa));
                promessasFirebase.push(db.collection('notificacoes').add({
                    userId: userId,
                    titulo: '🎯 Tarefa Recebida!',
                    mensagem: `Você recebeu a tarefa: ${titulo}`,
                    createdAt: dataAtual,
                    acaoAlvo: 'tarefas-recebidas',
                    lida: false
                }));
            });

            Promise.all(promessasFirebase).then(() => {
                if (window.registrarAcao) window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'DELEGAR_TAREFA', `Delegou a tarefa: ${titulo}`);
                showToast('Tarefas enviadas com sucesso!');
                novoForm.reset();
                fileListDisplay.innerHTML = '';
                arquivosSelecionados = [];
                btn.innerHTML = originalText;
                btn.disabled = false;
                renderizarListaInteligente();
                if (typeof loadTarefasEnviadas === 'function') loadTarefasEnviadas();
            }).catch(() => {
                showToast('Erro ao enviar.', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            });
        };

        if (arquivosSelecionados.length > 0) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Anexando...';
            const promessasDeArquivos = arquivosSelecionados.map((file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function (evento) { resolve({ name: file.name, url: evento.target.result }); };
                    reader.readAsDataURL(file);
                });
            });
            Promise.all(promessasDeArquivos).then((anexos) => dispararTarefas(anexos));
        } else { dispararTarefas([]); }
    });
}

// ==========================================
// APROVAÇÃO, CLASSIFICAÇÃO E XP/MOEDAS
// ==========================================
window.setAdminRating = function (stars) {
    const input = document.getElementById('adminStarRatingValue');
    if (input) input.value = stars;

    const items = document.querySelectorAll('#starRatingAdmin .star-rate');
    items.forEach((item, index) => {
        if (index < stars) {
            item.style.color = '#fbbf24';
        } else {
            item.style.color = 'var(--color-border)';
        }
    });
};

window.aprovarTarefaRevisao = function () {
    const idT = document.getElementById('detalhesTarefaId').value;
    const ratingInput = document.getElementById('adminStarRatingValue');
    const ratingVal = ratingInput ? parseInt(ratingInput.value) : 0;

    if (ratingVal === 0) {
        if (typeof showToast === 'function') showToast('Por favor, avalie a entrega com quantidade de estrelas de 1 a 5 antes de aprovar!', 'error');
        return;
    }


    db.collection('tarefas').doc(idT).get().then(snap => {
        const t = snap.data();

        db.collection('empresas').doc(t.companyId.toString()).get().then(compSnap => {
            const dataEmpresa = compSnap.data();
            const gamificacaoAtiva = dataEmpresa.gamificationEnabled === true;

            const regras = dataEmpresa.gamificacao || { xpBase: 50, xpNivel: 500, coinsNivel: 100, pesoFacil: 2, pesoMedia: 3, pesoDificil: 4 };

            let xpGanho = 0;
            if (gamificacaoAtiva) {
                let peso = regras.pesoMedia;
                if (t.dificuldade == 2 || t.dificuldade === 'facil') peso = regras.pesoFacil;
                if (t.dificuldade == 4 || t.dificuldade === 'dificil') peso = regras.pesoDificil;
                xpGanho = Math.round(regras.xpBase * peso);
            }

            const p1 = db.collection('tarefas').doc(idT).update({ status: 'concluido', reviewRating: ratingVal });

            const p2 = db.collection('atividades').doc(Date.now().toString()).set({
                ...t,
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                status: 'concluido',
                xpEarned: xpGanho,
                tarefaVinculadaId: idT,
                reviewRating: ratingVal,
                tipo: 'delegada' // 🔥 Marcação explícita para o sistema de travas
            });


            // Atualiza dados do usuário (Gamificação + Setup das Notas em Estrelas)
            const p3 = db.collection('usuarios').doc(t.userId.toString()).get().then(uSnap => {
                if (!uSnap.exists) return Promise.resolve();
                const u = uSnap.data();

                // Lógica de Atualização da Média de Estrelas
                let rSum = (u.ratingSum || 0) + ratingVal;
                let rCount = (u.ratingCount || 0) + 1;
                let rAvg = rSum / rCount;

                let newStats = { ratingSum: rSum, ratingCount: rCount, averageRating: rAvg };

                if (gamificacaoAtiva) {
                    let newXp = (u.xp || 0) + xpGanho;
                    let oldLevel = u.level || 1;
                    let newLevel = Math.floor(newXp / regras.xpNivel) + 1;
                    let newCoins = u.goCoins || 0;

                    if (newLevel > oldLevel) newCoins += (newLevel - oldLevel) * regras.coinsNivel;

                    newStats = { ...newStats, xp: newXp, level: newLevel, goCoins: newCoins };
                }

                return db.collection('usuarios').doc(t.userId.toString()).update(newStats);
            });

            Promise.all([p1, p2, p3]).then(() => {
                const msg = gamificacaoAtiva ? `Aprovado! +${xpGanho} XP enviados.` : `Tarefa aprovada e concluída com sucesso!`;

                // 🔥 GATILHO DA NOTIFICAÇÃO DE APROVAÇÃO COM REDIRECIONAMENTO
                db.collection('notificacoes').add({
                    userId: t.userId,
                    titulo: gamificacaoAtiva ? '🏆 Tarefa Concluída!' : '✅ Tarefa Aprovada',
                    mensagem: gamificacaoAtiva ? `Excelente trabalho! Você ganhou +${xpGanho} de XP.` : `A sua tarefa "${t.title}" foi aprovada.`,
                    createdAt: new Date().toISOString(),
                    acaoAlvo: 'history',
                    lida: false
                });

                showToast(msg);
                fecharDetalhesTarefa();
                if (window.registrarAcao) {
                    window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'APROVAR_TAREFA', `Aprovou a tarefa: ${t.title}`);
                }
            });
        });
    });
};

// =========================================================
// REVISÃO DE TAREFAS PELO ADMIN (COM FLUXOGRAMA DE ERROS)
// =========================================================
window.unsubscribeTarefasEnviadas = null;

window.loadTarefasEnviadas = function () {
    const container = document.getElementById('tabelaTarefasEnviadas');
    if (!container) return;

    if (window.unsubscribeTarefasEnviadas) window.unsubscribeTarefasEnviadas();

    container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando tarefas...</div>';

    window.unsubscribeTarefasEnviadas = db.collection('tarefas').where('senderId', '==', currentUser.id).onSnapshot((querySnapshot) => {
        if (querySnapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding: 20px; background: var(--color-bg-primary); border-radius: 8px;">Nenhuma tarefa enviada.</div>';
            return;
        }

        let lista = [];
        querySnapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));

        lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let html = `<div class="table-container"><table>
          <thead><tr><th>Data</th><th>Para Quem</th><th>Categoria</th><th>Tarefa</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;

        lista.forEach(t => {
            const func = users.find(u => u.id === t.userId);
            const nomeFunc = func ? func.name : 'Removido';
            const dataFormatada = new Date(t.createdAt).toLocaleDateString('pt-BR');

            let badgeClass = 'badge-pendente'; let badgeText = 'Pendente'; let corBg = '#fef9c3'; let corTxt = '#854d0e';
            if (t.status === 'em_revisao') { badgeClass = 'badge-andamento'; badgeText = 'Em Revisão'; corBg = '#fef9c3'; corTxt = '#ca8a04'; }
            if (t.status === 'concluido') { badgeClass = 'badge-concluido'; badgeText = 'Aprovada'; corBg = '#dcfce7'; corTxt = '#166534'; }
            if (t.status === 'nao_concluido') { badgeClass = 'badge-pendente'; badgeText = 'Expirada'; corBg = '#fee2e2'; corTxt = '#991b1b'; }

            const categoriaBadge = `<span class="badge cat-badge-dynamic" style="${getCategoryStyleString(t.category || 'Geral')}">${t.category || 'Geral'}</span>`;

            html += `<tr>
              <td>${dataFormatada}</td>
              <td><strong>${nomeFunc}</strong></td>
              <td>${categoriaBadge}</td>
              <td>${t.title}</td>
              <td><span class="badge ${badgeClass}" style="background:${corBg}; color:${corTxt};">${badgeText}</span></td>
              <td style="display:flex; gap:5px;">
                  ${t.status === 'pendente' ? `<button onclick="abrirEditarTarefa('${t.id}')" class="btn-icon-only edit" title="Corrigir Instruções"><i class="fa-solid fa-pen"></i></button>` : ''}
                  ${t.status === 'em_revisao' ? `<button onclick="abrirDetalhesTarefa('${t.id}')" class="btn-icon-only" title="Revisar Entrega" style="color: var(--color-info); background: rgba(59,130,246,0.1);"><i class="fa-solid fa-magnifying-glass"></i></button>` : ''}
                  ${t.status === 'concluido' ? `<button onclick="abrirDetalhesTarefa('${t.id}')" class="btn-icon-only" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></button>` : ''}
                  <button onclick="apagarTarefaDelegada('${t.id}')" class="btn-icon-only delete" title="Apagar Tarefa"><i class="fa-solid fa-trash"></i></button>
              </td>
          </tr>`;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }, err => console.error(err));
};

window.abrirDetalhesTarefa = function (idTarefa) {
    db.collection('tarefas').doc(idTarefa.toString()).get().then(docSnap => {
        if (!docSnap.exists) return;
        const t = docSnap.data();
        const func = users.find(u => u.id === t.userId);

        document.getElementById('detalhesTarefaId').value = t.id;
        document.getElementById('detalheTarefaTitulo').textContent = t.tituloEntrega || t.title;
        document.getElementById('detalheTarefaFunc').textContent = func ? func.name : 'Colaborador';
        document.getElementById('detalheTarefaResposta').textContent = t.respostaFuncionario || 'Nenhuma mensagem escrita na entrega.';

        const boxAval = document.getElementById('detalheTarefaAvaliacao');
        if (t.status === 'concluido' && t.reviewRating && boxAval) {
            let starHtml = `<strong style="color: #d97706; font-size: 13px;">${t.reviewRating}</strong> `;
            for (let i = 1; i <= 5; i++) {
                if (i <= t.reviewRating) starHtml += '<i class="fa-solid fa-star" style="color: #fbbf24; font-size: 12px; margin-left: 2px;"></i>';
                else starHtml += '<i class="fa-solid fa-star" style="color: var(--color-border); font-size: 12px; margin-left: 2px;"></i>';
            }
            boxAval.innerHTML = starHtml;
            boxAval.style.display = 'inline-block';
        } else if (boxAval) {
            boxAval.style.display = 'none';
        }

        // Reinicia as estrelinhas interativas do admin para nova nota
        if (typeof window.setAdminRating === 'function') window.setAdminRating(0);

        // 🔥 NOVO: Lê a quantidade do Firebase e mostra a caixa (se for maior que 0)
        const boxQtd = document.getElementById('boxQuantidadeAdmin');
        const txtQtd = document.getElementById('detalheTarefaQuantidade');
        if (t.quantidade && parseInt(t.quantidade) > 0) {
            txtQtd.textContent = t.quantidade;
            boxQtd.style.display = 'block';
        } else {
            boxQtd.style.display = 'none'; // Esconde se a tarefa não for de números
        }

        const boxAnexos = document.getElementById('detalheTarefaAnexos');
        if (t.attachments && t.attachments.length > 0) {
            let html = '<strong style="font-size:13px; display:block; margin-bottom: 5px;">Anexos da Entrega (Baixar):</strong><div style="display: flex; gap: 10px; flex-wrap: wrap;">';
            t.attachments.forEach(an => {
                html += `<a href="${an.url}" download="${an.name}" class="badge" style="background: var(--color-bg-secondary); color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--color-border);"><i class="fa-solid fa-download"></i> ${an.name}</a>`;
            });
            html += '</div>';
            boxAnexos.innerHTML = html;
        } else {
            boxAnexos.innerHTML = '<span style="font-size: 13px; color: var(--color-text-secondary);"><i class="fa-solid fa-file-excel"></i> Nenhum anexo enviado.</span>';
        }

        const areaRevisao = document.getElementById('areaRevisaoAdmin');
        const btnFechar = document.getElementById('btnFecharDetalhes');
        if (t.status === 'em_revisao') {
            areaRevisao.style.display = 'block';
            btnFechar.style.display = 'none';
        } else {
            areaRevisao.style.display = 'none';
            btnFechar.style.display = 'block';
        }

        document.getElementById('modalDetalhesTarefa').classList.remove('hidden');
    });
};
window.fecharDetalhesTarefa = function () {
    document.getElementById('modalDetalhesTarefa').classList.add('hidden');
};

window.apagarTarefaDelegada = function (idTarefa) {
    showConfirm(
        'Tem a certeza que deseja apagar esta tarefa? Se ela já estiver concluída, também será apagada do Histórico de Relatórios.',
        () => {
            const p1 = db.collection('tarefas').doc(idTarefa.toString()).delete();
            const p2 = db.collection('atividades').where('tarefaVinculadaId', '==', idTarefa.toString()).get()
                .then(snapshot => {
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    return batch.commit();
                });

            Promise.all([p1, p2])
                .then(() => {
                    if (window.registrarAcao) {
                        window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EXCLUIR_ATIVIDADE', `Apagou a tarefa delegada: ${idTarefa}`);
                    }
                    showToast('Tarefa apagada do sistema!');
                })
                .catch(err => {
                    console.error('Erro ao apagar tarefa:', err);
                    showToast('Erro ao apagar.', 'error');
                });
        },
        'Apagar Tarefa'
    );
};

// ==========================================
// LÓGICA DE DEVOLUÇÃO COM ANEXOS (ADMIN)
// ==========================================
let arquivosFeedbackSelecionados = [];

document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'adminFeedbackArquivos') {
        const files = Array.from(e.target.files);
        if (files.length > 3) return showToast('Máximo de 3 arquivos!', 'error');

        arquivosFeedbackSelecionados = [];
        const list = document.getElementById('adminFeedbackArquivosLista');
        list.innerHTML = '';

        for (let i = 0; i < files.length; i++) {
            if (files[i].size > 1 * 1024 * 1024) return showToast(`Arquivo muito pesado!`, 'error');
            arquivosFeedbackSelecionados.push(files[i]);
            list.innerHTML += `<div class="custom-file-item" style="font-size:12px; padding:5px;"><i class="fa-solid fa-file-lines" style="color: var(--color-danger);"></i> ${files[i].name}</div>`;
        }
    }
});

window.reprovarTarefaRevisao = function () {
    const idTarefa = document.getElementById('detalhesTarefaId').value;
    const feedback = document.getElementById('adminFeedbackRevisao').value.trim();
    const btn = document.getElementById('btnReprovarTarefa');

    if (!feedback) return showToast('Por favor, escreva o motivo da devolução no campo de Feedback.', 'error');

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Devolvendo...';
    btn.disabled = true;

    const processarDevolucao = (anexosFeedback) => {
        db.collection('tarefas').doc(idTarefa.toString()).update({
            status: 'pendente',
            feedbackAdmin: feedback,
            feedbackAttachments: anexosFeedback
        }).then(() => {

            // 🔥 GATILHO DA NOTIFICAÇÃO DE DEVOLUÇÃO COM REDIRECIONAMENTO
            db.collection('tarefas').doc(idTarefa.toString()).get().then(doc => {
                db.collection('notificacoes').add({
                    userId: doc.data().userId,
                    titulo: '⚠️ Tarefa Devolvida',
                    mensagem: `O Gestor deixou feedback na tarefa "${doc.data().title}". Por favor, verificar.`,
                    createdAt: new Date().toISOString(),
                    acaoAlvo: 'tarefas-recebidas',
                    lida: false
                });
            });

            showToast('Tarefa devolvida com sucesso!', 'error');
            document.getElementById('adminFeedbackRevisao').value = '';
            arquivosFeedbackSelecionados = [];
            document.getElementById('adminFeedbackArquivosLista').innerHTML = '';
            document.getElementById('adminFeedbackArquivos').value = '';

            // Notificação já enviada acima
            if (window.registrarAcao) {
                window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'REPROVAR_TAREFA', `Devolveu a tarefa: ${doc.data().title}`);
            }
            fecharDetalhesTarefa();
            btn.innerHTML = originalText;
            btn.disabled = false;
        }).catch(err => {
            showToast('Erro ao devolver tarefa.', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    };

    if (arquivosFeedbackSelecionados.length > 0) {
        const promessas = arquivosFeedbackSelecionados.map((file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (evento) { resolve({ name: file.name, url: evento.target.result }); };
                reader.readAsDataURL(file);
            });
        });
        Promise.all(promessas).then(anexos => processarDevolucao(anexos));
    } else {
        processarDevolucao([]);
    }
};

window.abrirEditarTarefa = function (id) {
    db.collection('tarefas').doc(id.toString()).get().then(docSnap => {
        const t = docSnap.data();
        document.getElementById('editDelegarId').value = t.id;
        document.getElementById('editDelegarTitulo').value = t.title;
        document.getElementById('editDelegarDescricao').value = t.description;

        const c = companies.find((x) => x.id === currentUser.companyId);
        const catEl = document.getElementById('editDelegarCategoria');
        if (catEl && c) {
            catEl.innerHTML = (c.categories || defaultCategories).map((cat) => `<option value="${cat}">${cat}</option>`).join('');
            catEl.value = t.category || 'Geral';
        }

        document.getElementById('modalEditarTarefaDelegada').classList.remove('hidden');
    });
};

window.fecharEditarTarefa = function () {
    document.getElementById('modalEditarTarefaDelegada').classList.add('hidden');
};

window.salvarEdicaoTarefa = function () {
    const id = document.getElementById('editDelegarId').value;
    const titulo = document.getElementById('editDelegarTitulo').value;
    const desc = document.getElementById('editDelegarDescricao').value;
    const cat = document.getElementById('editDelegarCategoria').value;

    db.collection('tarefas').doc(id.toString()).update({
        title: titulo,
        description: desc,
        category: cat
    }).then(() => {
        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EDITAR_ATIVIDADE', `Corrigiu instruções da tarefa: ${titulo}`);
        }
        showToast('Tarefa corrigida com sucesso!');
        fecharEditarTarefa();
    });
};

// ==========================================
// CONTROLE DAS ABAS E EXCLUSÃO (ADMIN DELEGAR)
// ==========================================
window.openDelegarTab = function (tabId, btn) {
    document.querySelectorAll('.delegar-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    document.querySelectorAll('.nav-delegar-tab').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--color-text-secondary)';
        b.style.border = '1px solid var(--color-border)';
        b.classList.remove('active');
    });

    document.getElementById(tabId).style.display = 'block';

    btn.style.background = 'var(--color-primary)';
    btn.style.color = 'white';
    btn.style.border = '1px solid var(--color-primary)';
    btn.classList.add('active');

    if (tabId === 'tabTarefasEnviadas') {
        loadTarefasEnviadas();
    }
};

// ==========================================
// SISTEMA DE HISTÓRICO DE ACESSOS (LOGINS)
// ==========================================
window.abrirModalAcessos = function (userId) {
    const u = users.find(x => x.id === userId);
    if (!u) return;

    document.getElementById('nomeUsuarioAcesso').textContent = u.name;
    document.getElementById('userIdAcessoAtual').value = userId;

    const hojeLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('filtroDataAcessos').value = hojeLocal;

    document.getElementById('modalAcessos').classList.remove('hidden');
    carregarAcessos(userId, hojeLocal);
};

window.filtrarAcessosPorData = function () {
    const userId = document.getElementById('userIdAcessoAtual').value;
    const data = document.getElementById('filtroDataAcessos').value;
    if (userId) carregarAcessos(userId, data);
};

window.unsubscribeAcessos = null;

window.carregarAcessos = function (userId, dataFiltro) {
    const container = document.getElementById('listaAcessosUsuario');
    container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando histórico ao vivo...</div>';

    if (window.unsubscribeAcessos) window.unsubscribeAcessos();

    const uid = isNaN(userId) ? userId : Number(userId);

    window.unsubscribeAcessos = db.collection('acessos')
        .where('userId', 'in', [String(userId), uid])
        .onSnapshot(snap => {
            let lista = [];
            snap.forEach(doc => {
                const d = doc.data();
                if (String(d.companyId) === String(currentUser.companyId)) {
                    lista.push(d);
                }
            });

            if (dataFiltro) {
                lista = lista.filter(item => item.timestamp && item.timestamp.includes(dataFiltro));
            }

            if (lista.length === 0) {
                container.innerHTML = `<div style="text-align:center; background: var(--color-bg-primary); padding: 20px; border-radius: 8px; border: 1px dashed var(--color-border); color: var(--color-text-secondary);"><i class="fa-solid fa-calendar-xmark" style="font-size: 24px; margin-bottom: 10px;"></i><br>Nenhuma atividade registrada neste dia.</div>`;
                return;
            }

            lista.sort((a, b) => {
                const tA = a.timestamp || "";
                const tB = b.timestamp || "";
                return tB.localeCompare(tA);
            });

            const icones = {
                'LOGIN': { icon: 'fa-right-to-bracket', cor: 'var(--color-success)' },
                'CRIAR_ATIVIDADE': { icon: 'fa-plus', cor: 'var(--color-primary)' },
                'ENTREGAR_TAREFA': { icon: 'fa-paper-plane', cor: 'var(--color-info)' },
                'DELEGAR_TAREFA': { icon: 'fa-bullseye', cor: 'var(--color-warning)' },
                'EDITAR_ATIVIDADE': { icon: 'fa-pen', cor: 'var(--color-info)' },
                'EXCLUIR_ATIVIDADE': { icon: 'fa-trash', cor: 'var(--color-danger)' },
                'DEFAULT': { icon: 'fa-bolt', cor: 'var(--color-warning)' }
            };

            let html = '';
            lista.forEach(data => {
                let horaFormatada = "--:--";
                if (data.timestamp && data.timestamp.includes('T')) {
                    horaFormatada = data.timestamp.split('T')[1].substring(0, 5);
                }

                const tipoAcao = data.acao || 'LOGIN';
                const visual = icones[tipoAcao] || icones['DEFAULT'];
                const textoDetalhe = data.detalhes || 'Acesso registrado';

                html += `
              <div style="background: var(--color-bg-primary); border: 1px solid var(--color-border); padding: 12px 15px; border-radius: 8px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; color: var(--color-text-primary);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 10px; line-height: 1.3;">
                          <i class="fa-solid ${visual.icon}" style="color: ${visual.cor}; font-size: 16px; min-width: 16px; text-align: center;"></i> 
                          <strong>${textoDetalhe}</strong>
                      </div>
                      <span style="font-size: 11px; font-weight: bold; opacity: 0.6; white-space: nowrap;">${horaFormatada}</span>
                  </div>
              </div>`;
            });
            container.innerHTML = html;
        });
};

window.fecharModalAcessos = function () {
    document.getElementById('modalAcessos').classList.add('hidden');
    if (window.unsubscribeAcessos) {
        window.unsubscribeAcessos();
        window.unsubscribeAcessos = null;
    }
};

// =======================================================
// LOJA DE RECOMPENSAS (VISÃO DO GESTOR)
// =======================================================

window.openStoreTab = function (tabId, btn) {
    document.querySelectorAll('.store-section').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';

    document.querySelectorAll('.internal-tabs-nav .tab-btn').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (tabId === 'tabCatalogo') loadAdminRewards();
    if (tabId === 'tabResgates') loadAdminRedemptions();
};


// ── Helpers for the new prize-creator form ──────────────────────────────────

window.previewRewardImage = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById('rewardImagePreview');
        const placeholder = document.getElementById('rewardImagePlaceholder');
        if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
        if (placeholder) placeholder.style.display = 'none';
        const hidden = document.getElementById('rewardImageBase64');
        if (hidden) hidden.value = e.target.result;
    };
    reader.readAsDataURL(file);
};

window._rewardValues = [];

window.addRewardValue = function () {
    const input = document.getElementById('rewardValueInput');
    const val = parseFloat(input.value);
    if (!val || val <= 0) return;
    if (window._rewardValues.includes(val)) { input.value = ''; return; }
    window._rewardValues.push(val);
    window._rewardValues.sort((a, b) => a - b);
    renderRewardChips();
    input.value = '';
    input.focus();
};

window.removeRewardValue = function (val) {
    window._rewardValues = window._rewardValues.filter(v => v !== val);
    renderRewardChips();
};

function renderRewardChips() {
    const container = document.getElementById('rewardValuesChips');
    if (!container) return;
    container.innerHTML = window._rewardValues.map(v =>
        `<span onclick="removeRewardValue(${v})" style="display:inline-flex; align-items:center; gap:5px; padding:5px 14px; border-radius:20px; background:var(--color-primary); color:#fff; font-size:13px; font-weight:600; cursor:pointer; user-select:none; transition:opacity 0.15s;" onmouseover="this.style.opacity='0.75'" onmouseout="this.style.opacity='1'">R$ ${v} <i class="fa-solid fa-xmark" style="font-size:10px;"></i></span>`
    ).join('');
}

window.selectRewardCodigo = function (temCodigo) {
    const simBtn = document.getElementById('rewardCodigoSim');
    const naoBtn = document.getElementById('rewardCodigoNao');
    const hidden = document.getElementById('rewardTemCodigo');
    if (!simBtn || !naoBtn) return;
    if (temCodigo) {
        simBtn.style.background = 'var(--color-primary)'; simBtn.style.color = '#fff';
        naoBtn.style.background = 'var(--color-bg-secondary)'; naoBtn.style.color = 'var(--color-text-secondary)';
    } else {
        naoBtn.style.background = 'var(--color-primary)'; naoBtn.style.color = '#fff';
        simBtn.style.background = 'var(--color-bg-secondary)'; simBtn.style.color = 'var(--color-text-secondary)';
    }
    if (hidden) hidden.value = temCodigo ? 'true' : 'false';
};

// ─────────────────────────────────────────────────────────────────────────────

window.setupAdminStore = function () {
    loadAdminRewards();
    window._rewardValues = [];

    const form = document.getElementById('adminNewRewardForm');
    if (!form) return;
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    novoForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (window._rewardValues.length === 0) {
            showToast('Adicione pelo menos um valor ao prêmio.', 'error');
            return;
        }
        const btn = novoForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Guardar...';
        btn.disabled = true;

        const premio = {
            id: Date.now(),
            companyId: currentUser.companyId,
            nome: document.getElementById('rewardName').value.trim(),
            valores: [...window._rewardValues],
            temCodigo: document.getElementById('rewardTemCodigo')?.value === 'true',
            imagemBase64: document.getElementById('rewardImageBase64')?.value || '',
            ativo: true,
            createdAt: new Date().toISOString()
        };

        db.collection('premios').doc(premio.id.toString()).set(premio).then(() => {
            showToast('Prêmio adicionado ao catálogo!');
            novoForm.reset();
            // Reset custom state
            window._rewardValues = [];
            const chips = document.getElementById('rewardValuesChips');
            if (chips) chips.innerHTML = '';
            const preview = document.getElementById('rewardImagePreview');
            if (preview) { preview.src = ''; preview.style.display = 'none'; }
            const placeholder = document.getElementById('rewardImagePlaceholder');
            if (placeholder) placeholder.style.display = 'flex';
            const hidden = document.getElementById('rewardImageBase64');
            if (hidden) hidden.value = '';
            selectRewardCodigo(true);
            loadAdminRewards();
            btn.innerHTML = originalText;
            btn.disabled = false;
        }).catch(err => {
            showToast('Erro ao guardar prêmio', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });
};

window.loadAdminRewards = function () {
    const container = document.getElementById('adminRewardsList');
    if (!container) return;

    if (window.unsubscribeAdminRewards) window.unsubscribeAdminRewards();

    container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar catálogo...</div>';

    window.unsubscribeAdminRewards = db.collection('premios')
        .where('companyId', '==', currentUser.companyId)
        .onSnapshot(snap => {
            if (snap.empty) {
                container.innerHTML = '<div style="padding:15px; text-align:center; opacity:0.6;">Nenhum prêmio cadastrado no seu cofre.</div>';
                return;
            }

            let premios = [];
            snap.forEach(doc => premios.push(doc.data()));
            premios.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

            let html = '';
            premios.forEach(p => {
                const btnStatus = p.ativo
                    ? `<button class="btn btn-small" style="background: rgba(239,68,68,0.12); color:#ef4444; border: 1px solid rgba(239,68,68,0.25); font-size:11px; font-weight:700; border-radius:8px; padding: 5px 12px; white-space:nowrap;" onclick="togglePremioStatus(${p.id}, false)"><i class="fa-solid fa-eye-slash" style="margin-right:4px; font-size:10px;"></i>Ocultar</button>`
                    : `<button class="btn btn-small" style="background: rgba(16,185,129,0.12); color:#10b981; border: 1px solid rgba(16,185,129,0.25); font-size:11px; font-weight:700; border-radius:8px; padding: 5px 12px; white-space:nowrap;" onclick="togglePremioStatus(${p.id}, true)"><i class="fa-solid fa-eye" style="margin-right:4px; font-size:10px;"></i>Mostrar</button>`;

                const valoresHtml = Array.isArray(p.valores) && p.valores.length
                    ? p.valores.map(v => `<span style="padding:3px 9px; border-radius:20px; background: rgba(99,102,241,0.15); color:var(--color-primary); font-size:11px; font-weight:700; border: 1px solid rgba(99,102,241,0.2);">R$ ${v}</span>`).join('')
                    : (p.preco ? `<span style="padding:3px 9px; border-radius:20px; background: rgba(99,102,241,0.15); color:var(--color-primary); font-size:11px; font-weight:700;">${p.preco} Coins</span>` : '—');

                const imgHtml = p.imagemBase64
                    ? `<img src="${p.imagemBase64}" style="width:48px; height:48px; border-radius:10px; object-fit:cover; flex-shrink:0;">`
                    : `<div style="width:48px; height:48px; border-radius:10px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i class="fa-solid fa-gift" style="color:#fff; font-size:18px;"></i></div>`;

                const codigoBadge = p.temCodigo
                    ? `<span style="font-size:10px; padding:2px 8px; border-radius:20px; background:rgba(59,130,246,0.12); color:#3b82f6; font-weight:700; border: 1px solid rgba(59,130,246,0.2);"><i class="fa-solid fa-key" style="margin-right:3px; font-size:9px;"></i>Com código</span>`
                    : `<span style="font-size:10px; padding:2px 8px; border-radius:20px; background:var(--color-bg-secondary); color:var(--color-text-secondary); font-weight:600;">Sem código</span>`;

                const statusDot = p.ativo
                    ? `<span style="width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block; box-shadow: 0 0 6px rgba(16,185,129,0.6); flex-shrink:0;"></span>`
                    : `<span style="width:7px; height:7px; border-radius:50%; background:#64748b; display:inline-block; flex-shrink:0;"></span>`;

                html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border:1px solid var(--color-border); border-left: 3px solid ${p.ativo ? '#10b981' : '#334155'}; border-radius:10px; background: var(--color-bg-secondary); opacity: ${p.ativo ? '1' : '0.55'}; transition: opacity 0.2s; gap: 10px;">
              <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                  ${imgHtml}
                  <div style="flex:1; min-width:0;">
                      <div style="display:flex; align-items:center; gap:6px; margin-bottom:5px;">
                          ${statusDot}
                          <h4 style="margin:0; color:var(--color-text-primary); font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.nome}</h4>
                      </div>
                      <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                          ${valoresHtml}
                          ${codigoBadge}
                      </div>
                  </div>
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0; align-items:center;">
                  ${btnStatus}
                  <button class="btn btn-small btn-danger" onclick="excluirPremio(${p.id})"><i class="fa-solid fa-trash"></i></button>
              </div>
          </div>`;
            });
            container.innerHTML = html;
        });
};

window.togglePremioStatus = function (id, status) {
    db.collection('premios').doc(id.toString()).update({ ativo: status }).then(() => loadAdminRewards());
};

window.excluirPremio = function (id) {
    if (confirm("Tem a certeza que deseja excluir este prêmio permanentemente?")) {
        db.collection('premios').doc(id.toString()).delete().then(() => {
            showToast('Prêmio excluído!');
            loadAdminRewards();
        });
    }
};

window.loadAdminRedemptions = function () {
    const container = document.getElementById('adminRedemptionList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A buscar pedidos...</div>';

    db.collection('resgates').where('companyId', '==', currentUser.companyId).get().then(snap => {
        if (snap.empty) {
            container.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.6; background:var(--color-bg-secondary); border-radius:8px;">Nenhum resgate encontrado.</div>';
            return;
        }

        let pendentes = [];
        let entregues = [];

        snap.forEach(doc => {
            const r = doc.data();
            if (r.status === 'pendente') pendentes.push(r);
            else entregues.push(r);
        });

        pendentes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        entregues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let html = '';

        if (pendentes.length > 0) {
            html += '<h3 style="font-size:14px; margin-bottom:12px; opacity:0.7;">📥 PEDIDOS PENDENTES</h3>';
            pendentes.forEach(r => {
                const func = users.find(u => String(u.id) === String(r.userId));
                const nomeFunc = func ? func.name : (r.userName || 'Colaborador');
                html += `
              <div style="border-left: 4px solid var(--color-warning); background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 12px;">
                  <div>
                      <h4 style="margin: 0 0 5px 0; color: var(--color-text-primary);">${r.premioNome}</h4>
                      <p style="margin:0; font-size: 13px; color: var(--color-text-secondary);"><strong>Colaborador:</strong> ${nomeFunc}</p>
                  </div>
                  <div style="display: flex; gap: 8px;">
                      <button class="btn btn-small btn-success" onclick="aprovarResgate('${r.id}', ${r.preco})"><i class="fa-solid fa-check"></i> Entregar</button>
                      <button class="btn btn-small btn-danger" onclick="recusarResgate('${r.id}', '${r.userId}', ${r.preco})"><i class="fa-solid fa-xmark"></i></button>
                  </div>
              </div>`;
            });
        }

        if (entregues.length > 0) {
            html += '<h3 style="font-size:14px; margin:25px 0 12px; opacity:0.7;">✅ HISTÓRICO DE ENTREGAS</h3>';
            entregues.slice(0, 10).forEach(r => {
                const func = users.find(u => String(u.id) === String(r.userId));
                const nomeFunc = func ? func.name : (r.userName || 'Colaborador');
                const statusCor = r.status === 'entregue' ? '#10b981' : '#6b7280';

                html += `
              <div style="background: var(--color-bg-secondary); padding: 12px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; opacity: 0.8; border: 1px solid var(--color-border);">
                  <div style="flex: 1;">
                      <div style="font-size:13px; font-weight:700;">${r.premioNome}</div>
                      <div style="font-size:11px; opacity:0.6;">Para: ${nomeFunc}</div>
                  </div>
                  <div style="text-align: right;">
                      <span style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: ${statusCor}22; color: ${statusCor}; font-weight: 800; text-transform: uppercase;">${r.status}</span>
                      <div style="font-size:10px; opacity:0.5; margin-top:3px;">${new Date(r.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
              </div>`;
            });
        }

        if (!html) html = '<div style="padding:20px; text-align:center; opacity:0.6;">Nenhum resgate para mostrar.</div>';
        container.innerHTML = html;
    });
};

window.aprovarResgate = function (resgateId, preco) {
    db.collection('resgates').doc(resgateId.toString()).get().then(async docResgate => {
        if (!docResgate.exists) {
            showToast('Resgate não encontrado.', 'error');
            return;
        }
        const rData = docResgate.data();

        // Verificar se exige código PIN
        const nomeResgateLower = (rData.premioNome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const temPalavraSemCodigo = nomeResgateLower.includes('sem codigo') || nomeResgateLower.includes('semcodigo');

        let exigeCodigo = false;
        if (rData.tipo === 'giftcard') {
            exigeCodigo = true;
        } else if (rData.tipo === 'interno') {
            if (temPalavraSemCodigo || rData.temCodigo === false) {
                exigeCodigo = false;
            } else {
                try {
                    const snapP = await db.collection('premios').where('companyId', '==', currentUser.companyId).get();
                    let premioCadastrado = null;
                    if (!snapP.empty) {
                        snapP.forEach(docP => {
                            const p = docP.data();
                            const nomeCoincide = rData.premioNome && p.nome && (rData.premioNome.startsWith(p.nome) || p.nome.startsWith(rData.premioNome) || rData.premioNome.includes(p.nome));
                            const idCoincide = rData.premioId && String(p.id) === String(rData.premioId);
                            if (nomeCoincide || idCoincide) {
                                premioCadastrado = p;
                            }
                        });
                    }
                    if (premioCadastrado) {
                        exigeCodigo = (premioCadastrado.temCodigo === true);
                    } else {
                        exigeCodigo = (rData.temCodigo === true && !temPalavraSemCodigo);
                    }
                } catch (err) {
                    console.error('Erro ao verificar temCodigo no Firestore:', err);
                    exigeCodigo = (rData.temCodigo === true && !temPalavraSemCodigo);
                }
            }
        }

        // Se NÃO exigir código (Prêmio sem código = Não)
        if (rData.tipo === 'interno' && !exigeCodigo) {
            const funcNome = rData.userName || 'o colaborador';
            showConfirm(`Confirma a entrega do prêmio <strong>${rData.premioNome}</strong> para <strong>${funcNome}</strong>?`, () => {
                db.collection('resgates').doc(resgateId.toString()).update({
                    status: 'entregue',
                    dataAprovacao: new Date().toISOString(),
                    codigoResgate: '',
                    voucherCode: ''
                }).then(() => {
                    db.collection('notificacoes').add({
                        userId: rData.userId,
                        titulo: '🎁 O Seu prêmio foi entregue!',
                        mensagem: `O seu prêmio ${rData.premioNome} foi entregue com sucesso!`,
                        createdAt: new Date().toISOString(),
                        acaoAlvo: 'resgates',
                        lida: false
                    });

                    showToast('Prêmio entregue com sucesso!', 'success');
                    loadAdminRedemptions();
                    if (typeof window.setupAdminGamification === 'function') window.setupAdminGamification();
                }).catch(err => {
                    console.error('Erro ao aprovar:', err);
                    showToast('Erro ao aprovar.', 'error');
                });
            }, '🎁 Confirmar Entrega', '<i class="fa-solid fa-check"></i> Confirmar Entrega', 'btn-success');
            return;
        }

        // Caso exija código PIN (Gift Card ou Prêmio com código = Sim)
        abrirModalPinResgate(resgateId, rData);
    }).catch(err => {
        console.error('Erro ao buscar resgate:', err);
        showToast('Erro ao buscar resgate.', 'error');
    });
};

function abrirModalPinResgate(resgateId, rData) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '999999';

    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 400px; padding: 25px;">
          <div class="modal-header" style="margin-bottom: 15px;">
              <h2 style="font-size: 18px;"><i class="fa-solid fa-gift" style="color: var(--color-primary);"></i> Entregar PIN ao Colaborador</h2>
              <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div>
              <p style="font-size: 14px; margin-bottom: 15px; color: var(--color-text-secondary);">Cole aqui o código PIN ou o Link do Gift Card (ex: IFD-8472-9912) para finalizar o resgate:</p>
              <input type="text" id="adminPinInput" class="form-control" placeholder="Digite o código aqui..." style="width: 100%; margin-bottom: 20px; font-size: 16px; padding: 12px; text-align: center; font-weight: bold;">
              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                  <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                  <button class="btn btn-success" id="btnConfirmarPin"><i class="fa-solid fa-check"></i> Aprovar Resgate</button>
              </div>
          </div>
      </div>
  `;

    document.body.appendChild(overlay);
    document.getElementById('adminPinInput').focus();

    document.getElementById('btnConfirmarPin').addEventListener('click', () => {
        const pinCode = document.getElementById('adminPinInput').value.trim();

        if (!pinCode) {
            return showToast('Insira um código válido para entregar!', 'warning');
        }

        const btn = document.getElementById('btnConfirmarPin');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
        btn.disabled = true;

        if (rData.tipo === 'giftcard') {
            db.collection('empresas').doc(currentUser.companyId.toString()).get().then(docEmpresa => {
                const compData = docEmpresa.data();
                const card = compData ? compData.creditCard : null;

                if (!card) {
                    showToast('Não é possível entregar. A empresa não possui um cartão de faturamento cadastrado!', 'error');
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar Resgate';
                    btn.disabled = false;
                    return;
                }

                db.collection('resgates').doc(resgateId.toString()).update({
                    status: 'entregue',
                    dataAprovacao: new Date().toISOString(),
                    codigoResgate: pinCode,
                    voucherCode: pinCode,
                    cardLast4: card.last4 || '****',
                    cardBrand: card.brand || 'visa',
                    cardHolder: card.holder || '',
                    valorReais: rData.valorReais || 0
                }).then(() => {
                    db.collection('notificacoes').add({
                        userId: rData.userId,
                        titulo: '🎁 O Seu prêmio chegou!',
                        mensagem: `O Seu Gift Card ${rData.premioNome} já está disponível!`,
                        createdAt: new Date().toISOString(),
                        acaoAlvo: 'resgates',
                        lida: false
                    });

                    showToast('Resgate aprovado e faturado no cartão corporativo com sucesso!');
                    overlay.remove();
                    loadAdminRedemptions();
                }).catch(err => {
                    console.error('Erro ao aprovar resgate:', err);
                    showToast('Erro ao aprovar.', 'error');
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar Resgate';
                    btn.disabled = false;
                });
            }).catch(err => {
                console.error('Erro ao buscar empresa:', err);
                showToast('Erro ao aprovar.', 'error');
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar Resgate';
                btn.disabled = false;
            });
        } else {
            db.collection('resgates').doc(resgateId.toString()).update({
                status: 'entregue',
                dataAprovacao: new Date().toISOString(),
                codigoResgate: pinCode,
                voucherCode: pinCode,
                valorReais: rData.valorReais || 0
            }).then(() => {
                db.collection('notificacoes').add({
                    userId: rData.userId,
                    titulo: '🎁 O Seu prêmio chegou!',
                    mensagem: `O seu prêmio ${rData.premioNome} já está disponível!`,
                    createdAt: new Date().toISOString(),
                    acaoAlvo: 'resgates',
                    lida: false
                });

                showToast('Resgate aprovado com sucesso!');
                overlay.remove();
                loadAdminRedemptions();
            }).catch(err => {
                console.error('Erro ao aprovar resgate:', err);
                showToast('Erro ao aprovar.', 'error');
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar Resgate';
                btn.disabled = false;
            });
        }
    });
};

window.recusarResgate = function (resgateId, userId, preco) {
    if (confirm('Cancelar pedido e devolver as moedas para o colaborador?')) {
        db.collection('resgates').doc(resgateId.toString()).update({ status: 'cancelado' }).then(() => {
            db.collection('usuarios').doc(userId.toString()).get().then(doc => {
                let coins = doc.data().goCoins || 0;
                db.collection('usuarios').doc(userId.toString()).update({ goCoins: coins + preco }).then(() => {
                    showToast('Pedido cancelado. Moedas devolvidas!');
                    loadAdminRedemptions();
                });
            });
        });
    }
};

window.openGamiTab = function (tabId, btnElement) {
    document.querySelectorAll('.gami-internal-section').forEach(sec => {
        sec.style.display = 'none';
    });

    document.getElementById(tabId).style.display = 'block';

    const botoes = btnElement.parentElement.querySelectorAll('.tab-btn');
    botoes.forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
};

window.updateExchangeRateHelp = function (valor) {
    const taxa = parseInt(valor) || 10;
    const textoAjuda = document.getElementById('gamiExchangeRateHelp');

    if (textoAjuda) {
        const TAXA_COMPRA = 1.02; // Margem de segurança de 2%
        const custoCalculado = Math.round((50 * TAXA_COMPRA) * taxa);
        textoAjuda.innerHTML = `Se colocar <strong>${taxa}</strong>, um Gift Card de R$ 50 custará automaticamente ${custoCalculado} GoCoins para a equipe (já incluindo 2% de taxa de serviço).`;
    }
};

window.setupAdminGamification = function () {
    db.collection('empresas').doc(currentUser.companyId.toString()).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const isAtiva = data.gamificationEnabled === true;
            const regras = data.gamificacao || {
                xpBase: 50, xpNivel: 500, coinsNivel: 100, pesoFacil: 2, pesoMedia: 3, pesoDificil: 4,
                premioTop1: 500, premioTop2: 400, premioTop3: 300, premioTop4: 200, premioTop5: 100
            };

            const orcamentoMensal = data.monthlyBudget || 500;
            if (document.getElementById('adminMonthlyBudget')) document.getElementById('adminMonthlyBudget').value = orcamentoMensal;

            const configLoja = data.giftCardConfig || { rate: 10, active: [] };
            if (document.getElementById('gamiExchangeRate')) document.getElementById('gamiExchangeRate').value = configLoja.rate;
            window.updateExchangeRateHelp(configLoja.rate);

            window.renderAdminGiftCardCheckboxes(configLoja.active);

            const chk = document.getElementById('chkGamificacaoMaster');
            if (chk) chk.checked = isAtiva;

            const chkRewards = document.getElementById('chkRewardsEnabled');
            const rewardsAtiva = data.rewardsEnabled !== false;
            if (chkRewards) chkRewards.checked = rewardsAtiva;

            const containerRewards = document.getElementById('rewardsToggleContainer');
            if (containerRewards) containerRewards.style.opacity = isAtiva ? '1' : '0.4';
            if (containerRewards) containerRewards.style.pointerEvents = isAtiva ? 'auto' : 'none';

            const chkInternal = document.getElementById('chkInternalPrizesEnabled');
            const internalPrizesAtiva = data.internalPrizesEnabled === true;
            if (chkInternal) chkInternal.checked = internalPrizesAtiva;

            const containerInternal = document.getElementById('internalPrizesToggleContainer');
            if (containerInternal) containerInternal.style.opacity = isAtiva ? '1' : '0.4';
            if (containerInternal) containerInternal.style.pointerEvents = isAtiva ? 'auto' : 'none';

            const area = document.getElementById('gamiSettingsArea');
            if (area) area.style.display = isAtiva ? 'block' : 'none';

            // Aplicar visibilidade dos campos específicos da loja e recompensas
            window.aplicarVisibilidadeCamposConfigRewards(rewardsAtiva);

            const campos = ['gamiXpBase', 'gamiXpNivel', 'gamiCoinsNivel', 'gamiPesoFacil', 'gamiPesoMedia', 'gamiPesoDificil', 'gamiPremioTop1', 'gamiPremioTop2', 'gamiPremioTop3', 'gamiPremioTop4', 'gamiPremioTop5'];
            campos.forEach(id => {
                if (document.getElementById(id)) {
                    const key = id.replace('gami', '');
                    const finalKey = key.charAt(0).toLowerCase() + key.slice(1);
                    document.getElementById(id).value = regras[finalKey];
                }
            });

            // Progressão de níveis reflete automaticamente as alterações dos campos
            if (typeof window.renderGamiProgressionTable === 'function') {
                if (!window.__gamiProgressionBound) {
                    window.__gamiProgressionBound = true;
                    document.querySelectorAll('#gamiSettingsArea input').forEach(inp => {
                        inp.addEventListener('input', () => window.renderGamiProgressionTable());
                    });
                }
                window.renderGamiProgressionTable();
            }

            if (document.getElementById('gamiToggleIcon')) document.getElementById('gamiToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-danger)';
            if (document.getElementById('gamiToggleText')) document.getElementById('gamiToggleText').innerText = isAtiva ? 'Gamificação Ativada' : 'Gamificação Desativada';

            // --- NOVO: Limites de Gastos, Orçamentos e Cartão Corporativo Real ---
            const gamiEmployeeLimitBRL = data.gamiEmployeeLimitBRL || '';
            const gamiBudgetAlertEnabled = data.gamiBudgetAlertEnabled === true;
            const gamiBudgetAlertEmail = data.gamiBudgetAlertEmail || '';

            if (document.getElementById('gamiEmployeeLimitBRL')) document.getElementById('gamiEmployeeLimitBRL').value = gamiEmployeeLimitBRL;
            if (document.getElementById('gamiBudgetAlertEnabled')) document.getElementById('gamiBudgetAlertEnabled').checked = gamiBudgetAlertEnabled;
            if (document.getElementById('gamiBudgetAlertEmail')) document.getElementById('gamiBudgetAlertEmail').value = gamiBudgetAlertEmail;

            // Renderizar Cartão de Faturamento no Widget
            const card = data.creditCard;
            const txtCompanyBankBalance = document.getElementById('txtCompanyBankBalance');
            if (txtCompanyBankBalance) {
                if (card) {
                    let cardIcon = '<i class="fa-solid fa-credit-card"></i>';
                    const brand = String(card.brand || 'visa').toLowerCase();
                    if (brand === 'visa') cardIcon = '<i class="fa-brands fa-cc-visa" style="color: #1a1f71; font-size: 20px;"></i>';
                    else if (brand === 'mastercard') cardIcon = '<i class="fa-brands fa-cc-mastercard" style="color: #eb001b; font-size: 20px;"></i>';
                    else if (brand === 'amex') cardIcon = '<i class="fa-brands fa-cc-amex" style="color: #016fd0; font-size: 20px;"></i>';
                    
                    txtCompanyBankBalance.innerHTML = `${cardIcon} <span style="font-weight: 800; font-size: 14px;">${card.brand ? card.brand.toUpperCase() : 'Cartão'} •••• ${card.last4}</span>`;
                } else {
                    txtCompanyBankBalance.innerHTML = `<span style="color: #ef4444; font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-triangle-exclamation animate__animated animate__flash animate__infinite"></i> Sem Cartão Cadastrado</span>`;
                }
            }

            // Atualizar faturamentoStatusWidget
            const txtFaturamentoStatusVal = document.getElementById('txtFaturamentoStatusVal');
            const txtFaturamentoStatusDesc = document.getElementById('txtFaturamentoStatusDesc');
            if (txtFaturamentoStatusVal && txtFaturamentoStatusDesc) {
                if (card) {
                    txtFaturamentoStatusVal.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size: 16px;"></i> Faturamento Ativo`;
                    txtFaturamentoStatusVal.style.color = '#10b981';
                    txtFaturamentoStatusDesc.innerText = 'Seu cartão de faturamento corporativo está ativo. Os resgates da sua equipe serão faturados de forma segura sob demanda.';
                } else {
                    txtFaturamentoStatusVal.innerHTML = `<i class="fa-solid fa-triangle-exclamation animate__animated animate__flash animate__infinite" style="font-size: 16px;"></i> Faturamento Suspenso (Sem Cartão)`;
                    txtFaturamentoStatusVal.style.color = '#ef4444';
                    txtFaturamentoStatusDesc.innerText = 'Cadastre um cartão corporativo válido ao lado para liberar os resgates de Gift Cards da sua equipe.';
                }
            }

            // Renderizar Spending Gauge
            const spentThisMonth = data.spentThisMonth || 0;
            const limitEmpresa = data.monthlyBudget || 500;
            const percentSpent = limitEmpresa > 0 ? Math.min(100, (spentThisMonth / limitEmpresa) * 100) : 0;
            
            const txtSpentMonthlyRatio = document.getElementById('txtSpentMonthlyRatio');
            if (txtSpentMonthlyRatio) {
                txtSpentMonthlyRatio.innerText = `R$ ${spentThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${limitEmpresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            const barSpentMonthly = document.getElementById('barSpentMonthly');
            if (barSpentMonthly) {
                barSpentMonthly.style.width = `${percentSpent}%`;
                if (percentSpent >= 90) {
                    barSpentMonthly.style.background = '#ef4444'; // Vermelho
                } else if (percentSpent >= 80) {
                    barSpentMonthly.style.background = '#f59e0b'; // Laranja
                } else {
                    barSpentMonthly.style.background = 'var(--color-primary)';
                }
            }

            // Carregar Cartão Corporativo se cadastrado (PCI Compliance - Sem expor chaves cruciais)
            const visualCardNumber = document.getElementById('visualCardNumber');
            const visualCardHolder = document.getElementById('visualCardHolder');
            const visualCardExpiry = document.getElementById('visualCardExpiry');
            const visualCardCvv = document.getElementById('visualCardCvv');
            const cardBrandLogo = document.getElementById('cardBrandLogo');

            if (card) {
                if (visualCardNumber) visualCardNumber.innerText = `**** **** **** ${card.last4 || '****'}`;
                if (visualCardHolder) visualCardHolder.innerText = card.holder || 'NOME DO TITULAR';
                if (visualCardExpiry) visualCardExpiry.innerText = card.expiry || 'MM/AA';
                if (visualCardCvv) visualCardCvv.innerText = '***';

                if (cardBrandLogo) {
                    cardBrandLogo.className = '';
                    const brand = String(card.brand).toLowerCase();
                    if (brand === 'visa') cardBrandLogo.className = 'fa-brands fa-cc-visa';
                    else if (brand === 'mastercard') cardBrandLogo.className = 'fa-brands fa-cc-mastercard';
                    else if (brand === 'amex') cardBrandLogo.className = 'fa-brands fa-cc-amex';
                    else if (brand === 'discover') cardBrandLogo.className = 'fa-brands fa-cc-discover';
                    else if (brand === 'diners') cardBrandLogo.className = 'fa-brands fa-cc-diners-club';
                    else cardBrandLogo.className = 'fa-solid fa-credit-card';
                }

                const corpCardNumber = document.getElementById('corpCardNumber');
                const corpCardHolder = document.getElementById('corpCardHolder');
                const corpCardExpiry = document.getElementById('corpCardExpiry');
                const corpCardCvv = document.getElementById('corpCardCvv');

                if (corpCardNumber) corpCardNumber.value = `•••• •••• •••• ${card.last4 || ''}`;
                if (corpCardHolder) corpCardHolder.value = card.holder || '';
                if (corpCardExpiry) corpCardExpiry.value = card.expiry || '';
                if (corpCardCvv) corpCardCvv.value = '•••';
            }

            // Sincronizar saldos de forma silenciosa e carregar histórico de recargas
            window.carregarHistoricoRecargas();
            if (typeof window.carregarHistoricoResgatesEmpresa === 'function') {
                window.carregarHistoricoResgatesEmpresa();
            }
        }
    });
};

window.aplicarVisibilidadeCamposConfigRewards = function (isRewardsAtiva) {
    const budgetContainer = document.getElementById('adminMonthlyBudgetContainer');
    if (budgetContainer) budgetContainer.style.display = isRewardsAtiva ? 'block' : 'none';

    const coinsNivelContainer = document.getElementById('gamiCoinsNivelContainer');
    if (coinsNivelContainer) coinsNivelContainer.style.display = isRewardsAtiva ? 'block' : 'none';

    const btnRanking = document.querySelector('button[onclick*="gamiTabRanking"]');
    const btnGiftCards = document.querySelector('button[onclick*="gamiTabGiftCards"]');
    if (btnRanking) btnRanking.style.display = isRewardsAtiva ? 'inline-block' : 'none';
    if (btnGiftCards) btnGiftCards.style.display = isRewardsAtiva ? 'inline-block' : 'none';

    if (!isRewardsAtiva) {
        const activeTabBtn = document.querySelector('.internal-tabs-nav .tab-btn.active');
        if (activeTabBtn) {
            const onClickStr = activeTabBtn.getAttribute('onclick') || '';
            if (onClickStr.includes('gamiTabRanking') || onClickStr.includes('gamiTabGiftCards')) {
                const firstTabBtn = document.querySelector('.internal-tabs-nav .tab-btn');
                if (firstTabBtn && typeof openGamiTab === 'function') {
                    openGamiTab('gamiTabRegras', firstTabBtn);
                }
            }
        }
    }
};

let isTogglingGamificacao = false;

window.alternarChaveGamificacao = async function (checkboxElement) {
    if (isTogglingGamificacao) {
        checkboxElement.checked = !checkboxElement.checked; // Revert click if locked
        return;
    }
    
    isTogglingGamificacao = true;
    const isAtiva = !!checkboxElement.checked;
    checkboxElement.disabled = true; // Block double clicks

    const containerRewards = document.getElementById('rewardsToggleContainer');
    if (containerRewards) containerRewards.style.opacity = isAtiva ? '1' : '0.4';
    if (containerRewards) containerRewards.style.pointerEvents = isAtiva ? 'auto' : 'none';

    const containerInternal = document.getElementById('internalPrizesToggleContainer');
    if (containerInternal) containerInternal.style.opacity = isAtiva ? '1' : '0.4';
    if (containerInternal) containerInternal.style.pointerEvents = isAtiva ? 'auto' : 'none';

    document.getElementById('gamiSettingsArea').style.display = isAtiva ? 'block' : 'none';
    if (document.getElementById('gamiToggleIcon')) document.getElementById('gamiToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-danger)';
    if (document.getElementById('gamiToggleText')) document.getElementById('gamiToggleText').innerText = isAtiva ? 'Gamificação Ativada' : 'Gamificação Desativada';

    try {
        await db.collection('empresas').doc(String(currentUser.companyId)).set({ 
            gamificationEnabled: isAtiva 
        }, { merge: true });

        const compIndex = companies.findIndex(x => String(x.id) === String(currentUser.companyId));
        if (compIndex !== -1) companies[compIndex].gamificationEnabled = isAtiva;

        if (typeof window.aplicarVisibilidadeGamificacao === 'function') window.aplicarVisibilidadeGamificacao();

        showToast(isAtiva ? 'Módulo Gamificação ATIVADO!' : 'Módulo Gamificação DESATIVADO!', 'success');
        
        // Timeout longo e seguro para salvar as regras depois do painel montar e abrir
        setTimeout(() => {
            if (typeof window.salvarRegrasGamificacao === 'function' && isAtiva) {
                window.salvarRegrasGamificacao(null);
            }
        }, 800);
        
    } catch (err) {
        console.error("Erro CRÍTICO ao salvar status da Gamificação:", err);
        showToast("Erro ao salvar configuração no banco de dados.", "error");
        checkboxElement.checked = !isAtiva; // Rollback UI
    } finally {
        checkboxElement.disabled = false;
        isTogglingGamificacao = false;
    }
};

window.alternarChaveRewards = async function (checkboxElement) {
    const isAtiva = !!checkboxElement.checked;
    checkboxElement.disabled = true;
    try {
        await db.collection('empresas').doc(String(currentUser.companyId)).set({ 
            rewardsEnabled: isAtiva 
        }, { merge: true });
        
        const compIndex = companies.findIndex(x => String(x.id) === String(currentUser.companyId));
        if (compIndex !== -1) companies[compIndex].rewardsEnabled = isAtiva;

        if (typeof window.aplicarVisibilidadeGamificacao === 'function') window.aplicarVisibilidadeGamificacao();
        if (typeof window.aplicarVisibilidadeCamposConfigRewards === 'function') window.aplicarVisibilidadeCamposConfigRewards(isAtiva);
        
        showToast(isAtiva ? 'Loja ATIVADA!' : 'Loja DESATIVADA!', 'success');
    } catch(err) {
        console.error("Erro ao salvar status da Loja:", err);
        showToast("Erro ao salvar configuração.", "error");
        checkboxElement.checked = !isAtiva;
    } finally {
        checkboxElement.disabled = false;
    }
};

window.alternarChaveInternalPrizes = async function (checkboxElement) {
    const isAtiva = !!checkboxElement.checked;
    checkboxElement.disabled = true;
    try {
        await db.collection('empresas').doc(String(currentUser.companyId)).set({
            internalPrizesEnabled: isAtiva
        }, { merge: true });

        const compIndex = companies.findIndex(x => String(x.id) === String(currentUser.companyId));
        if (compIndex !== -1) companies[compIndex].internalPrizesEnabled = isAtiva;

        showToast(isAtiva ? 'Prêmios Internos ATIVADOS no catálogo!' : 'Prêmios Internos REMOVIDOS do catálogo!', 'success');
    } catch (err) {
        console.error('Erro ao salvar Prêmios Internos:', err);
        showToast('Erro ao salvar configuração.', 'error');
        checkboxElement.checked = !isAtiva;
    } finally {
        checkboxElement.disabled = false;
    }
};

window.renderAdminGiftCardCheckboxes = function(activeList) {
    const cbContainer = document.getElementById('adminGiftCardCheckboxes');
    if (!cbContainer) return;

    if (!activeList) {
        const c = companies.find(x => String(x.id) === String(currentUser.companyId));
        activeList = (c && c.giftCardConfig && c.giftCardConfig.active) || c.activeGiftCards || [];
    }

    if (window.apiGiftCardsCatalog) {
        let cbHtml = '';
        window.apiGiftCardsCatalog.forEach(card => {
            const isChecked = activeList.includes(card.id) ? 'checked' : '';
            const iconColor = card.bgColor === '#000000' ? 'var(--color-text-primary)' : card.bgColor;
            cbHtml += `
            <label style="display: flex; align-items: center; gap: 10px; background: var(--color-bg-secondary); padding: 12px 15px; border-radius: 8px; border: 1px solid var(--color-border); cursor: pointer; user-select: none; transition: 0.2s;">
                <input type="checkbox" class="chk-giftcard" value="${card.id}" ${isChecked} onchange="window.salvarRegrasGamificacao(null)" style="width: 18px; height: 18px; cursor: pointer;">
                <i class="${card.fallbackIcon}" style="color: ${iconColor}; font-size: 22px;"></i>
                <strong style="font-size: 14px; color: var(--color-text-primary);">${card.name}</strong>
            </label>`;
        });
        cbContainer.innerHTML = cbHtml;
    }
};

window.setupAdminCalendario = function () {
    db.collection('empresas').doc(currentUser.companyId.toString()).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const isAtiva = data.calendarioEnabled === true;

            const chk = document.getElementById('chkCalendarioMaster');
            if (chk) chk.checked = isAtiva;

            if (document.getElementById('calendarioToggleIcon')) document.getElementById('calendarioToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-primary)';
            if (document.getElementById('calendarioToggleText')) document.getElementById('calendarioToggleText').innerText = isAtiva ? 'Calendário Ativado' : 'Calendário Desativado';

            window.loadCalendarCategoriesUI(data.calendarCategories);
        }
    });
};

window.calendarCategoriesLocal = [];

window.loadCalendarCategoriesUI = function (cats) {
    if (!cats || !Array.isArray(cats) || cats.length === 0) {
        cats = ['Reunião', 'Prazo', 'Evento', 'Feriado', 'Outro'];
    }
    window.calendarCategoriesLocal = cats;

    // Auto-update selects as soon as we load them
    if (typeof window.updateCalendarCategoriesSelects === 'function') {
        window.updateCalendarCategoriesSelects(cats);
    }

    const container = document.getElementById('calendarCategoriesList');
    if (!container) return;

    let html = '';
    cats.forEach((cat, index) => {
        html += `<span class="badge" style="background: var(--color-bg-primary); border: 1px solid var(--color-border); color: var(--color-text-primary); padding: 6px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 8px;">
                    ${cat}
                    <i class="fa-solid fa-circle-xmark" style="cursor:pointer; color: var(--color-danger); opacity: 0.8;" onclick="window.deleteCalendarCategory(${index})"></i>
                 </span>`;
    });
    container.innerHTML = html;
};

window.addCalendarCategory = function () {
    const input = document.getElementById('newCalCategoryName');
    if (!input) return;
    const catName = input.value.trim();
    if (!catName) return;

    if (window.calendarCategoriesLocal.includes(catName)) {
        showToast('Esta categoria já existe!', 'error');
        return;
    }

    window.calendarCategoriesLocal.push(catName);
    input.value = '';

    window.saveCalendarCategoriesToDB();
};

window.deleteCalendarCategory = function (index) {
    if (window.calendarCategoriesLocal.length <= 1) {
        showToast('Deverá existir pelo menos uma categoria!', 'error');
        return;
    }

    window.calendarCategoriesLocal.splice(index, 1);
    window.saveCalendarCategoriesToDB();
};

window.saveCalendarCategoriesToDB = function () {
    db.collection('empresas').doc(currentUser.companyId.toString()).set({
        calendarCategories: window.calendarCategoriesLocal
    }, { merge: true }).then(() => {
        window.loadCalendarCategoriesUI(window.calendarCategoriesLocal);
        window.updateCalendarCategoriesSelects(window.calendarCategoriesLocal);
        showToast('Categorias do calendário atualizadas!');
    }).catch(e => {
        showToast('Erro ao gravar categoria', 'error');
    });
};

window.alternarChaveCalendario = function (checkboxElement) {
    const isAtiva = checkboxElement.checked;

    if (document.getElementById('calendarioToggleIcon')) document.getElementById('calendarioToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-primary)';
    if (document.getElementById('calendarioToggleText')) document.getElementById('calendarioToggleText').innerText = isAtiva ? 'Calendário Ativado' : 'Calendário Desativado';

    window.salvarFuncoesExtras(null);
};

window.salvarFuncoesExtras = function (btnElement) {
    const txtOriginal = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
        btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        btnElement.disabled = true;
    }

    const checkboxCalendario = document.getElementById('chkCalendarioMaster');
    const calAtiva = checkboxCalendario ? checkboxCalendario.checked : false;

    db.collection('empresas').doc(currentUser.companyId.toString()).set({ calendarioEnabled: calAtiva }, { merge: true }).then(() => {
        const compIndex = companies.findIndex(x => x.id === currentUser.companyId);
        if (compIndex !== -1) companies[compIndex].calendarioEnabled = calAtiva;

        if (typeof window.aplicarVisibilidadeCalendario === 'function') window.aplicarVisibilidadeCalendario();

        if (btnElement) {
            showToast('Configurações extras guardadas!');
            btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
            setTimeout(() => { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; }, 2000);
        }
    }).catch(err => {
        if (btnElement) {
            showToast('Erro ao guardar configurações.', 'error');
            btnElement.innerHTML = txtOriginal; btnElement.disabled = false;
        }
    });
};

window.salvarRegrasGamificacao = function (btnElement) {
    try {
        const invalidos = (typeof window.validarCamposGamificacao === 'function') ? window.validarCamposGamificacao() : [];
        if (invalidos.length) {
            if (typeof showToast === 'function') showToast('Valores inválidos: ' + invalidos.join(', '), 'error');
            return;
        }

        const txtOriginal = btnElement ? btnElement.innerHTML : '';
        if (btnElement) {
            btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
            btnElement.disabled = true;
        }

        const gamiXpBase = document.getElementById('gamiXpBase');
        const novasRegras = {
            xpBase: parseInt(gamiXpBase ? gamiXpBase.value : 50) || 50,
            xpNivel: parseInt(document.getElementById('gamiXpNivel')?.value || 500) || 500,
            coinsNivel: parseInt(document.getElementById('gamiCoinsNivel')?.value || 100) || 100,
            pesoFacil: parseFloat(document.getElementById('gamiPesoFacil')?.value || 2) || 2,
            pesoMedia: parseFloat(document.getElementById('gamiPesoMedia')?.value || 3) || 3,
            pesoDificil: parseFloat(document.getElementById('gamiPesoDificil')?.value || 4) || 4,
            premioTop1: parseInt(document.getElementById('gamiPremioTop1')?.value || 500) || 500,
            premioTop2: parseInt(document.getElementById('gamiPremioTop2')?.value || 400) || 400,
            premioTop3: parseInt(document.getElementById('gamiPremioTop3')?.value || 300) || 300,
            premioTop4: parseInt(document.getElementById('gamiPremioTop4')?.value || 200) || 200,
            premioTop5: parseInt(document.getElementById('gamiPremioTop5')?.value || 100) || 100
        };

        const inputOrcamento = document.getElementById('adminMonthlyBudget');
        const novoOrcamento = inputOrcamento ? parseFloat(inputOrcamento.value) || 500 : 500;

        const activeCards = Array.from(document.querySelectorAll('.chk-giftcard:checked')).map(cb => cb.value);
        const rateInput = document.getElementById('gamiExchangeRate');
        const novaConfigLoja = {
            rate: rateInput ? parseInt(rateInput.value) || 10 : 10,
            active: activeCards
        };

        // --- NOVOS CAMPOS: Limites e Alertas ---
        const limitEmployeeInput = document.getElementById('gamiEmployeeLimitBRL');
        const limitEmployee = limitEmployeeInput && limitEmployeeInput.value !== '' ? parseFloat(limitEmployeeInput.value) || 0 : 0;

        const alertEnabledCheckbox = document.getElementById('gamiBudgetAlertEnabled');
        const alertEnabled = alertEnabledCheckbox ? alertEnabledCheckbox.checked : false;

        const alertEmailInput = document.getElementById('gamiBudgetAlertEmail');
        const alertEmail = alertEmailInput ? alertEmailInput.value.trim() : '';

        db.collection('empresas').doc(String(currentUser.companyId)).set({
            gamificacao: novasRegras,
            monthlyBudget: novoOrcamento,
            giftCardConfig: novaConfigLoja,
            activeGiftCards: activeCards,
            exchangeRate: novaConfigLoja.rate,
            gamiEmployeeLimitBRL: limitEmployee,
            gamiBudgetAlertEnabled: alertEnabled,
            gamiBudgetAlertEmail: alertEmail
        }, { merge: true }).then(() => {

            const compIndex = companies.findIndex(x => String(x.id) === String(currentUser.companyId));
            if (compIndex !== -1) {
                companies[compIndex].gamificacao = novasRegras;
                companies[compIndex].monthlyBudget = novoOrcamento;
                companies[compIndex].giftCardConfig = novaConfigLoja;
                companies[compIndex].activeGiftCards = activeCards;
                companies[compIndex].exchangeRate = novaConfigLoja.rate;
                companies[compIndex].gamiEmployeeLimitBRL = limitEmployee;
                companies[compIndex].gamiBudgetAlertEnabled = alertEnabled;
                companies[compIndex].gamiBudgetAlertEmail = alertEmail;
            }

            if (typeof window.renderGamiProgressionTable === 'function') window.renderGamiProgressionTable();

            if (btnElement) {
                showToast('Configurações da Loja atualizadas!');
                btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
                setTimeout(() => { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; }, 2000);
            } else {
                showToast('Configurações da Loja salvas!');
            }
        }).catch(err => {
            console.error(err);
            if (btnElement) {
                showToast('Erro ao salvar!', 'error');
                btnElement.innerHTML = txtOriginal; btnElement.disabled = false;
            }
        });
    } catch (criticalError) {
        console.error("Erro crítico ao tentar montar configuração de gamificação:", criticalError);
        if (btnElement) {
            btnElement.innerHTML = 'Erro!';
            setTimeout(() => { btnElement.innerHTML = 'Salvar Regras'; btnElement.disabled = false; }, 2000);
        }
    }
};

// =========================================================
// GESTÃO DE CONFIGURAÇÕES DE GAMIFICAÇÃO (VALIDACAO + PROGRESSÃO)
// =========================================================
const CAMPOS_GAMIFICACAO_ADMIN = [
    { id: 'gamiXpBase', min: 10, max: null, label: 'XP Base' },
    { id: 'gamiXpNivel', min: 50, max: null, label: 'XP por Nível' },
    { id: 'gamiCoinsNivel', min: 0, max: null, label: 'GoCoins por Nível' },
    { id: 'gamiPesoFacil', min: 0.5, max: 10, label: 'Peso Fácil' },
    { id: 'gamiPesoMedia', min: 0.5, max: 10, label: 'Peso Média' },
    { id: 'gamiPesoDificil', min: 0.5, max: 10, label: 'Peso Difícil' },
    { id: 'gamiPremioTop1', min: 0, max: null, label: 'Prêmio 1º Lugar' },
    { id: 'gamiPremioTop2', min: 0, max: null, label: 'Prêmio 2º Lugar' },
    { id: 'gamiPremioTop3', min: 0, max: null, label: 'Prêmio 3º Lugar' },
    { id: 'gamiPremioTop4', min: 0, max: null, label: 'Prêmio 4º Lugar' },
    { id: 'gamiPremioTop5', min: 0, max: null, label: 'Prêmio 5º Lugar' },
    { id: 'gamiExchangeRate', min: 1, max: null, label: 'Taxa de Câmbio' },
    { id: 'adminMonthlyBudget', min: 0, max: null, label: 'Orçamento Mensal' }
];

window.validarCamposGamificacao = function () {
    const invalidos = [];
    CAMPOS_GAMIFICACAO_ADMIN.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (!el) return;
        const val = parseFloat(el.value);
        const ok = !isNaN(val) && (cfg.min === null || val >= cfg.min) && (cfg.max === null || val <= cfg.max);
        el.style.borderColor = ok ? '' : '#ef4444';
        el.style.outline = ok ? '' : '1px solid #ef4444';
        if (!ok) invalidos.push(cfg.label);
    });
    const msg = document.getElementById('gamiInvalidMsg');
    if (msg) {
        msg.style.display = invalidos.length ? 'flex' : 'none';
        msg.innerHTML = invalidos.length ? `<i class="fa-solid fa-triangle-exclamation"></i> Corrija: ${invalidos.join(', ')}` : '';
    }
    return invalidos;
};

window.renderGamiProgressionTable = function () {
    const valor = (id, fallback) => {
        const el = document.getElementById(id);
        const v = el ? parseFloat(el.value) : NaN;
        return (el && !isNaN(v)) ? v : fallback;
    };

    const xpBase = valor('gamiXpBase', 50);
    const xpNivel = valor('gamiXpNivel', 500);
    const coinsNivel = valor('gamiCoinsNivel', 100);
    const pesoFacil = valor('gamiPesoFacil', 2);
    const pesoMedia = valor('gamiPesoMedia', 3);
    const pesoDificil = valor('gamiPesoDificil', 4);
    const rate = valor('gamiExchangeRate', 10);

    const xpFacil = Math.round(xpBase * pesoFacil);
    const xpMedia = Math.round(xpBase * pesoMedia);
    const xpDificil = Math.round(xpBase * pesoDificil);
    const tarefasPorNivel = xpMedia > 0 ? Math.max(1, Math.ceil(xpNivel / xpMedia)) : 1;
    const custoGift50 = Math.round(rate * 50);

    const setChip = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = txt;
    };
    setChip('gamiChipFacil', `${xpFacil}`);
    setChip('gamiChipTarefas', `${tarefasPorNivel}`);
    setChip('gamiChipGift50', `${custoGift50}`);

    const PATENTES_LOCAIS = window.PATENTES || [
        { minLevel: 1, nome: 'Recruta', imagem: 'Patentes/Recruta.svg', icone: 'fa-solid fa-seedling', cor: '#CD7F32' },
        { minLevel: 3, nome: 'Aprendiz', imagem: 'Patentes/Aprendiz.svg', icone: 'fa-solid fa-book-open', cor: '#C0C0C0' },
        { minLevel: 5, nome: 'Operacional', imagem: 'Patentes/Operacional.svg', icone: 'fa-solid fa-gears', cor: '#FFD700' },
        { minLevel: 8, nome: 'Especialista', imagem: 'Patentes/Especialista.svg', icone: 'fa-solid fa-star', cor: '#E5E4E2' },
        { minLevel: 12, nome: 'Veterano', imagem: 'Patentes/Veterano.svg', icone: 'fa-solid fa-shield-halved', cor: '#878681' },
        { minLevel: 17, nome: 'Elite', imagem: 'Patentes/Elite.svg', icone: 'fa-solid fa-fire', cor: '#A7D8DE' },
        { minLevel: 23, nome: 'Mestre', imagem: 'Patentes/Mestre.svg', icone: 'fa-solid fa-gem', cor: '#50C878' },
        { minLevel: 30, nome: 'Grão-Mestre', imagem: 'Patentes/Gr%C3%A3o-Mestre.svg', icone: 'fa-solid fa-crown', cor: '#0F52BA' },
        { minLevel: 40, nome: 'Lenda', imagem: 'Patentes/Lenda.svg', icone: 'fa-solid fa-bolt-lightning', cor: '#B9F2FF' },
        { minLevel: 50, nome: 'Lenda Suprema', imagem: 'Patentes/Lenda%20Suprema.svg', icone: 'fa-solid fa-dragon', cor: '#E0115F' }
    ];

    const patenteDoNivel = (nivel) => {
        let patente = PATENTES_LOCAIS[0];
        for (let i = PATENTES_LOCAIS.length - 1; i >= 0; i--) {
            if (nivel >= PATENTES_LOCAIS[i].minLevel) { patente = PATENTES_LOCAIS[i]; break; }
        }
        return patente;
    };
    const totalNiveis = PATENTES_LOCAIS[PATENTES_LOCAIS.length - 1].minLevel;

    let linhas = '';
    for (let i = 1; i <= totalNiveis; i++) {
        const p = patenteDoNivel(i);
        const emblemaNovo = p.minLevel === i;
        const xpAcumulado = (i - 1) * xpNivel;
        const coinsAcumulados = (i - 1) * coinsNivel;
        linhas += `
        <tr style="border-bottom: 1px solid var(--color-border);${emblemaNovo ? ' background: rgba(16, 185, 129, 0.06);' : ''}">
          <td style="padding: 8px 10px; white-space: nowrap; font-weight: 700; font-size: 13px;">Nv ${i}${emblemaNovo ? ' <span style="background: rgba(16, 185, 129, 0.15); color: var(--color-primary); font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 8px; margin-left: 4px; white-space: nowrap;">novo emblema</span>' : ''}</td>
          <td style="padding: 8px 10px; white-space: nowrap;">${p.imagem ? `<img src="${p.imagem}" style="width: 20px; height: 20px; object-fit: contain; vertical-align: middle; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" onerror="this.style.display='none'">` : `<i class="${p.icone}" style="color: ${p.cor}; width: 18px;"></i>`} <span style="font-weight: 800; font-size: 13px; color: var(--color-text-primary);">${p.nome}</span></td>
          <td style="padding: 8px 10px; text-align: center; font-size: 13px; color: var(--color-text-secondary);">${xpAcumulado.toLocaleString('pt-BR')} XP</td>
          <td style="padding: 8px 10px; text-align: center; white-space: nowrap; font-weight: 800; font-size: 13px; color: var(--color-primary);">${coinsAcumulados.toLocaleString('pt-BR')} GoCoins</td>
        </tr>`;
    }

    const tabela = document.getElementById('gamiProgressionTable');
    if (tabela) {
        tabela.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; min-width: 480px; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden;">
          <thead>
            <tr style="background: var(--color-bg-secondary);">
              <th style="padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary);">Nível</th>
              <th style="padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary);">Emblema</th>
              <th style="padding: 9px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary);">XP acumulado</th>
              <th style="padding: 9px 10px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary);">GoCoins acumulados</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
        <p style="font-size: 11px; color: var(--color-text-secondary); margin-top: 10px;">
          <i class="fa-solid fa-circle-info"></i> ${totalNiveis} níveis • ${PATENTES_LOCAIS.length} emblemas: ${PATENTES_LOCAIS.map(p => `${p.nome} (Nv ${p.minLevel})`).join(', ')}. Referência: tarefa fácil = <strong>${xpFacil} XP</strong>, média = <strong>${xpMedia} XP</strong>, difícil = <strong>${xpDificil} XP</strong> — cada nível exige ${xpNivel.toLocaleString('pt-BR')} XP.
        </p>`;
    }
};

window.restaurarPadraoGamificacao = function () {
    const padraro = {
        gamiXpBase: 50, gamiXpNivel: 500, gamiCoinsNivel: 100,
        gamiPesoFacil: 2, gamiPesoMedia: 3, gamiPesoDificil: 4,
        gamiPremioTop1: 500, gamiPremioTop2: 400, gamiPremioTop3: 300, gamiPremioTop4: 200, gamiPremioTop5: 100
    };
    Object.keys(padraro).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = padraro[id];
    });
    const rate = document.getElementById('gamiExchangeRate');
    if (rate) rate.value = 10;
    const budget = document.getElementById('adminMonthlyBudget');
    if (budget) budget.value = 500;

    if (typeof window.updateExchangeRateHelp === 'function') window.updateExchangeRateHelp(10);
    if (typeof window.renderGamiProgressionTable === 'function') window.renderGamiProgressionTable();
    if (typeof showToast === 'function') showToast('Valores padrão restaurados. Clique em Guardar para aplicar.');
};

const genVar = (count) => Array.from({ length: count }, (_, i) => `variant${String(i + 1).padStart(2, '0')}`);



window.carregarPerfilEAvatar = function () {
    if (!currentUser) return;
    const inputNome = document.getElementById('admProfileName');
    if (inputNome) inputNome.value = currentUser.name;

    if (!window.charSessionActive) {
        window.carregarEstadoAvatarUrl(currentUser.avatarUrl);
    } else {
        window.renderStudio();
    }
};

window.salvarPerfilStudio = async function (btnElement) {
    const txtOriginal = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btnElement.disabled = true;

    const inputNome = document.getElementById('admProfileName');
    if (!inputNome) { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; return; }

    const novoNome = inputNome.value.trim();
    const novaSenha = document.getElementById('admProfilePassword') ? document.getElementById('admProfilePassword').value.trim() : '';

    const imgEl = document.getElementById('avatarStudioImg');
    let novoAvatar = '';
    if (imgEl && imgEl.src && imgEl.src.includes('dicebear.com')) {
        novoAvatar = imgEl.src;
    }

    if (!novoNome) { showToast('O nome não pode ficar vazio!', 'error'); btnElement.innerHTML = txtOriginal; btnElement.disabled = false; return; }

    if (novaSenha) {
        // A senha é alterada no Firebase Auth (nunca gravada no Firestore)
        try {
            await firebase.auth().currentUser.updatePassword(novaSenha);
        } catch (err) {
            showToast('Erro ao alterar senha: ' + (err.message || 'tente novamente'), 'error');
            btnElement.innerHTML = txtOriginal; btnElement.disabled = false; return;
        }
    }

    const updates = { name: novoNome };
    if (novoAvatar) updates.avatarUrl = novoAvatar;

    db.collection('usuarios').doc(currentUser.id.toString()).update(updates).then(() => {
        currentUser.name = novoNome;
        if (novoAvatar) currentUser.avatarUrl = novoAvatar;

        const uIndex = users.findIndex(x => x.id === currentUser.id);
        if (uIndex !== -1) { users[uIndex].name = novoNome; users[uIndex].avatarUrl = novoAvatar; }

        const sideName = document.getElementById('sidebarAdminName');
        if (sideName) sideName.textContent = novoNome.split(' ')[0];
        const sideAvatar = document.getElementById('adminAvatar');
        if (sideAvatar) sideAvatar.innerHTML = novoAvatar ? `<img src="${novoAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : novoNome.charAt(0).toUpperCase();

        if (typeof window.renderRankingMensal === 'function') window.renderRankingMensal('rankingAdminContainer');

        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EDITAR_PERFIL', `Atualizou seu perfil e avatar.`);
        }

        showToast('Perfil e Avatar guardados com sucesso!');
        if (document.getElementById('admProfilePassword')) document.getElementById('admProfilePassword').value = '';
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
        setTimeout(() => { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; }, 2000);
    }).catch(err => {
        showToast('Erro ao guardar no sistema.', 'error');
        btnElement.innerHTML = txtOriginal; btnElement.disabled = false;
    });
};

// --- NOVO: LÓGICA DE CONTROLE DE GASTOS, RECARGAS E INTEGRAÇÃO REAL RELOADLY ---

window.updateVisualCard = function (event) {
    const input = event.target;
    const id = input.id;
    const value = input.value;

    if (id === 'corpCardNumber') {
        // Formatar com espaço a cada 4 dígitos
        let raw = value.replace(/\s?/g, '').replace(/[^0-9]/g, '');
        let formatted = '';
        for (let i = 0; i < raw.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += raw[i];
        }
        input.value = formatted;

        // Detectar bandeira
        const cardBrandLogo = document.getElementById('cardBrandLogo');
        let brand = 'unknown';
        if (raw.startsWith('4')) {
            brand = 'visa';
        } else if (/^5[1-5]/.test(raw) || (/^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[0-1]\d|2720)/.test(raw))) {
            brand = 'mastercard';
        } else if (/^3[47]/.test(raw)) {
            brand = 'amex';
        } else if (/^6(?:011|5)/.test(raw)) {
            brand = 'discover';
        } else if (/^3(?:0[0-5]|[68])/.test(raw)) {
            brand = 'diners';
        }

        if (cardBrandLogo) {
            cardBrandLogo.className = '';
            if (brand === 'visa') {
                cardBrandLogo.className = 'fa-brands fa-cc-visa';
            } else if (brand === 'mastercard') {
                cardBrandLogo.className = 'fa-brands fa-cc-mastercard';
            } else if (brand === 'amex') {
                cardBrandLogo.className = 'fa-brands fa-cc-amex';
            } else if (brand === 'discover') {
                cardBrandLogo.className = 'fa-brands fa-cc-discover';
            } else if (brand === 'diners') {
                cardBrandLogo.className = 'fa-brands fa-cc-diners-club';
            } else {
                cardBrandLogo.className = 'fa-solid fa-credit-card';
            }
            cardBrandLogo.dataset.brand = brand;
        }

        const visualCardNumber = document.getElementById('visualCardNumber');
        if (visualCardNumber) {
            let padded = formatted + '•••• •••• •••• ••••'.slice(formatted.length);
            visualCardNumber.innerText = padded || '**** **** **** ****';
        }
    } else if (id === 'corpCardHolder') {
        const visualCardHolder = document.getElementById('visualCardHolder');
        if (visualCardHolder) {
            visualCardHolder.innerText = value.toUpperCase() || 'NOME DO TITULAR';
        }
    } else if (id === 'corpCardExpiry') {
        let raw = value.replace(/\//g, '').replace(/[^0-9]/g, '');
        let formatted = raw;
        if (raw.length > 2) {
            formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4);
        }
        input.value = formatted;

        const visualCardExpiry = document.getElementById('visualCardExpiry');
        if (visualCardExpiry) {
            visualCardExpiry.innerText = formatted || 'MM/AA';
        }
    } else if (id === 'corpCardCvv') {
        let raw = value.replace(/[^0-9]/g, '');
        input.value = raw;

        const visualCardCvv = document.getElementById('visualCardCvv');
        if (visualCardCvv) {
            visualCardCvv.innerText = '•'.repeat(raw.length) || '***';
        }
    }
};

window.setCardFlipped = function (isFlipped) {
    const wrap = document.getElementById('visualCreditCardWrap');
    if (wrap) {
        if (isFlipped) {
            wrap.classList.add('flipped');
        } else {
            wrap.classList.remove('flipped');
        }
    }
};

window.alternarGiroCartaoManualmente = function () {
    const wrap = document.getElementById('visualCreditCardWrap');
    if (wrap) {
        wrap.classList.toggle('flipped');
    }
};

window.salvarCartaoCorporativo = function () {
    const btn = document.getElementById('btnSalvarCartaoCorp');
    const txtOriginal = btn ? btn.innerHTML : '';

    try {
        const numberInput = document.getElementById('corpCardNumber');
        const holderInput = document.getElementById('corpCardHolder');
        const expiryInput = document.getElementById('corpCardExpiry');
        const cvvInput = document.getElementById('corpCardCvv');

        const numberVal = numberInput ? numberInput.value.replace(/\s/g, '') : '';
        const holderVal = holderInput ? holderInput.value.trim().toUpperCase() : '';
        const expiryVal = expiryInput ? expiryInput.value.trim() : '';
        const cvvVal = cvvInput ? cvvInput.value.trim() : '';

        // Validações
        if (numberVal.length < 13 || !/^[0-9]+$/.test(numberVal.replace(/[^0-9]/g, ''))) {
            showToast('Número de cartão inválido!', 'error');
            return;
        }
        if (!holderVal) {
            showToast('Nome do titular é obrigatório!', 'error');
            return;
        }
        if (!/^\d{2}\/\d{2}$/.test(expiryVal)) {
            showToast('Data de validade deve ser no formato MM/AA!', 'error');
            return;
        }
        if (cvvVal.length < 3 || cvvVal.length > 4) {
            showToast('Código CVV inválido!', 'error');
            return;
        }

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criptografando e salvando...';
            btn.disabled = true;
        }

        // PCI Compliance: Guardar apenas os últimos 4 dígitos
        const last4 = numberVal.slice(-4);
        
        // Detectar bandeira
        const cardBrandLogo = document.getElementById('cardBrandLogo');
        let brand = 'credit-card';
        if (cardBrandLogo && cardBrandLogo.dataset.brand) {
            brand = cardBrandLogo.dataset.brand;
        } else {
            if (numberVal.startsWith('4')) brand = 'visa';
            else if (/^5[1-5]/.test(numberVal)) brand = 'mastercard';
            else if (/^3[47]/.test(numberVal)) brand = 'amex';
        }

        const creditCardSafe = {
            brand: brand,
            holder: holderVal,
            expiry: expiryVal,
            last4: last4
        };

        db.collection('empresas').doc(String(currentUser.companyId)).set({
            creditCard: creditCardSafe
        }, { merge: true }).then(() => {
            // Atualizar memória local
            const compIndex = companies.findIndex(x => String(x.id) === String(currentUser.companyId));
            if (compIndex !== -1) {
                companies[compIndex].creditCard = creditCardSafe;
            }

            showToast('Cartão corporativo cadastrado e criptografado com sucesso!');

            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Cartão Salvo!';
                setTimeout(() => { btn.innerHTML = txtOriginal; btn.disabled = false; }, 2000);
            }
            
            // Recarregar setup para atualizar elementos Visuais do Cartão
            window.setupAdminGamification();
        }).catch(err => {
            console.error('Erro ao salvar cartão corporativo:', err);
            showToast('Erro ao salvar cartão corporativo.', 'error');
            if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
        });
    } catch (e) {
        console.error(e);
        if (btn) { btn.innerHTML = txtOriginal; btn.disabled = false; }
    }
};

window.carregarHistoricoRecargas = function () {
    const container = document.getElementById('historicoRecargasContainer');
    if (!container) return;

    db.collection('resgates')
      .where('companyId', '==', currentUser.companyId)
      .get()
      .then(snapshot => {
          if (snapshot.empty) {
              container.innerHTML = `
                  <div style="padding: 30px; text-align: center; opacity: 0.5; font-size: 13px;">
                      <i class="fa-solid fa-receipt" style="font-size: 24px; margin-bottom: 10px; display: block; color: var(--color-primary);"></i>
                      Nenhum faturamento registrado até o momento.
                  </div>
              `;
              return;
          }

          let docs = [];
          snapshot.forEach(doc => {
              const d = doc.data();
              // A billing transaction is a completed gift card redemption (local or reloadly)
              if ((d.tipo === 'giftcard' || d.tipo === 'giftcard_reloadly') && d.status === 'entregue') {
                  docs.push(d);
              }
          });

          if (docs.length === 0) {
              container.innerHTML = `
                  <div style="padding: 30px; text-align: center; opacity: 0.5; font-size: 13px;">
                      <i class="fa-solid fa-receipt" style="font-size: 24px; margin-bottom: 10px; display: block; color: var(--color-primary);"></i>
                      Nenhum faturamento registrado até o momento.
                  </div>
              `;
              return;
          }

          // Ordenar em memória (createdAt desc)
          docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          docs = docs.slice(0, 10);

          let html = `
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                  <thead>
                      <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-secondary); font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
                          <th style="padding: 10px 12px;">ID Transação</th>
                          <th style="padding: 10px 12px;">Data / Hora</th>
                          <th style="padding: 10px 12px;">Colaborador / Item</th>
                          <th style="padding: 10px 12px;">Método</th>
                          <th style="padding: 10px 12px; text-align: right;">Valor Pago (R$)</th>
                          <th style="padding: 10px 12px; text-align: center;">Status</th>
                      </tr>
                  </thead>
                  <tbody>
          `;

          docs.forEach(d => {
              const date = new Date(d.createdAt).toLocaleString('pt-BR');
              
              let brandIcon = '<i class="fa-solid fa-credit-card"></i>';
              const b = String(d.cardBrand || 'visa').toLowerCase();
              if (b === 'visa') brandIcon = '<i class="fa-brands fa-cc-visa" style="color: #1a1f71; font-size: 16px;"></i>';
              else if (b === 'mastercard') brandIcon = '<i class="fa-brands fa-cc-mastercard" style="color: #eb001b; font-size: 16px;"></i>';
              else if (b === 'amex') brandIcon = '<i class="fa-brands fa-cc-amex" style="color: #016fd0; font-size: 16px;"></i>';

              const valorReais = d.valorReais || d.preco || 0;

              html += `
                  <tr style="border-bottom: 1px solid var(--color-border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 12px; font-family: monospace; opacity: 0.7;">${d.id.slice(0, 8)}...</td>
                      <td style="padding: 12px; font-weight: bold;">${date}</td>
                      <td style="padding: 12px;">
                          <div style="font-weight: 600; color: var(--color-text-primary);">${d.userName || 'Administrador'}</div>
                          <div style="font-size: 10px; opacity: 0.6;">${d.premioNome || 'Faturamento sob Demanda'}</div>
                      </td>
                      <td style="padding: 12px; display: flex; align-items: center; gap: 8px;">
                          ${brandIcon}
                          <span style="font-weight: 500;">Cartão (•••• ${d.cardLast4 || '****'})</span>
                      </td>
                      <td style="padding: 12px; text-align: right; font-weight: 900; color: #10b981;">R$ ${Number(valorReais).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style="padding: 12px; text-align: center;">
                          <span style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 4px 8px; border-radius: 20px;">
                              <i class="fa-solid fa-circle-check" style="font-size: 9px;"></i> Aprovado
                          </span>
                      </td>
                  </tr>
              `;
          });

          html += `
                  </tbody>
              </table>
          `;
          container.innerHTML = html;
      }).catch(err => {
          console.error('Erro ao ler faturamento da empresa:', err);
          container.innerHTML = `
              <div style="padding: 20px; text-align: center; color: var(--color-danger); font-size: 12px;">
                  <i class="fa-solid fa-circle-exclamation"></i> Falha ao sincronizar extrato com o Firebase. Detalhes: ${err.message || err}
              </div>
          `;
      });
};

window.carregarHistoricoResgatesEmpresa = function () {
    const container = document.getElementById('historicoResgatesEmpresaContainer');
    if (!container) return;

    db.collection('resgates')
      .where('companyId', '==', currentUser.companyId)
      .get()
      .then(snapshot => {
          if (snapshot.empty) {
              container.innerHTML = `
                  <div style="padding: 30px; text-align: center; opacity: 0.5; font-size: 13px;">
                      <i class="fa-solid fa-gift" style="font-size: 24px; margin-bottom: 10px; display: block; color: var(--color-primary);"></i>
                      Nenhum resgate efetuado até o momento.
                  </div>
              `;
              return;
          }

          let docs = [];
          snapshot.forEach(doc => {
              const d = doc.data();
              if (d.tipo === 'giftcard' || d.tipo === 'giftcard_reloadly') {
                  docs.push(d);
              }
          });

          if (docs.length === 0) {
              container.innerHTML = `
                  <div style="padding: 30px; text-align: center; opacity: 0.5; font-size: 13px;">
                      <i class="fa-solid fa-gift" style="font-size: 24px; margin-bottom: 10px; display: block; color: var(--color-primary);"></i>
                      Nenhum resgate efetuado até o momento.
                  </div>
              `;
              return;
          }

          // Ordenar em memória (createdAt desc)
          docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          docs = docs.slice(0, 10);

          let html = `
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                  <thead>
                      <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-secondary); font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
                          <th style="padding: 10px 12px;">ID Resgate</th>
                          <th style="padding: 10px 12px;">Data / Hora</th>
                          <th style="padding: 10px 12px;">Colaborador / Item</th>
                          <th style="padding: 10px 12px;">Tipo</th>
                          <th style="padding: 10px 12px; text-align: right;">Valor (GC)</th>
                          <th style="padding: 10px 12px; text-align: right;">Valor (R$)</th>
                          <th style="padding: 10px 12px; text-align: center;">Status</th>
                      </tr>
                  </thead>
                  <tbody>
          `;

          docs.forEach(d => {
              const date = new Date(d.createdAt).toLocaleString('pt-BR');
              const statusCor = d.status === 'entregue' ? '#10b981' : d.status === 'cancelado' || d.status === 'recusado' ? '#ef4444' : '#f59e0b';
              const statusTexto = d.status === 'entregue' ? 'Entregue' : d.status === 'cancelado' || d.status === 'recusado' ? 'Cancelado' : 'Pendente';
              const statusIcon = d.status === 'entregue' ? 'fa-circle-check' : d.status === 'cancelado' || d.status === 'recusado' ? 'fa-circle-xmark' : 'fa-clock';

              html += `
                  <tr style="border-bottom: 1px solid var(--color-border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 12px; font-family: monospace; opacity: 0.7;">${d.id.slice(0, 8)}...</td>
                      <td style="padding: 12px; font-weight: bold;">${date}</td>
                      <td style="padding: 12px;">
                          <div style="font-weight: 600; color: var(--color-text-primary);">${d.userName || 'Colaborador'}</div>
                          <div style="font-size: 10px; opacity: 0.6;">${d.premioNome}</div>
                      </td>
                      <td style="padding: 12px; text-transform: capitalize; font-weight: 500;">
                          ${d.tipo === 'giftcard_reloadly' ? 'Reloadly (Inst.)' : 'Local (Manual)'}
                      </td>
                      <td style="padding: 12px; text-align: right; color: var(--color-primary); font-weight: 800;">${d.preco.toLocaleString('pt-BR')} GC</td>
                      <td style="padding: 12px; text-align: right; font-weight: 900; color: #10b981;">R$ ${Number(d.valorReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td style="padding: 12px; text-align: center;">
                          <span style="background: ${statusCor}22; color: ${statusCor}; font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 4px 8px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
                              <i class="fa-solid ${statusIcon}" style="font-size: 9px;"></i> ${statusTexto}
                          </span>
                      </td>
                  </tr>
              `;
          });

          html += `
                  </tbody>
              </table>
          `;
          container.innerHTML = html;
      }).catch(err => {
          console.error('Erro ao ler resgates dos colaboradores:', err);
          container.innerHTML = `
              <div style="padding: 20px; text-align: center; color: var(--color-danger); font-size: 12px;">
                  <i class="fa-solid fa-circle-exclamation"></i> Falha ao sincronizar histórico de resgates. Detalhes: ${err.message || err}
              </div>
          `;
      });
};