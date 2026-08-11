// ============ LÓGICA DO PAINEL DE ADMINISTRAÇÃO ============
function initAdminPanel(abaForcada = null) {
  // Conversão segura de IDs para não falhar na busca
  const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
  if (!c) return;

  document.getElementById('admCompanySidebar').textContent = c.name;
  document.getElementById('sidebarAdminName').textContent = currentUser.name.split(' ')[0];
  
  const sideAvatar = document.getElementById('adminAvatar');
  if (sideAvatar) {
      if (currentUser.avatarUrl && currentUser.avatarUrl.includes('dicebear')) {
          sideAvatar.innerHTML = `<img src="${currentUser.avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      } else {
          sideAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
      }
  }

  if (currentUser.role === 'hibrido') {
    let btnBox = document.getElementById('boxSwitchToFunc');
    if (!btnBox) {
        const nav = document.querySelector('#adminPanel .sidebar-nav');
        if(nav) {
            nav.insertAdjacentHTML('afterbegin', `
              <div id="boxSwitchToFunc" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; padding-left: 12px; padding-right: 12px; padding-top: 5px;">
                  <button onclick="alternarVisaoHibrida('func')" class="btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); width: 100%; border-radius: 8px; font-size: 13px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);">
                      <i class="fa-solid fa-user-astronaut"></i> Modo Colaborador
                  </button>
              </div>
            `);
        }
    }
  }

  updateCurrentDate('adminCurrentDate');
  
  // 🛡️ MÁGICA DA BLINDAGEM: Limpa qualquer lixo da memória
  let abaParaAbrir = abaForcada || localStorage.getItem('feedbackgo_aba_admin') || 'dashboard';
  abaParaAbrir = String(abaParaAbrir).replace(/['"]/g, '').trim(); // Tira aspas acidentais
  if (abaParaAbrir === 'null' || abaParaAbrir === 'undefined' || abaParaAbrir === '') {
      abaParaAbrir = 'dashboard';
  }

  showAdminSection(abaParaAbrir);
  setTimeout(runAutoCleanup, 5000);
}

// 🔥 FUNÇÃO GLOBAL PARA TROCAR DE TELA INSTANTANEAMENTE
window.alternarVisaoHibrida = function(destino) {
  // SALVA A ROUPA NOVA
  localStorage.setItem('feedbackgo_modo_hibrido', destino);

  const pAdmin = document.getElementById('adminPanel');
  const pFunc = document.getElementById('employeePanel');
  
  document.querySelectorAll('.sidebar-nav').forEach(n => n.classList.remove('open'));
  
  if (destino === 'func') {
      if(pAdmin) pAdmin.classList.add('hidden');
      if(pFunc) pFunc.classList.remove('hidden');
      if (typeof initEmployeePanel === 'function') initEmployeePanel(localStorage.getItem('feedbackgo_aba_func'));
  } else {
      if(pFunc) pFunc.classList.add('hidden');
      if(pAdmin) pAdmin.classList.remove('hidden');
      if (typeof initAdminPanel === 'function') initAdminPanel(localStorage.getItem('feedbackgo_aba_admin'));
  }
};

async function showAdminSection(sec) {
  const palco = document.getElementById('adminConteudoDinamico');
  if (!palco) return;

  // 🛡️ MÁGICA DA BLINDAGEM 2: Garante que a rota existe
  sec = String(sec).replace(/['"]/g, '').trim();
  if (sec === 'null' || sec === 'undefined' || sec === '') sec = 'dashboard';
  localStorage.setItem('feedbackgo_aba_admin', sec);

  // O bloco try/catch impede que a tela fique branca se o botão não for encontrado
  try {
      document.querySelectorAll('#adminPanel .nav-item').forEach((i) => i.classList.remove('active'));
      const activeNav = document.querySelector(`#adminPanel .nav-item[onclick*="${sec}"]`);
      if (activeNav) activeNav.classList.add('active');
  } catch(e) { console.warn("Erro inofensivo no menu resolvido."); }

  const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
  const isGamiAtiva = c && c.gamificationEnabled === true;
  
  const menuLojaAdmin = document.querySelector('#adminPanel .nav-item[onclick*="store"]');
  if (menuLojaAdmin) menuLojaAdmin.style.display = isGamiAtiva ? 'flex' : 'none';
  
  setTimeout(() => {
      const rankingAdmin = document.getElementById('rankingAdminContainer');
      if (rankingAdmin && !isGamiAtiva) rankingAdmin.parentElement.style.display = 'none';
  }, 100);

  palco.style.transition = 'opacity 0.2s ease';
  palco.style.opacity = '0';
  await new Promise(resolve => setTimeout(resolve, 200));

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
      store: 'admin-loja.html'
    };

    if (!rotas[sec]) sec = 'dashboard';

    const resposta = await fetch(`./telas/${rotas[sec]}`);
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
      
      // Força a renderização inicial após popular os filtros
      if (typeof generateReport === 'function') generateReport();
      if (typeof reportUpdateCount === 'function') reportUpdateCount();
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
      
      // MÁGICA DO MODO ESCURO NA ABA CONFIGURAÇÕES
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
  if (typeof window.updateTaskCompletionChart === 'function') window.updateTaskCompletionChart();
  
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

window.clearAllDashFilters = function() {
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
    
    const elHoje = document.getElementById('adminTodayTasks');
    const elMes = document.getElementById('adminMonthTasks');
    const elTotal = document.getElementById('adminTotalTasks');

    if (elHoje) elHoje.textContent = filtered.filter(a => a.date === getLocalToday()).length;
    if (elMes) elMes.textContent = filtered.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    }).length;
    if (elTotal) elTotal.textContent = filtered.length;
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
        let conc = 0, and = 0, pend = 0;
        actsForStatus.forEach((a) => {
            if (a.status === 'concluido') conc++;
            else if (a.status === 'andamento') and++;
            else if (a.status === 'pendente') pend++;
        });

        const statusMap = ['concluido', 'andamento', 'pendente'];
        const activeColors = isDark 
            ? ['rgba(74, 222, 128, 0.9)', 'rgba(253, 224, 71, 0.9)', 'rgba(248, 113, 113, 0.9)'] 
            : ['rgba(34, 197, 94, 0.9)', 'rgba(234, 179, 8, 0.9)', 'rgba(239, 68, 68, 0.9)'];
            
        const inactiveColors = isDark
            ? ['rgba(74, 222, 128, 0.15)', 'rgba(253, 224, 71, 0.15)', 'rgba(248, 113, 113, 0.15)']
            : ['rgba(34, 197, 94, 0.2)', 'rgba(234, 179, 8, 0.2)', 'rgba(239, 68, 68, 0.2)'];

        const bgStatus = statusMap.map((st, i) => {
            if (!window.dashActiveStatus) return activeColors[i];
            return window.dashActiveStatus === st ? activeColors[i] : inactiveColors[i];
        });

        if (adminStatusChartInstance) adminStatusChartInstance.destroy();
        adminStatusChartInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Concluído', 'Em Andamento', 'Pendente'],
                datasets: [{
                    data: [conc, and, pend], 
                    backgroundColor: bgStatus, 
                    borderWidth: 2,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const clicked = statusMap[elements[0].index];
                        window.dashActiveStatus = (window.dashActiveStatus === clicked) ? null : clicked;
                        refreshAdminDashboard();
                    }
                },
                plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
            }
        });
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
              onClick: (e, elements) => {
                  if (elements.length > 0) {
                      const clickedCat = labels[elements[0].index];
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

// ============ SISTEMA DE PAGINAÇÃO (ADMINISTRADOR) ============
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

window.applyAdminFilters = function (page = 1) {
  currentAdminPage = page;
  
  const t = document.getElementById('admFilterTeam') ? document.getElementById('admFilterTeam').value : '';
  const uId = document.getElementById('adminFilterUser') ? document.getElementById('adminFilterUser').value : '';
  const s = document.getElementById('adminFilterStartDate') ? document.getElementById('adminFilterStartDate').value : '';
  const cat = document.getElementById('admFilterCategory') ? document.getElementById('admFilterCategory').value : ''; 
  const search = document.getElementById('admFilterSearch') ? document.getElementById('admFilterSearch').value.toLowerCase().trim() : ''; 
  
  const ordemEl = document.getElementById('ordemHistorico');
  const ordemEscolhida = ordemEl ? ordemEl.value : 'desc';
  
  let f = activities.filter((a) => a.companyId === currentUser.companyId);
  
  if (uId) f = f.filter((a) => a.userId === parseInt(uId));
  if (s) f = f.filter((a) => a.date >= s);
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

window.renderAdminHistoryPage = function() {
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

window.loadUsersTable = function() {
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
                  <button onclick="openEditUserModal(${u.id})" class="btn-icon-only edit" title="Editar"><i class="fa-solid fa-pen"></i></button>${
                  u.id !== currentUser.id ? `<button onclick="deleteUser(${u.id})" class="btn-icon-only delete" title="Apagar"><i class="fa-solid fa-trash"></i></button>` : ''
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
        .then(() => showToast('Excluído.'));
    },
    'Excluir Colaborador'
  );
};

function loadTeams(c) {
  const el = document.getElementById('teamsList');
  if (!el) return;
  el.innerHTML = (c.teams || [])
    .map(
      (t, i) =>
        `<li style="display:flex; justify-content:space-between; padding:12px; background:var(--color-bg-primary); border:1px solid var(--color-border); margin-bottom:8px;"><span>${t}</span><button onclick="deleteTeam(${i})" class="btn-icon-only delete"><i class="fa-solid fa-trash"></i></button></li>`
    )
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

window.loadCategories = function(c) {
  const el = document.getElementById('categoriesList');
  if (!el) return;

  let groups = {};
  
  (c.categories || []).forEach((cat, i) => {
      let g = "Outros"; 
      let sub = cat;
      
      if(cat.includes('::')) {
          let parts = cat.split('::');
          g = parts[0].trim();
          sub = parts[1].trim();
      }
      
      if(!groups[g]) groups[g] = [];
      groups[g].push({ id: i, name: sub, full: cat });
  });

  let html = '';
  
  for(let g in groups) {
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
      atividadeFinal.id = nextActivityId;
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
    const em = document.getElementById('newUserEmail').value.trim();
    if (users.find((u) => u.email === em))
      return showToast('E-mail já em uso.', 'error');

    const rawPass = document.getElementById('newUserPassword').value;

    try {
      // Cria a conta no Firebase Auth (a senha fica no backend, nunca no Firestore)
      const cred = await firebase.auth().createUserWithEmailAndPassword(em, rawPass);
      const authUid = cred.user.uid;

      let nId = Date.now();
      const nUser = {
        id: nId,
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
        db.collection('usuarios').doc(nId.toString()).set(nUser),
        db.collection('usuarioAuth').doc(authUid).set({
            userId: nUser.id,
            companyId: nUser.companyId,
            role: nUser.role
        }),
      ]);

      form.reset();
      if (typeof sendWelcomeEmail === 'function')
        sendWelcomeEmail(nUser.name, nUser.email);
      showToast('Colaborador criado!');
    } catch (err) {
      console.error('Erro ao criar colaborador:', err);
      showToast('Erro ao criar colaborador: ' + (err.message || 'tente novamente'), 'error');
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
      
      const n = grupo + " :: " + sub;

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
let taskCompletionChartInstance = null;

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

  // Atualizar select de pessoas (colaboradores)
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

  // Filtrar atividades base
  let acts = (activities || []).filter(a => a.companyId === currentUser.companyId && (a.status === 'concluido' || !a.status));

  // Filtro por Pessoa
  const selectedUserId = userSelect ? userSelect.value : '';
  if (selectedUserId) {
    acts = acts.filter(a => String(a.userId) === String(selectedUserId));
  }

  // Filtro por Período
  const periodSel = document.getElementById('taskChartPeriodFilter');
  const selectedPeriod = periodSel ? periodSel.value : 'all';

  const now = new Date();
  const todayStr = getLocalToday();

  if (selectedPeriod === 'today') {
    acts = acts.filter(a => a.date === todayStr);
  } else if (selectedPeriod === 'week') {
    const curr = new Date();
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay()));
    const firstDayStr = firstDay.toISOString().split('T')[0];
    acts = acts.filter(a => a.date >= firstDayStr);
  } else if (selectedPeriod === 'month') {
    const monthStr = todayStr.substring(0, 7); // YYYY-MM
    acts = acts.filter(a => a.date && a.date.startsWith(monthStr));
  } else if (selectedPeriod === 'year') {
    const yearStr = todayStr.substring(0, 4); // YYYY
    acts = acts.filter(a => a.date && a.date.startsWith(yearStr));
  } else if (selectedPeriod === 'custom_day') {
    const dateInput = document.getElementById('taskChartSpecificDate');
    const specificDate = dateInput ? dateInput.value : '';
    if (specificDate) {
      acts = acts.filter(a => a.date === specificDate);
    }
  }

  // Agrupar por Título da Atividade -> Somar Volume
  const volumeByTask = {};
  acts.forEach(a => {
    const title = a.title || 'Sem título';
    const vol = Number(a.quantidade || a.volume || a.qtd || 1);
    volumeByTask[title] = (volumeByTask[title] || 0) + (isNaN(vol) ? 1 : vol);
  });

  const taskTitles = Object.keys(volumeByTask).sort((a, b) => volumeByTask[b] - volumeByTask[a]); // Ordena do maior para o menor
  const volumes = taskTitles.map(t => volumeByTask[t]);

  const ctx = canvas.getContext('2d');
  if (taskCompletionChartInstance) {
    taskCompletionChartInstance.destroy();
  }

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Paleta de cores vibrantes para as barras
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
window.downloadReportExcel = function () {
  const a = getFilteredReportData();
  if (!a.length) return alert('Sem dados.');
  const d = a.map((act) => {
    const u = users.find((x) => x.id === act.userId);
    return {
      Data: formatDate(act.date),
      Equipe: u ? u.team : '-',
      Colaborador: u ? u.name : '-',
      Categoria: act.category || 'Geral',
      Título: act.title,
      Detalhes: act.description || '-',
      Status: act.status,
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
    const id = parseInt(document.getElementById('editUserId').value);
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

  // 🔥 O "CÉREBRO" DO ALGORITMO (AGORA COM FASE DE TESTES DE 5 TAREFAS)
  // 🔥 O "CÉREBRO" DO ALGORITMO (COM FASE DE TESTES E LINHAS DE SEPARAÇÃO)
  const renderizarListaInteligente = () => {
    const container = document.getElementById('listaCheckFuncionarios');
    if (!container) return;

    const selectCat = novoForm.querySelector('#delegarCategoria');
    const categoriaSelecionada = selectCat ? selectCat.value : '';
    const funcDaEmpresa = users.filter(u => u.companyId === currentUser.companyId && u.active);

    // 1. Extração de Estatísticas Complexas
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
        if (stats[a.userId]) {
            const qtd = parseInt(a.quantidade) || 0;
            stats[a.userId].vezes++;
            stats[a.userId].somaQtd += qtd;
            stats[a.userId].somaXp += (parseInt(a.xpEarned) || 0);
            
            if (stats[a.userId].vezes >= 5) {
                totalQtdGlobal += qtd;
                totalEntregasGlobal++;
            }
        }
    });

    const mediaGlobal = totalEntregasGlobal > 0 ? (totalQtdGlobal / totalEntregasGlobal) : 0;

    // 2. Cálculo do "Score" com Trava de 5 Entregas
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

    // 3. Renderização Visual
    const indicados = funcDaEmpresa.filter(u => stats[u.id].vezes >= 5).slice(0, 6);
    const outros = funcDaEmpresa.filter(u => !indicados.includes(u));

    const gerarCard = (u, isIndicado) => {
        const s = stats[u.id];
        let infoEstatisticas = '';
        
        if (s.vezes >= 5) {
            const tagDesempenho = s.mediaQtd > mediaGlobal 
                ? '<span style="color: #10b981; font-weight: bold;"><i class="fa-solid fa-arrow-trend-up"></i> Acima da Média</span>' 
                : '<span style="opacity: 0.7;"><i class="fa-solid fa-minus"></i> Na Média Geral</span>';
            
            let qualidadeVisual = "⭐⭐⭐⭐⭐";
            if (s.score < 50) qualidadeVisual = "⭐⭐⭐⭐";
            if (s.score < 30) qualidadeVisual = "⭐⭐⭐";

            infoEstatisticas = `
            <div class="assignee-stats">
                <span title="Quantas vezes realizou o serviço">
                    <strong><i class="fa-solid fa-rotate-right"></i> Fez:</strong>
                    <b>${s.vezes}x</b>
                </span>
                <span title="A sua média individual de entregas">
                    <strong><i class="fa-solid fa-calculator"></i> Sua Média:</strong>
                    <b>${s.mediaQtd.toFixed(1)}</b>
                </span>
                <span title="Comparado à média de todos (${mediaGlobal.toFixed(1)})">
                    <strong><i class="fa-solid fa-users"></i> Equipe:</strong>
                    ${tagDesempenho}
                </span>
                <span title="Qualidade Baseada na Performance">
                    <strong><i class="fa-solid fa-gem"></i> Qualidade:</strong>
                    ${qualidadeVisual}
                </span>
            </div>`;
        } else if (s.vezes > 0 && s.vezes < 5) {
            infoEstatisticas = `
            <div class="assignee-note assignee-note--calib">
                <i class="fa-solid fa-hourglass-half"></i> Em fase de calibragem: <b>${s.vezes} de 5</b> entregas realizadas. (Aguardando mais dados).
            </div>`;
        } else {
            infoEstatisticas = `<div class="assignee-note assignee-note--empty"><i class="fa-solid fa-circle-info"></i> Nunca realizou este serviço.</div>`;
        }

        const seloIndicado = isIndicado ? `<span class="assignee-seal"><i class="fa-solid fa-award"></i> Indicado</span>` : '';

        return `
        <div style="margin-bottom: 2px;">
            <input type="checkbox" name="funcDelegado" value="${u.id}" id="checkFunc_${u.id}" class="input-hidden" style="display: none;">
            <label for="checkFunc_${u.id}" class="assignee-card ${isIndicado ? 'assignee-card--indicado' : ''}">
                <div class="assignee-card__row">
                    <div class="assignee-card__who">
                        <div class="dot"></div>
                        <span><strong>${esc(u.name)}</strong> <small>(${esc(u.team || 'Sem Equipe')})</small></span>
                    </div>
                    ${seloIndicado}
                </div>
                ${infoEstatisticas}
            </label>
        </div>`;
    };

    let htmlFinal = '';

        // 1. TÍTULO E LINHA DOS INDICADOS (Agora aparece Sempre!)
        htmlFinal += `
        <div class="section-divider">
            <span class="is-primary"><i class="fa-solid fa-ranking-star"></i> Pessoas Indicadas</span>
            <div class="section-divider__line"></div>
        </div>`;

        // 2. RENDERIZA OS INDICADOS OU MOSTRA MENSAGEM DE AVISO
        if (indicados.length > 0) {
            htmlFinal += indicados.map(u => gerarCard(u, true)).join('');
        } else {
            // Placeholder elegante para quando ninguém atingiu as 5 tarefas ainda
            htmlFinal += `
            <div class="team-empty">
                <i class="fa-solid fa-user-astronaut"></i>
                <p style="margin: 0;">Nenhum especialista formado ainda.<br><small>Os colaboradores precisam de concluir pelo menos <strong>5 entregas</strong> para entrarem no ranking.</small></p>
            </div>`;
        }

        // 3. TÍTULO E LINHA DOS OUTROS COLABORADORES (Aparece Sempre!)
        if (outros.length > 0) {
            htmlFinal += `
            <div class="section-divider">
                <span class="is-muted"><i class="fa-solid fa-users"></i> Outros Colaboradores</span>
                <div class="section-divider__line"></div>
            </div>`;
            
            htmlFinal += outros.map(u => gerarCard(u, false)).join('');
        }

        container.innerHTML = htmlFinal;
    };

  // Escuta quando a Categoria muda e recalcula o Algoritmo na hora!
  const selectCategoria = novoForm.querySelector('#delegarCategoria');
  if (selectCategoria) {
      selectCategoria.addEventListener('change', renderizarListaInteligente);
  }
  
  // Roda a primeira vez ao abrir a tela
  renderizarListaInteligente();

  // =============== RESTANTE DA LÓGICA DE UPLOAD E ENVIO ===============
  const areaArquivos = novoForm.querySelector('.file-drop-area');
  if (areaArquivos && !document.getElementById('boxDificuldadeGamificacao')) {
      const c = companies.find(x => x.id === currentUser.companyId);
      const isGamiAtiva = c && c.gamificationEnabled === true;

      const formGroupArquivos = areaArquivos.parentNode;
      const divDif = document.createElement('div');
      divDif.className = 'form-group';
      divDif.id = 'boxDificuldadeGamificacao'; 
      divDif.style.marginTop = "15px";
      divDif.style.display = isGamiAtiva ? 'block' : 'none'; 
      
      divDif.innerHTML = `
          <label><i class="fa-solid fa-layer-group"></i> Dificuldade & Recompensa</label>
          <select id="delegarDificuldade" class="form-control" style="border: 2px solid var(--color-primary); background: rgba(16, 185, 129, 0.05);">
              <option value="2">Fácil (Peso 2 - 100 XP)</option>
              <option value="3" selected>Média (Peso 3 - 150 XP)</option>
              <option value="4">Difícil (Peso 4 - 200 XP)</option>
          </select>
      `;
      formGroupArquivos.parentNode.insertBefore(divDif, formGroupArquivos.nextSibling);
  }

  let arquivosSelecionados = [];
  const fileInput = novoForm.querySelector('#delegarArquivos');
  const fileListDisplay = novoForm.querySelector('#delegarArquivosLista');

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
          showToast(`O arquivo ${files[i].name} é muito pesado (Máx 1MB)!`, 'error');
          this.value = '';
          fileListDisplay.innerHTML = '';
          arquivosSelecionados = [];
          return;
        }
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

      const dispararTarefas = (anexosProntos) => {
          let promessasFirebase = [];
          
          checkboxes.forEach((box, index) => {
              const userId = parseInt(box.value);
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
                  attachments: anexosProntos || [],
                  status: 'pendente', 
                  createdAt: dataAtual
              };

              promessasFirebase.push(db.collection('tarefas').doc(tarefaId.toString()).set(novaTarefa));
              
              promessasFirebase.push(db.collection('notificacoes').add({
                  userId: userId,
                  titulo: '🎯 Nova Tarefa!',
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
              
              renderizarListaInteligente(); // Reseta o algoritmo após o envio
              if (typeof fecharNovaTarefa === 'function') fecharNovaTarefa();
              
              if (typeof loadTarefasEnviadas === 'function') loadTarefasEnviadas(); 
          }).catch((err) => {
              showToast('Erro ao enviar.', 'error');
              btn.innerHTML = originalText;
              btn.disabled = false;
          });
      };

      if (arquivosSelecionados && arquivosSelecionados.length > 0) {
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Anexando...';
          const promessasDeArquivos = arquivosSelecionados.map((file) => {
              return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = function (evento) { resolve({ name: file.name, url: evento.target.result }); };
                  reader.readAsDataURL(file);
              });
          });
          Promise.all(promessasDeArquivos).then((anexos) => dispararTarefas(anexos));
      } else {
          dispararTarefas([]); 
      }
  });
}

// APROVAÇÃO E DEPÓSITO DE XP/MOEDAS
window.aprovarTarefaRevisao = function() {
  const idT = document.getElementById('detalhesTarefaId').value;
  
  db.collection('tarefas').doc(idT).get().then(snap => {
      const t = snap.data();
      
      db.collection('empresas').doc(t.companyId.toString()).get().then(compSnap => {
          const dataEmpresa = compSnap.data();
          const gamificacaoAtiva = dataEmpresa.gamificationEnabled === true;
          
          const regras = dataEmpresa.gamificacao || { xpBase: 50, xpNivel: 500, coinsNivel: 100, pesoFacil: 2, pesoMedia: 3, pesoDificil: 4 };

          let xpGanho = 0;
          if (gamificacaoAtiva) {
              let peso = regras.pesoMedia;
              if(t.dificuldade == 2 || t.dificuldade === 'facil') peso = regras.pesoFacil;
              if(t.dificuldade == 4 || t.dificuldade === 'dificil') peso = regras.pesoDificil;
              xpGanho = Math.round(regras.xpBase * peso);
          }

          const p1 = db.collection('tarefas').doc(idT).update({ status: 'concluido' });
          
          const p2 = db.collection('atividades').doc(Date.now().toString()).set({
              ...t, id: Date.now(), date: new Date().toISOString().split('T')[0],
              status: 'concluido', xpEarned: xpGanho, tarefaVinculadaId: idT
          });

          let p3 = Promise.resolve();
          if (gamificacaoAtiva) {
              p3 = db.collection('usuarios').doc(t.userId.toString()).get().then(uSnap => {
                  const u = uSnap.data();
                  let newXp = (u.xp || 0) + xpGanho;
                  let oldLevel = u.level || 1;
                  let newLevel = Math.floor(newXp / regras.xpNivel) + 1;
                  let newCoins = u.goCoins || 0;

                  if (newLevel > oldLevel) newCoins += (newLevel - oldLevel) * regras.coinsNivel; 

                  return db.collection('usuarios').doc(t.userId.toString()).update({ xp: newXp, level: newLevel, goCoins: newCoins });
              });
          }

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
              loadTarefasEnviadas();
          });
      });
  });
};

// =========================================================
// REVISÃO DE TAREFAS PELO ADMIN (COM FLUXOGRAMA DE ERROS)
// =========================================================
window.loadTarefasEnviadas = function() {
  const container = document.getElementById('tabelaTarefasEnviadas');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando tarefas...</div>';

  db.collection('tarefas').where('senderId', '==', currentUser.id).get()
  .then((querySnapshot) => {
      if (querySnapshot.empty) {
          container.innerHTML = '<div style="text-align:center; padding: 20px; background: var(--color-bg-primary); border-radius: 8px;">Nenhuma tarefa enviada.</div>';
          return;
      }

      let lista = [];
      querySnapshot.forEach(doc => lista.push(doc.data()));
      
      lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let html = `<div class="table-container"><table>
          <thead><tr><th>Data</th><th>Para Quem</th><th>Categoria</th><th>Tarefa</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
      
      lista.forEach(t => {
          const func = users.find(u => u.id === t.userId);
          const nomeFunc = func ? func.name : 'Removido';
          const dataFormatada = new Date(t.createdAt).toLocaleDateString('pt-BR');
          
          let badgeClass = 'status-badge--pendente'; let badgeText = 'Pendente';
          if (t.status === 'em_revisao') { badgeClass = 'status-badge--revisao'; badgeText = 'Em Revisão'; }
          if (t.status === 'concluido') { badgeClass = 'status-badge--concluida'; badgeText = 'Aprovada'; }
          
          const categoriaBadge = `<span class="badge cat-badge-dynamic" style="${getCategoryStyleString(t.category || 'Geral')}">${esc(t.category || 'Geral')}</span>`;

          html += `<tr>
              <td>${dataFormatada}</td>
              <td><strong>${esc(nomeFunc)}</strong></td>
              <td>${categoriaBadge}</td>
              <td>${esc(t.title)}</td>
              <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
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
  });
};

window.abrirDetalhesTarefa = function(idTarefa) {
  db.collection('tarefas').doc(idTarefa.toString()).get().then(docSnap => {
      if (!docSnap.exists) return;
      const t = docSnap.data();
      const func = users.find(u => u.id === t.userId);
      
      document.getElementById('detalhesTarefaId').value = t.id;
      document.getElementById('detalheTarefaTitulo').textContent = t.tituloEntrega || t.title;
      document.getElementById('detalheTarefaFunc').textContent = func ? func.name : 'Colaborador';
      document.getElementById('detalheTarefaResposta').textContent = t.respostaFuncionario || 'Nenhuma mensagem escrita na entrega.';
      
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
              html += `<a href="${escAttr(an.url)}" download="${escAttr(an.name)}" class="badge" style="background: var(--color-bg-secondary); color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--color-border);"><i class="fa-solid fa-download"></i> ${esc(an.name)}</a>`;
          });
          html += '</div>';
          boxAnexos.innerHTML = html;
      } else {
          boxAnexos.innerHTML = '<span style="font-size: 13px; color: var(--color-text-secondary);"><i class="fa-solid fa-file-excel"></i> Nenhum anexo enviado.</span>';
      }
      
      const areaRevisao = document.getElementById('areaRevisaoAdmin');
      const ftrRevisao = document.getElementById('footerRevisaoDetalhes');
      const ftrFechar = document.getElementById('footerFecharDetalhes');
      if (t.status === 'em_revisao') {
          if (areaRevisao) areaRevisao.style.display = 'block';
          if (ftrRevisao) ftrRevisao.style.display = 'flex';
          if (ftrFechar) ftrFechar.style.display = 'none';
      } else {
          if (areaRevisao) areaRevisao.style.display = 'none';
          if (ftrRevisao) ftrRevisao.style.display = 'none';
          if (ftrFechar) ftrFechar.style.display = 'flex';
      }

      document.getElementById('modalDetalhesTarefa').classList.remove('hidden');
  });
};
window.fecharDetalhesTarefa = function() {
  document.getElementById('modalDetalhesTarefa').classList.add('hidden');
};

window.apagarTarefaDelegada = function(idTarefa) {
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
              showToast('Tarefa apagada do sistema!');
              loadTarefasEnviadas();
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

document.addEventListener('change', function(e) {
    if(e.target && e.target.id === 'adminFeedbackArquivos') {
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

window.reprovarTarefaRevisao = function() {
    const idTarefa = document.getElementById('detalhesTarefaId').value;
    const feedback = document.getElementById('adminFeedbackRevisao').value.trim();
    const btn = document.getElementById('btnReprovarTarefa');
    
    if(!feedback) return showToast('Por favor, escreva o motivo da devolução no campo de Feedback.', 'error');

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
            
            fecharDetalhesTarefa();
            loadTarefasEnviadas();
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

window.abrirEditarTarefa = function(id) {
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

window.fecharEditarTarefa = function() {
  document.getElementById('modalEditarTarefaDelegada').classList.add('hidden');
};

// ==========================================
// JANELA UNIFICADA: CRIAR NOVA TAREFA (Modal)
// ==========================================
window.abrirNovaTarefa = function() {
  const modal = document.getElementById('modalNovaTarefa');
  if (!modal) return;
  const catEl = document.getElementById('delegarCategoria');
  if (catEl && catEl.options.length <= 1 && typeof buildCategorySelectOptions === 'function') {
      const c = companies.find(x => x.id === currentUser.companyId);
      catEl.innerHTML = buildCategorySelectOptions(c ? c.categories : defaultCategories);
  }
  modal.classList.remove('hidden');
};
window.fecharNovaTarefa = function() {
  const modal = document.getElementById('modalNovaTarefa');
  if (modal) modal.classList.add('hidden');
};

window.salvarEdicaoTarefa = function() {
  const id = document.getElementById('editDelegarId').value;
  const titulo = document.getElementById('editDelegarTitulo').value;
  const desc = document.getElementById('editDelegarDescricao').value;
  const cat = document.getElementById('editDelegarCategoria').value;

  db.collection('tarefas').doc(id.toString()).update({
      title: titulo,
      description: desc,
      category: cat
  }).then(() => {
      showToast('Tarefa corrigida com sucesso!');
      fecharEditarTarefa();
      loadTarefasEnviadas();
  });
};

// ==========================================
// CONTROLE DAS ABAS E EXCLUSÃO (ADMIN DELEGAR)
// ==========================================
window.openDelegarTab = function(tabId, btn) {
  document.querySelectorAll('.delegar-tab-content').forEach(tab => {
      tab.style.display = 'none';
  });
  
  document.querySelectorAll('.nav-delegar-tab').forEach(b => {
      b.classList.remove('active');
  });

  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');

  if(tabId === 'tabTarefasEnviadas') {
      loadTarefasEnviadas();
  }
};

// ==========================================
// SISTEMA DE HISTÓRICO DE ACESSOS (LOGINS)
// ==========================================
window.abrirModalAcessos = function(userId) {
  const u = users.find(x => x.id === userId);
  if (!u) return;
  
  document.getElementById('nomeUsuarioAcesso').textContent = u.name;
  document.getElementById('userIdAcessoAtual').value = userId;
  
  const hojeLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  document.getElementById('filtroDataAcessos').value = hojeLocal;
  
  document.getElementById('modalAcessos').classList.remove('hidden');
  carregarAcessos(userId, hojeLocal);
};

window.filtrarAcessosPorData = function() {
  const userId = document.getElementById('userIdAcessoAtual').value;
  const data = document.getElementById('filtroDataAcessos').value;
  if(userId) carregarAcessos(parseInt(userId), data);
};

window.unsubscribeAcessos = null;

window.carregarAcessos = function(userId, dataFiltro) {
    const container = document.getElementById('listaAcessosUsuario');
    container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando histórico ao vivo...</div>';
    
    if (window.unsubscribeAcessos) window.unsubscribeAcessos();

    window.unsubscribeAcessos = db.collection('acessos')
      .where('userId', '==', userId)
      .onSnapshot(snap => {
          let lista = [];
          snap.forEach(doc => lista.push(doc.data()));
          
          if(dataFiltro) {
              lista = lista.filter(item => item.timestamp && item.timestamp.startsWith(dataFiltro));
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

window.fecharModalAcessos = function() {
    document.getElementById('modalAcessos').classList.add('hidden');
    if (window.unsubscribeAcessos) {
        window.unsubscribeAcessos();
        window.unsubscribeAcessos = null;
    }
};

// =======================================================
// LOJA DE RECOMPENSAS (VISÃO DO GESTOR)
// =======================================================

window.openStoreTab = function(tabId, btn) {
  document.querySelectorAll('.store-section').forEach(el => el.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
  
  document.querySelectorAll('.internal-tabs-nav .tab-btn').forEach(el => el.classList.remove('active'));
  if(btn) btn.classList.add('active');
  
  if (tabId === 'tabCatalogo') loadAdminRewards();
  if (tabId === 'tabResgates') loadAdminRedemptions();
};

// ── Helpers for the new prize-creator form ──────────────────────────────────

window.updateLivePreview = function () {
    const titleEl = document.getElementById('livePreviewTitle');
    const inputName = document.getElementById('rewardName');
    if (titleEl && inputName) {
        titleEl.textContent = inputName.value.trim() || 'Nome do Prêmio';
    }

    const selectEl = document.getElementById('livePreviewSelect');
    if (selectEl) {
        let taxaCambio = 10;
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.companyId && typeof companies !== 'undefined') {
            const c = companies.find(x => String(x.id) === String(currentUser.companyId));
            if (c && c.giftCardConfig && c.giftCardConfig.rate) {
                taxaCambio = c.giftCardConfig.rate;
            }
        }
        if (window._rewardValues && window._rewardValues.length > 0) {
            selectEl.innerHTML = '<option value="" disabled selected>Escolha o valor...</option>' +
                window._rewardValues.map(v => {
                    const custo = Math.round(v * taxaCambio);
                    return `<option value="${v}">R$ ${v} (${custo} GoCoins)</option>`;
                }).join('');
        } else {
            selectEl.innerHTML = '<option value="">Escolha o valor...</option>';
        }
    }
};

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

        // Sync live preview
        const liveImg = document.getElementById('livePreviewImg');
        const liveIcon = document.getElementById('livePreviewDefaultIcon');
        if (liveImg) { liveImg.src = e.target.result; liveImg.style.display = 'block'; }
        if (liveIcon) liveIcon.style.display = 'none';
    };
    reader.readAsDataURL(file);
};

window._rewardValues = [];

window.addRewardValue = function () {
    const input = document.getElementById('rewardValueInput');
    if (!input) return;
    const val = parseFloat(input.value);
    if (!val || val <= 0) return;
    if (window._rewardValues.includes(val)) { input.value = ''; return; }
    window._rewardValues.push(val);
    window._rewardValues.sort((a, b) => a - b);
    renderRewardChips();
    updateLivePreview();
    input.value = '';
    input.focus();
};

window.removeRewardValue = function (val) {
    window._rewardValues = window._rewardValues.filter(v => v !== val);
    renderRewardChips();
    updateLivePreview();
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

window.setupAdminStore = function() {
  loadAdminRewards();
  window._rewardValues = [];

  const form = document.getElementById('adminNewRewardForm');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);

  novoForm.addEventListener('submit', function(e) {
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
          window._rewardValues = [];
          const chips = document.getElementById('rewardValuesChips');
          if (chips) chips.innerHTML = '';
          const preview = document.getElementById('rewardImagePreview');
          if (preview) { preview.src = ''; preview.style.display = 'none'; }
          const placeholder = document.getElementById('rewardImagePlaceholder');
          if (placeholder) placeholder.style.display = 'flex';
          const hidden = document.getElementById('rewardImageBase64');
          if (hidden) hidden.value = '';
          const liveImg = document.getElementById('livePreviewImg');
          const liveIcon = document.getElementById('livePreviewDefaultIcon');
          if (liveImg) { liveImg.src = ''; liveImg.style.display = 'none'; }
          if (liveIcon) liveIcon.style.display = 'block';
          selectRewardCodigo(true);
          updateLivePreview();
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

window.loadAdminRewards = function() {
  const container = document.getElementById('adminRewardsList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar catálogo...</div>';

  db.collection('premios').where('companyId', '==', currentUser.companyId).get().then(snap => {
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
              ? `<button class="btn btn-small" style="background:#fca5a5; color:#7f1d1d; border:none;" onclick="togglePremioStatus(${p.id}, false)">Ocultar</button>`
              : `<button class="btn btn-small" style="background:#86efac; color:#14532d; border:none;" onclick="togglePremioStatus(${p.id}, true)">Mostrar na Loja</button>`;

          const valoresHtml = Array.isArray(p.valores) && p.valores.length
              ? p.valores.map(v => `<span style="padding:2px 8px; border-radius:10px; background:var(--color-primary); color:#fff; font-size:11px; font-weight:700;">R$ ${v}</span>`).join(' ')
              : (p.preco ? `<span style="padding:2px 8px; border-radius:10px; background:var(--color-primary); color:#fff; font-size:11px; font-weight:700;">${p.preco} Coins</span>` : '—');

          const imgHtml = p.imagemBase64
              ? `<img src="${p.imagemBase64}" style="width:44px; height:44px; border-radius:8px; object-fit:contain; background:var(--color-bg-tertiary,#eee); flex-shrink:0; margin-right:12px;">`
              : `<div style="width:44px; height:44px; border-radius:8px; background:var(--color-bg-tertiary,rgba(0,0,0,0.07)); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-right:12px;"><i class="fa-solid fa-gift" style="color:var(--color-primary); font-size:18px;"></i></div>`;

          const codigoBadge = p.temCodigo
              ? `<span style="font-size:10px; padding:2px 7px; border-radius:8px; background:#dbeafe; color:#1e40af; font-weight:600;">Com código</span>`
              : `<span style="font-size:10px; padding:2px 7px; border-radius:8px; background:#f3f4f6; color:#6b7280; font-weight:600;">Sem código</span>`;

          html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border:1px solid var(--color-border); border-radius:10px; background: ${p.ativo ? 'var(--color-bg-secondary)' : 'rgba(0,0,0,0.05)'}; opacity: ${p.ativo ? '1' : '0.6'}; transition: 0.2s;">
              <div style="display:flex; align-items:center; flex:1; min-width:0; gap:8px;">
                  ${imgHtml}
                  <div style="flex:1; min-width:0;">
                      <h4 style="margin:0 0 3px 0; font-size:13px; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.nome}</h4>
                      <div style="display:flex; flex-wrap:wrap; gap:3px; align-items:center;">
                          ${valoresHtml}
                          ${codigoBadge}
                      </div>
                  </div>
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0; margin-left:8px;">
                  ${btnStatus}
                  <button class="btn btn-small btn-danger" style="padding:4px 8px;" onclick="excluirPremio(${p.id})"><i class="fa-solid fa-trash" style="font-size:11px;"></i></button>
              </div>
          </div>`;
      });
      container.innerHTML = html;
  });
};

window.togglePremioStatus = function(id, status) {
  db.collection('premios').doc(id.toString()).update({ ativo: status }).then(() => loadAdminRewards());
};

window.excluirPremio = function(id) {
  if(confirm("Tem a certeza que deseja excluir este prêmio permanentemente?")) {
      db.collection('premios').doc(id.toString()).delete().then(() => {
          showToast('Prêmio excluído!');
          loadAdminRewards();
      });
  }
};

window.loadAdminRedemptions = function() {
  const container = document.getElementById('adminRedemptionList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A buscar pedidos...</div>';

  db.collection('resgates').where('companyId', '==', currentUser.companyId).where('status', '==', 'pendente').get().then(snap => {
      if (snap.empty) {
          container.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.6; background:var(--color-bg-secondary); border-radius:8px;">Nenhum pedido pendente de entrega.</div>';
          return;
      }
      
      let lista = [];
      snap.forEach(doc => lista.push(doc.data()));
      lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
      lista.forEach(r => {
          const func = users.find(u => u.id === r.userId);
          const nomeFunc = func ? func.name : 'Colaborador';
          const dataPedido = new Date(r.createdAt).toLocaleDateString('pt-BR');

          html += `
          <div style="border: 1px solid var(--color-border); background: var(--color-bg-secondary); padding: 12px 16px 12px 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; position: relative; overflow: hidden;">
              <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #f59e0b; border-radius: 10px 0 0 10px;"></div>
              <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                  <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <i class="fa-solid fa-gift" style="font-size: 16px; color: #d97706;"></i>
                  </div>
                  <div style="min-width: 0;">
                      <p style="margin: 0 0 3px 0; font-size: 14px; font-weight: 700; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.premioNome}</p>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--color-text-secondary);">
                          <span style="display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-calendar-day" style="font-size:11px;"></i> ${dataPedido}</span>
                          <span style="opacity:0.4;">•</span>
                          <span style="display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-user" style="font-size:11px;"></i> ${nomeFunc}</span>
                          <span style="opacity:0.4;">•</span>
                          <span style="color: #d97706; font-weight: 700; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2); padding: 1px 7px; border-radius: 4px; display:inline-flex; align-items:center; gap:4px;">
                              <img src="Patentes/Moedas/GoCoins.svg" alt="" style="width:13px; height:13px; object-fit:contain;"> ${r.preco} GoCoins
                          </span>
                      </div>
                  </div>
              </div>
              <div style="display: flex; gap: 8px; flex-shrink: 0;">
                  <button class="btn btn-small btn-success" onclick="aprovarResgate(${r.id}, ${r.preco})" style="display:inline-flex; align-items:center; gap:5px; font-size:12px; padding:5px 12px; border-radius:6px;"><i class="fa-solid fa-check" style="font-size:11px;"></i> Entregue</button>
                  <button class="btn btn-small btn-danger" onclick="recusarResgate(${r.id}, ${r.userId}, ${r.preco})" style="display:inline-flex; align-items:center; gap:5px; font-size:12px; padding:5px 12px; border-radius:6px;"><i class="fa-solid fa-xmark" style="font-size:11px;"></i> Cancelar</button>
              </div>
          </div>`;
      });
      html += '</div>';
      container.innerHTML = html;
  });
};

window.aprovarResgate = function(resgateId, preco) {
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
              // Buscar no cadastro de prêmios se exige código
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
                  status: 'aprovado',
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
              }).catch(err => {
                  console.error('Erro ao aprovar:', err);
                  showToast('Erro ao aprovar.', 'error');
              });
          }, '🎁 Confirmar Entrega', '<i class="fa-solid fa-check"></i> Confirmar Entrega', 'btn-success');
          return;
      }

      // Caso exija código PIN
      abrirModalPinResgateRoot(resgateId, preco, rData);
  }).catch(err => {
      console.error('Erro ao buscar resgate:', err);
      showToast('Erro ao buscar resgate.', 'error');
  });
};

function abrirModalPinResgateRoot(resgateId, preco, rData) {
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
      
      db.collection('resgates').doc(resgateId.toString()).update({ 
          status: 'aprovado', 
          dataAprovacao: new Date().toISOString(),
          codigoResgate: pinCode 
      }).then(() => {
          db.collection('empresas').doc(currentUser.companyId.toString()).get().then(docEmpresa => {
              let bank = docEmpresa.data() ? (docEmpresa.data().companyBank || 0) : 0;
              db.collection('empresas').doc(currentUser.companyId.toString()).update({ companyBank: bank - preco }).then(() => {
                  db.collection('notificacoes').add({
                      userId: rData.userId,
                      titulo: '🎁 O Seu prêmio chegou!',
                      mensagem: `O Seu Gift Card ${rData.premioNome} já está disponível!`,
                      createdAt: new Date().toISOString(),
                      acaoAlvo: 'resgates',
                      lida: false
                  });

                  showToast('Resgate aprovado e PIN enviado com sucesso!');
                  overlay.remove(); 
                  loadAdminRedemptions(); 
              });
          });
      }).catch(err => {
          showToast('Erro ao aprovar.', 'error');
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Aprovar Resgate';
          btn.disabled = false;
      });
  });
};

window.recusarResgate = function(resgateId, userId, preco) {
  if(confirm('Cancelar pedido e devolver as moedas para o colaborador?')) {
      db.collection('resgates').doc(resgateId.toString()).update({ status: 'recusado' }).then(() => {
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

window.openGamiTab = function(tabId, btnElement) {
  document.querySelectorAll('.gami-internal-section').forEach(sec => {
      sec.style.display = 'none';
  });
  
  document.getElementById(tabId).style.display = 'block';
  
  const botoes = btnElement.parentElement.querySelectorAll('.tab-btn');
  botoes.forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
};

window.updateExchangeRateHelp = function(valor) {
  const taxa = parseInt(valor) || 10; 
  const textoAjuda = document.getElementById('gamiExchangeRateHelp');
  
  if (textoAjuda) {
      const custoCalculado = taxa * 50;
      textoAjuda.innerHTML = `Se colocar <strong>${taxa}</strong>, um Gift Card de R$ 50 custará automaticamente ${custoCalculado} GoCoins para a equipe.`;
  }
};

window.setupAdminGamification = function() {
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

          const cbContainer = document.getElementById('adminGiftCardCheckboxes');
          if (cbContainer && window.apiGiftCardsCatalog) {
              let cbHtml = '';
              window.apiGiftCardsCatalog.forEach(card => {
                  const isChecked = configLoja.active.includes(card.id) ? 'checked' : '';
                  const iconColor = card.bgColor === '#000000' ? 'var(--color-text-primary)' : card.bgColor;
                  cbHtml += `
                  <label style="display: flex; align-items: center; gap: 10px; background: var(--color-bg-secondary); padding: 12px 15px; border-radius: 8px; border: 1px solid var(--color-border); cursor: pointer; user-select: none; transition: 0.2s;">
                      <input type="checkbox" class="chk-giftcard" value="${card.id}" ${isChecked} style="width: 18px; height: 18px; cursor: pointer;">
                      <i class="${card.fallbackIcon}" style="color: ${iconColor}; font-size: 22px;"></i>
                      <strong style="font-size: 14px; color: var(--color-text-primary);">${card.name}</strong>
                  </label>`;
              });
              cbContainer.innerHTML = cbHtml;
          }

          const chk = document.getElementById('chkGamificacaoMaster');
          if (chk) chk.checked = isAtiva;
          
          const area = document.getElementById('gamiSettingsArea');
          if (area) area.style.display = isAtiva ? 'block' : 'none';

          const campos = ['gamiXpBase', 'gamiXpNivel', 'gamiCoinsNivel', 'gamiPesoFacil', 'gamiPesoMedia', 'gamiPesoDificil', 'gamiPremioTop1', 'gamiPremioTop2', 'gamiPremioTop3', 'gamiPremioTop4', 'gamiPremioTop5'];
          campos.forEach(id => {
              if(document.getElementById(id)) {
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
      }
  });
};

window.alternarChaveGamificacao = function(checkboxElement) {
  const isAtiva = checkboxElement.checked;
  
  document.getElementById('gamiSettingsArea').style.display = isAtiva ? 'block' : 'none';
  if (document.getElementById('gamiToggleIcon')) document.getElementById('gamiToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-danger)';
  if (document.getElementById('gamiToggleText')) document.getElementById('gamiToggleText').innerText = isAtiva ? 'Gamificação Ativada' : 'Gamificação Desativada';

  db.collection('empresas').doc(currentUser.companyId.toString()).set({ gamificationEnabled: isAtiva }, { merge: true }).then(() => {
      const compIndex = companies.findIndex(x => x.id === currentUser.companyId);
      if (compIndex !== -1) companies[compIndex].gamificationEnabled = isAtiva;
      
      if (typeof window.aplicarVisibilidadeGamificacao === 'function') window.aplicarVisibilidadeGamificacao();
      showToast(isAtiva ? 'Módulo ATIVADO!' : 'Módulo DESATIVADO!');
  });
};

window.salvarRegrasGamificacao = function(btnElement) {
  const invalidos = (typeof window.validarCamposGamificacao === 'function') ? window.validarCamposGamificacao() : [];
  if (invalidos.length) {
      if (typeof showToast === 'function') showToast('Valores inválidos: ' + invalidos.join(', '), 'error');
      return;
  }

  const txtOriginal = btnElement.innerHTML;
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btnElement.disabled = true;

  const novasRegras = {
      xpBase: parseInt(document.getElementById('gamiXpBase').value) || 50,
      xpNivel: parseInt(document.getElementById('gamiXpNivel').value) || 500,
      coinsNivel: parseInt(document.getElementById('gamiCoinsNivel').value) || 100,
      pesoFacil: parseFloat(document.getElementById('gamiPesoFacil').value) || 2,
      pesoMedia: parseFloat(document.getElementById('gamiPesoMedia').value) || 3,
      pesoDificil: parseFloat(document.getElementById('gamiPesoDificil').value) || 4,
      premioTop1: parseInt(document.getElementById('gamiPremioTop1').value) || 500,
      premioTop2: parseInt(document.getElementById('gamiPremioTop2').value) || 400,
      premioTop3: parseInt(document.getElementById('gamiPremioTop3').value) || 300,
      premioTop4: parseInt(document.getElementById('gamiPremioTop4').value) || 200,
      premioTop5: parseInt(document.getElementById('gamiPremioTop5').value) || 100
  };

  const inputOrcamento = document.getElementById('adminMonthlyBudget');
  const novoOrcamento = inputOrcamento ? parseFloat(inputOrcamento.value) : 500;

  const activeCards = Array.from(document.querySelectorAll('.chk-giftcard:checked')).map(cb => cb.value);
  const rateInput = document.getElementById('gamiExchangeRate');
  const novaConfigLoja = {
      rate: rateInput ? parseInt(rateInput.value) || 10 : 10,
      active: activeCards
  };

  db.collection('empresas').doc(currentUser.companyId.toString()).set({ 
      gamificacao: novasRegras,
      monthlyBudget: novoOrcamento,
      giftCardConfig: novaConfigLoja
  }, { merge: true }).then(() => {
      
      const compIndex = companies.findIndex(x => x.id === currentUser.companyId);
      if (compIndex !== -1) {
          companies[compIndex].gamificacao = novasRegras;
          companies[compIndex].monthlyBudget = novoOrcamento;
          companies[compIndex].giftCardConfig = novaConfigLoja;
      }

      if (typeof window.renderGamiProgressionTable === 'function') window.renderGamiProgressionTable();

      showToast('Configurações da Loja atualizadas!');
      btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
      
      setTimeout(() => { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; }, 2000);
  }).catch(err => {
      showToast('Erro ao salvar!', 'error');
      btnElement.innerHTML = txtOriginal; btnElement.disabled = false;
  });
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

window.validarCamposGamificacao = function() {
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
      msg.innerHTML = invalidos.length ? '<i class="fa-solid fa-triangle-exclamation"></i> Corrija: ' + invalidos.join(', ') : '';
  }
  return invalidos;
};

window.renderGamiProgressionTable = function() {
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
  setChip('gamiChipFacil', String(xpFacil));
  setChip('gamiChipTarefas', String(tarefasPorNivel));
  setChip('gamiChipGift50', String(custoGift50));

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

window.restaurarPadraoGamificacao = function() {
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

const genVar = (count) => Array.from({length: count}, (_, i) => `variant${String(i+1).padStart(2, '0')}`);

const loreleiConfig = {
  f1: { prop: 'hair', values: genVar(48) },
  f2: { prop: 'eyes', values: genVar(24) },
  f3: { prop: 'mouth', values: ['happy01','happy02','happy03','happy04','happy05','happy06','happy07','happy08','happy09','happy10','happy11','happy12','happy13','happy14','happy15','sad01','sad02','sad03','sad04','sad05','sad06'] },
  f4: { prop: 'glasses', values: ['none', ...genVar(5)] }
};

window.charState = { f1: 0, f2: 0, f3: 0, f4: 0 };
window.charSessionActive = false;

window.mudarTracoStudio = function(traco, direcao) {
  const opcoes = loreleiConfig[traco].values;
  window.charState[traco] += direcao;
  const max = opcoes.length - 1;
  
  if (window.charState[traco] > max) window.charState[traco] = 0;
  if (window.charState[traco] < 0) window.charState[traco] = max;
  
  window.renderStudio();
};

window.renderStudio = function() {
  ['f1', 'f2', 'f3', 'f4'].forEach(t => {
      const lbl = document.getElementById(`lbl_${t}`);
      if (lbl) lbl.innerText = window.charState[t];
  });

  const getCor = (id, fallback) => {
      const el = document.getElementById(id);
      return el ? el.value.replace('#', '') : fallback;
  };

  let url = `https://api.dicebear.com/9.x/lorelei/svg?seed=Admin&backgroundColor=${getCor('studioBgColor', 'b6e3f4')}&skinColor=${getCor('studioSkinColor', 'ffdbb4')}&hairColor=${getCor('studioHairColor', '2a2a2a')}`;

  ['f1', 'f2', 'f3', 'f4'].forEach(f => {
      const prop = loreleiConfig[f].prop;
      let val = loreleiConfig[f].values[window.charState[f]];
      
      if (!val) val = loreleiConfig[f].values[0];

      if (val === 'none') {
          if (prop === 'glasses') url += `&glassesProbability=0`;
      } else {
          url += `&${prop}=${val}`;
          if (prop === 'glasses') url += `&glassesProbability=100`;
      }
  });

  const imgEl = document.getElementById('avatarStudioImg');
  const letraEl = document.getElementById('avatarStudioLetra');
  
  if (imgEl) { 
      imgEl.src = url; 
      imgEl.style.display = 'block'; 
      const prevContainer = document.getElementById('avatarStudioPreview');
      if (prevContainer) prevContainer.style.background = 'transparent';
  }
  if (letraEl) letraEl.style.display = 'none';
};

window.carregarPerfilEAvatar = function() {
  if (!currentUser) return;
  
  const inputNome = document.getElementById('admProfileName');
  if (inputNome) inputNome.value = currentUser.name;

  if (window.charSessionActive) {
      window.renderStudio();
      return;
  }
  
  let isNovoOuCorrompido = true;

  if (currentUser.avatarUrl && currentUser.avatarUrl.includes('lorelei')) {
      try {
          const urlObj = new URL(currentUser.avatarUrl);
          
          const pegaIndex = (param, slotName) => {
              const val = urlObj.searchParams.get(param);
              if (!val) return 0;
              const idx = loreleiConfig[slotName].values.indexOf(val);
              return idx !== -1 ? idx : 0;
          };

          window.charState.f1 = pegaIndex('hair', 'f1');
          window.charState.f2 = pegaIndex('eyes', 'f2');
          window.charState.f3 = pegaIndex('mouth', 'f3');
          const hasGlasses = urlObj.searchParams.get(`glassesProbability`) !== '0';
          window.charState.f4 = hasGlasses ? pegaIndex('glasses', 'f4') : 0;

          const pegaCor = (param, id) => {
              let val = urlObj.searchParams.get(param);
              const corEl = document.getElementById(id);
              if (val && corEl) {
                  val = val.replace('#', ''); 
                  corEl.value = '#' + val;
              }
          };
          pegaCor('backgroundColor', 'studioBgColor');
          pegaCor('skinColor', 'studioSkinColor');
          pegaCor('hairColor', 'studioHairColor');
          
          isNovoOuCorrompido = false;
      } catch(e) { console.warn("Avatar antigo não compatível, limpando..."); }
  }
  
  if (isNovoOuCorrompido) {
      window.charState = { f1: 0, f2: 0, f3: 0, f4: 0 };
      if(document.getElementById('studioBgColor')) document.getElementById('studioBgColor').value = '#b6e3f4';
      if(document.getElementById('studioSkinColor')) document.getElementById('studioSkinColor').value = '#ffdbb4';
      if(document.getElementById('studioHairColor')) document.getElementById('studioHairColor').value = '#2a2a2a';
  }

  window.renderStudio(); 
  window.charSessionActive = true; 
};

window.salvarPerfilStudio = async function(btnElement) {
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

      showToast('Perfil e Avatar guardados com sucesso!');
      if (document.getElementById('admProfilePassword')) document.getElementById('admProfilePassword').value = '';
      btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
      setTimeout(() => { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; }, 2000);
  }).catch(err => {
      showToast('Erro ao guardar no sistema.', 'error');
      btnElement.innerHTML = txtOriginal; btnElement.disabled = false;
  });
};