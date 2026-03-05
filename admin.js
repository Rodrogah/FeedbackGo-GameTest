// ============ LÓGICA DO PAINEL DE ADMINISTRAÇÃO ============
function initAdminPanel() {
  const c = companies.find((x) => x.id === currentUser.companyId);
  if (!c) return;
  document.getElementById('admCompanySidebar').textContent = c.name;
  document.getElementById('sidebarAdminName').textContent =
    currentUser.name.split(' ')[0];
  document.getElementById('adminAvatar').textContent = currentUser.name
    .charAt(0)
    .toUpperCase();
  updateCurrentDate('adminCurrentDate');

  showAdminSection('dashboard');

  setTimeout(runAutoCleanup, 5000);
}

async function showAdminSection(sec) {
  const palco = document.getElementById('adminConteudoDinamico');
  if (!palco) return;

  document.querySelectorAll('#adminPanel .nav-item').forEach((i) => i.classList.remove('active'));
  const activeNav = document.querySelector(`#adminPanel .nav-item[onclick*="${sec}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Verifica se a gamificação está ativa
  const c = companies.find((x) => x.id === currentUser.companyId);
  const isGamiAtiva = c && c.gamificationEnabled === true;
  
  // Esconde ou mostra o menu da loja
  const menuLojaAdmin = document.querySelector('#adminPanel .nav-item[onclick*="store"]');
  if (menuLojaAdmin) menuLojaAdmin.style.display = isGamiAtiva ? 'flex' : 'none';
  
  // Esconde o ranking do dashboard do admin se desativado
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

    const resposta = await fetch(`./telas/${rotas[sec]}`);
    if (!resposta.ok) throw new Error('Ficheiro não encontrado.');
    palco.innerHTML = await resposta.text();
    palco.classList.remove('fade-entrar');
    void palco.offsetWidth;
    palco.classList.add('fade-entrar');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const c = companies.find((x) => x.id === currentUser.companyId);

    if (sec === 'dashboard') {
      const dashTeam = document.getElementById('dashFilterTeam');
      if (dashTeam) dashTeam.innerHTML = '<option value="">Todas as Equipes</option>' + (c.teams || []).map((t) => `<option value="${t}">${t}</option>`).join('');
      refreshAdminDashboard();
    } else if (sec === 'new-task') {
      if (typeof setTodayDate === 'function') setTodayDate('adminTaskDate');
      const catEl = document.getElementById('adminTaskCategory');
      if (catEl) catEl.innerHTML = buildCategorySelectOptions(c.categories || defaultCategories); // <--- AQUI CHAMA O AGRUPAMENTO
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
      if (teamFilter)
        teamFilter.innerHTML =
          '<option value="">Todas as Equipes</option>' +
          (c.teams || [])
            .map((t) => `<option value="${t}">${t}</option>`)
            .join('');
      const userFilter = document.getElementById('reportFilterUser');
      if (userFilter)
        userFilter.innerHTML =
          '<option value="">Todos os Colaboradores</option>' +
          users
            .filter((u) => u.companyId === c.id)
            .map((u) => `<option value="${u.id}">${u.name}</option>`)
            .join('');
            
      // NOVO: Carrega as categorias no Select de Relatórios!
      const catFilter = document.getElementById('reportFilterCategory');
      if (catFilter) {
          catFilter.innerHTML = '<option value="">Todas as Categorias</option>' + 
          (typeof buildCategorySelectOptions === 'function' ? buildCategorySelectOptions(c.categories || defaultCategories) : '');
      }

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
      
    } else if (sec === 'delegar') {
      const catEl = document.getElementById('delegarCategoria');
      if (catEl) catEl.innerHTML = buildCategorySelectOptions(c.categories || defaultCategories); // <--- AQUI TAMBÉM
      setupAdminDelegarForm();
      loadTarefasEnviadas();
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

function getDashFilteredActivities() {
  const team = document.getElementById('dashFilterTeam')
    ? document.getElementById('dashFilterTeam').value
    : '';
  let acts = activities.filter((a) => a.companyId === currentUser.companyId);
  if (team) {
    const teamUsers = users.filter((u) => u.team === team).map((u) => u.id);
    acts = acts.filter((a) => teamUsers.includes(a.userId));
  }
  return acts;
}

function updateAdminStats() {
  try {
    const acts = getDashFilteredActivities();
    const team = document.getElementById('dashFilterTeam')
      ? document.getElementById('dashFilterTeam').value
      : '';
    let filteredUsers = users.filter(
      (u) => u.companyId === currentUser.companyId && u.active
    );
    if (team) filteredUsers = filteredUsers.filter((u) => u.team === team);

    const elUsers = document.getElementById('dashActiveUsers');
    if (elUsers) elUsers.textContent = filteredUsers.length;
    const elTotal = document.getElementById('dashTotalActivities');
    if (elTotal) elTotal.textContent = acts.length;
    const elConc = document.getElementById('dashCompletedActivities');
    if (elConc)
      elConc.textContent = acts.filter((a) => a.status === 'concluido').length;
    const elPend = document.getElementById('dashPendingActivities');
    if (elPend)
      elPend.textContent = acts.filter((a) => a.status === 'pendente').length;
  } catch (err) {
    console.error('Erro nas stats:', err);
  }
}

function loadAdminRecentActivities() {
  const el = document.getElementById('adminRecentActivities');
  if (!el) return;
  const lista = getDashFilteredActivities()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
  el.innerHTML = generateActivityTableHTML(lista, true);
}

let adminStatusChartInstance = null;
let adminCategoryChartInstance = null;
let adminTimelineChartInstance = null;

window.renderAdminCharts = function () {
  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const acts = getDashFilteredActivities();

  const ctxStatus = document.getElementById('adminStatusChart');
  if (ctxStatus) {
    let conc = 0,
      and = 0,
      pend = 0;
    acts.forEach((a) => {
      if (a.status === 'concluido') conc++;
      else if (a.status === 'andamento') and++;
      else if (a.status === 'pendente') pend++;
    });
    const bgStatus = isDark
      ? [
          'rgba(74, 222, 128, 0.85)',
          'rgba(253, 224, 71, 0.85)',
          'rgba(248, 113, 113, 0.85)',
        ]
      : ['#22c55e', '#eab308', '#ef4444'];
    const borderStatus = isDark
      ? ['#22c55e', '#eab308', '#ef4444']
      : ['#ffffff', '#ffffff', '#ffffff'];

    if (adminStatusChartInstance) adminStatusChartInstance.destroy();
    adminStatusChartInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Concluído', 'Em Andamento', 'Pendente'],
        datasets: [
          {
            data: [conc, and, pend],
            backgroundColor: bgStatus,
            borderWidth: 2,
            borderColor: borderStatus,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor } },
        },
      },
    });
  }

  const ctxCategory = document.getElementById('adminCategoryChart');
  if (ctxCategory) {
    const catCounts = {};
    acts.forEach((a) => {
      const c = a.category || 'Geral';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });
    const labels = Object.keys(catCounts);
    const data = Object.values(catCounts);
    const bgColors = labels.map((cat) => {
      const hue =
        typeof getCategoryHue === 'function' ? getCategoryHue(cat) : 200;
      return isDark
        ? `hsla(${hue}, 80%, 60%, 0.75)`
        : `hsla(${hue}, 85%, 45%, 0.75)`;
    });
    const borderColors = labels.map((cat) => {
      const hue =
        typeof getCategoryHue === 'function' ? getCategoryHue(cat) : 200;
      return isDark ? `hsl(${hue}, 80%, 60%)` : `hsl(${hue}, 85%, 45%)`;
    });

    if (adminCategoryChartInstance) adminCategoryChartInstance.destroy();
    adminCategoryChartInstance = new Chart(ctxCategory, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Atividades',
            data: data,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: gridColor },
          },
          x: { ticks: { color: textColor }, grid: { display: false } },
        },
      },
    });
  }

  const ctxTimeline = document.getElementById('adminTimelineChart');
  if (ctxTimeline) {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }
    const dataTimeline = last7Days.map(
      (date) => acts.filter((a) => a.date === date).length
    );
    const labelsTimeline = last7Days.map((date) => {
      const p = date.split('-');
      return `${p[2]}/${p[1]}`;
    });

    if (adminTimelineChartInstance) adminTimelineChartInstance.destroy();
    adminTimelineChartInstance = new Chart(ctxTimeline, {
      type: 'line',
      data: {
        labels: labelsTimeline,
        datasets: [
          {
            label: 'Registros',
            data: dataTimeline,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#3b82f6',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: textColor },
            grid: { color: gridColor },
          },
          x: { ticks: { color: textColor }, grid: { display: false } },
        },
      },
    });
  }
};

// ============ SISTEMA DE PAGINAÇÃO (ADMINISTRADOR) ============
let currentAdminPage = 1;
let currentAdminFilteredActs = [];

function loadAllActivities() {
  currentAdminPage = 1; // Reseta para a página 1 ao abrir o ecrã
  applyAdminFilters(1); 
}

function populateAdminFilters(c) {
  const tEl = document.getElementById('admFilterTeam');
  const uEl = document.getElementById('adminFilterUser');
  const cEl = document.getElementById('admFilterCategory'); // NOVO
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
  const cat = document.getElementById('admFilterCategory') ? document.getElementById('admFilterCategory').value : ''; // NOVO
  const search = document.getElementById('admFilterSearch') ? document.getElementById('admFilterSearch').value.toLowerCase().trim() : ''; // NOVO
  
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
  
  // CAPTURA AS NOVAS CAIXAS
  const cat = document.getElementById('reportFilterCategory') ? document.getElementById('reportFilterCategory').value : ''; 
  const search = document.getElementById('reportFilterSearch') ? document.getElementById('reportFilterSearch').value.toLowerCase().trim() : ''; 
  
  let f = activities.filter((a) => a.companyId === currentUser.companyId);
  
  // APLICA OS FILTROS
  if (s) f = f.filter((a) => a.date >= s);
  if (e) f = f.filter((a) => a.date <= e);
  if (cat) f = f.filter((a) => a.category === cat); // FILTRA CATEGORIA AQUI!
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
  
  // Sempre Mais Novo -> Mais Antigo na Tela
  return f.sort((a, b) => {
    const dataA = a.date || '';
    const dataB = b.date || '';

    // Desempate por hora se forem do mesmo dia
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

  const itemsPerPage = 20; // 20 Itens por página
  const totalPages = Math.ceil(currentAdminFilteredActs.length / itemsPerPage) || 1;
  
  if (currentAdminPage > totalPages) currentAdminPage = totalPages;
  if (currentAdminPage < 1) currentAdminPage = 1;

  // Fatiar a lista para pegar apenas os 20 da página atual
  const start = (currentAdminPage - 1) * itemsPerPage;
  const actsPage = currentAdminFilteredActs.slice(start, start + itemsPerPage);

  // Gerar a tabela com a "fatia"
  let html = generateActivityTableHTML(actsPage, true);

  // Adicionar controlos de paginação no final da tabela
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

window.unsubscribeUsersTable = null; // Guarda o radar para não duplicar

window.loadUsersTable = function() {
  const el = document.getElementById('usersTable');
  if (!el) return;

  // Desliga o radar anterior (se houver) para evitar lentidão
  if (window.unsubscribeUsersTable) window.unsubscribeUsersTable();

  el.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando colaboradores...</div>';

  // 🚀 O RADAR: Fica escutando o banco de dados AO VIVO
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
              
              // STATUS ONLINE EM TEMPO REAL
              const statusDot = u.isOnline 
                  ? `<span title="Online agora" style="display:inline-block; width:12px; height:12px; background-color:#10b981; border-radius:50%; box-shadow: 0 0 6px #10b981;"></span>` 
                  : `<span title="Offline" style="display:inline-block; width:12px; height:12px; background-color:#64748b; border-radius:50%;"></span>`;

              return `<tr>
              <td style="text-align:center;">${statusDot}</td>
              <td><strong>${u.name}</strong> ${u.role === 'admin' ? '<span class="badge" style="background:#EDE9FE;color:#7C3AED;">Admin</span>' : ''}</td>
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
      let g = "Outros"; // Rede de segurança para categorias sem grupo
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
    };

    const salvarNoBanco = (atividadeFinal) => {
      atividadeFinal.id = nextActivityId;
      db.collection('atividades').doc(atividadeFinal.id.toString()).set(atividadeFinal).then(() => {
          
          // 🚀 ESPIÃO: REGISTRA A ATIVIDADE CRIADA PELO ADMIN
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
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const em = document.getElementById('newUserEmail').value.trim();
    if (users.find((u) => u.email === em))
      return showToast('E-mail já em uso.', 'error');

    let nId = nextUserId;
    const nUser = {
      id: nId,
      companyId: currentUser.companyId,
      name: document.getElementById('newUserName').value.trim(),
      email: em,
      password: document.getElementById('newUserPassword').value,
      role: document.getElementById('newUserRole')
        ? document.getElementById('newUserRole').value
        : 'funcionario',
      active: true,
      team: document.getElementById('newUserTeam').value,
    };
    db.collection('usuarios')
      .doc(nId.toString())
      .set(nUser)
      .then(() => {
        form.reset();
        if (typeof sendWelcomeEmail === 'function')
          sendWelcomeEmail(nUser.name, nUser.email, nUser.password);
        showToast('Colaborador criado!');
      });
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
  // 1. Aponta para o NOVO ID do formulário de categorias
  const catForm = document.getElementById('formNovaCategoria'); 
  if (catForm) {
    catForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const grupo = document.getElementById('newCategoryGroup').value.trim();
      const sub = document.getElementById('newCategoryName').value.trim();
      
      // Cria o texto agrupado "Grupo :: Sub"
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
            // Não apaga o grupo para facilitar o cadastro em lote
            loadCategories(c);
            showToast('Subcategoria adicionada!');
          });
      } else {
          showToast('Esta subcategoria já existe neste grupo!', 'error');
      }
    });
  }

  // 2. Formulário de Perfil do Administrador (Mantido igual)
  const profForm = document.getElementById('admProfileForm');
  if (profForm) {
    profForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const newName = document.getElementById('admProfileName').value.trim();
      const newPass = document.getElementById('admProfilePassword').value;
      const btn = profForm.querySelector('button');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

      let updates = {};
      if (newName) updates.name = newName;
      if (newPass) updates.password = newPass;

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

// ============ NAVEGAÇÃO DE CONFIGURAÇÕES COM ROLAGEM AUTOMÁTICA ============
window.openSettingsTab = function (tabId, btnElement) {
  document.querySelectorAll('.settings-tab-content').forEach((tab) => {
      tab.style.display = 'none';
  });

  const navContainer = btnElement.closest('.settings-nav-list');
  if (navContainer) {
      navContainer.querySelectorAll('.nav-list-item').forEach((btn) => btn.classList.remove('active'));
  }

  const activeTab = document.getElementById(tabId);
  activeTab.style.display = 'block';
  btnElement.classList.add('active');

  // 🚀 FORÇA A ROLAGEM PARA O TOPO SEMPRE QUE ABRIR UMA ABA
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (window.innerWidth <= 768) {
      navContainer.classList.add('mobile-hidden');
      const contentArea = activeTab.closest('.settings-content-area');
      contentArea.classList.add('mobile-active');

      if (!activeTab.querySelector('.btn-mobile-back')) {
          const backBtn = document.createElement('button');
          backBtn.className = 'btn-mobile-back';
          backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Voltar';
          
          backBtn.onclick = function() {
              contentArea.classList.remove('mobile-active');
              navContainer.classList.remove('mobile-hidden');
              activeTab.style.display = 'none';
              btnElement.classList.remove('active');
              // 🚀 FORÇA A ROLAGEM PARA O TOPO AO VOLTAR PARA O MENU
              window.scrollTo({ top: 0, behavior: 'smooth' });
          };
          
          activeTab.insertBefore(backBtn, activeTab.firstChild);
      }
  }
};

window.generateReport = function () {
  document.getElementById('periodReport').innerHTML = generateActivityTableHTML(
    getFilteredReportData(),
    true
  );
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
  const container = document.getElementById('listaCheckFuncionarios');
  if (!container) return;

  const funcDaEmpresa = users.filter(u => u.companyId === currentUser.companyId && u.active && u.id !== currentUser.id);

  if (funcDaEmpresa.length === 0) {
      container.innerHTML = '<p style="opacity: 0.6; text-align: center; padding: 10px;">Nenhum colaborador encontrado.</p>';
  } else {
      container.innerHTML = funcDaEmpresa.map(u => `
          <div style="margin-bottom: 8px;">
              <input type="checkbox" name="funcDelegado" value="${u.id}" id="checkFunc_${u.id}" class="input-hidden" style="display: none;">
              <label for="checkFunc_${u.id}" class="green-dot-item">
                  <div style="display: flex; align-items: center; gap: 12px;">
                      <div class="dot"></div>
                      <span style="font-size: 14px;"><strong>${u.name}</strong> <small style="opacity:0.7">(${u.team || 'Sem Equipe'})</small></span>
                  </div>
              </label>
          </div>
      `).join('');
  }

  const form = document.getElementById('formDelegarTarefa');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);

  // 🎮 INJETA O CAMPO DE DIFICULDADE (GAMIFICAÇÃO)
  const areaArquivos = novoForm.querySelector('.file-drop-area');
  if (areaArquivos && !document.getElementById('boxDificuldadeGamificacao')) {
      const c = companies.find(x => x.id === currentUser.companyId);
      const isGamiAtiva = c && c.gamificationEnabled === true;

      const formGroupArquivos = areaArquivos.parentNode;
      const divDif = document.createElement('div');
      divDif.className = 'form-group';
      divDif.id = 'boxDificuldadeGamificacao'; // ID adicionado para controle
      divDif.style.marginTop = "15px";
      divDif.style.display = isGamiAtiva ? 'block' : 'none'; // Esconde se estiver desativado!
      
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
      
      // Captura o peso, mas se não achar usa 3 por padrão
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
          });

          Promise.all(promessasFirebase).then(() => {
              if (window.registrarAcao) window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'DELEGAR_TAREFA', `Delegou a tarefa: ${titulo}`);
              showToast('Tarefas enviadas com sucesso!');
              novoForm.reset();
              fileListDisplay.innerHTML = ''; 
              arquivosSelecionados = []; 
              btn.innerHTML = originalText;
              btn.disabled = false;
              loadTarefasEnviadas(); 
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

          // Se estiver desativada, ganha 0 pontos. Se não, faz a conta.
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

          // Se estiver desativada, simplesmente não mexe na conta do usuário (Resolve Promise vazia)
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
              showToast(msg);
              fecharDetalhesTarefa();
              loadTarefasEnviadas();
          });
      });
  });
};

// 4. Carregar a Tabela de Acompanhamento (Painel do Admin)
function loadTarefasEnviadas() {
  const container = document.getElementById('tabelaTarefasEnviadas');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando tarefas...</div>';

  db.collection('tarefas')
    .where('senderId', '==', currentUser.id)
    .get()
    .then((querySnapshot) => {
        if (querySnapshot.empty) {
            container.innerHTML = '<div style="text-align:center; padding: 20px; background: var(--color-bg-primary); border-radius: 8px;">Você ainda não enviou nenhuma tarefa.</div>';
            return;
        }

        let lista = [];
        querySnapshot.forEach(doc => lista.push(doc.data()));
        
        lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        let html = `<div class="table-container"><table>
            <thead><tr><th>Data</th><th>Para Quem</th><th>Categoria</th><th>Tarefa</th><th>Status</th><th>Ações</th></tr></thead><tbody>`;
        
        lista.forEach(t => {
            const func = users.find(u => u.id === t.userId);
            const nomeFunc = func ? func.name : 'Colaborador Removido';
            const dataFormatada = new Date(t.createdAt).toLocaleDateString('pt-BR');
            
            const badgeClass = t.status === 'concluido' ? 'badge-concluido' : 'badge-pendente';
            const badgeText = t.status === 'concluido' ? 'Entregue' : 'Pendente';
            
            // Gera a cor visual da categoria
            const categoriaBadge = `<span class="badge cat-badge-dynamic" style="${getCategoryStyleString(t.category || 'Geral')}">${t.category || 'Geral'}</span>`;

            html += `<tr>
                <td>${dataFormatada}</td>
                <td><strong>${nomeFunc}</strong></td>
                <td>${categoriaBadge}</td>
                <td>${t.title}</td>
                <td><span class="badge ${badgeClass}" style="${t.status === 'concluido' ? 'background:#dcfce7; color:#166534;' : 'background:#fef9c3; color:#854d0e;'}">${badgeText}</span></td>
                <td>
                    ${t.status === 'concluido' ? `<button onclick="abrirDetalhesTarefa('${t.id}')" class="btn-icon-only edit" title="Ver Entrega" style="color: var(--color-info);"><i class="fa-solid fa-eye"></i></button>` : ''}
                    <button onclick="apagarTarefaDelegada('${t.id}')" class="btn-icon-only delete" title="Apagar Tarefa"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    })
    .catch((err) => {
        console.error("Erro no acompanhamento:", err);
        container.innerHTML = '<p style="color: var(--color-danger); text-align:center;">Erro ao carregar o acompanhamento de tarefas.</p>';
    });
}

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
          
          let badgeClass = 'badge-pendente'; let badgeText = 'Pendente'; let corBg = '#fef9c3'; let corTxt = '#854d0e';
          if (t.status === 'em_revisao') { badgeClass = 'badge-andamento'; badgeText = 'Em Revisão'; corBg = '#dbeafe'; corTxt = '#1e40af'; }
          if (t.status === 'concluido') { badgeClass = 'badge-concluido'; badgeText = 'Aprovada'; corBg = '#dcfce7'; corTxt = '#166534'; }
          
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

window.fecharDetalhesTarefa = function() {
  document.getElementById('modalDetalhesTarefa').classList.add('hidden');
};

window.apagarTarefaDelegada = function(idTarefa) {
  showConfirm(
      'Tem a certeza que deseja apagar esta tarefa? Se ela já estiver concluída, também será apagada do Histórico de Relatórios.',
      () => {
          // 1. Apaga a tarefa da aba "Delegar Tarefas"
          const p1 = db.collection('tarefas').doc(idTarefa.toString()).delete();
          
          // 2. Procura a atividade "casada" no Histórico e apaga-a também (se existir)
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

// Escutador para quando o Admin seleciona ficheiros na revisão
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

// A função que devolve a tarefa com anexos
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
            feedbackAttachments: anexosFeedback // Salva os novos anexos aqui!
        }).then(() => {
            showToast('Tarefa devolvida com sucesso!', 'error');
            // Limpa o formulário
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

    // Lê os arquivos (se houver) e converte para enviar
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
      
      // Carrega as categorias na hora de editar
      const c = companies.find((x) => x.id === currentUser.companyId);
      const catEl = document.getElementById('editDelegarCategoria');
      if (catEl && c) {
          catEl.innerHTML = (c.categories || defaultCategories).map((cat) => `<option value="${cat}">${cat}</option>`).join('');
          catEl.value = t.category || 'Geral'; // Seleciona a categoria atual da tarefa
      }

      document.getElementById('modalEditarTarefaDelegada').classList.remove('hidden');
  });
};

window.fecharEditarTarefa = function() {
  document.getElementById('modalEditarTarefaDelegada').classList.add('hidden');
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
  // 1. Esconde todos os conteúdos das abas
  document.querySelectorAll('.delegar-tab-content').forEach(tab => {
      tab.style.display = 'none';
  });
  
  // 2. Tira o visual de "selecionado" de todos os botões
  document.querySelectorAll('.nav-delegar-tab').forEach(b => {
      b.style.background = 'transparent';
      b.style.color = 'var(--color-text-secondary)';
      b.style.border = '1px solid var(--color-border)';
      b.classList.remove('active');
  });

  // 3. Mostra o conteúdo da aba correta
  document.getElementById(tabId).style.display = 'block';

  // 4. Pinta o botão clicado com a cor principal
  btn.style.background = 'var(--color-primary)';
  btn.style.color = 'white';
  btn.style.border = '1px solid var(--color-primary)';
  btn.classList.add('active');

  // 5. Se for a aba de enviadas, atualiza a tabela na hora
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
  
  // Define a data de HOJE considerando o fuso horário local
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
    
    // Desliga o radar anterior para não misturar dados
    if (window.unsubscribeAcessos) window.unsubscribeAcessos();

    // 🚀 O RADAR: Escuta as ações em TEMPO REAL
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
    // Desliga o radar ao fechar a janela para economizar internet/banco
    if (window.unsubscribeAcessos) {
        window.unsubscribeAcessos();
        window.unsubscribeAcessos = null;
    }
};

window.fecharModalAcessos = function() {
  document.getElementById('modalAcessos').classList.add('hidden');
};

window.fecharModalAcessos = function() {
  document.getElementById('modalAcessos').classList.add('hidden');
};

// =======================================================
// LOJA DE RECOMPENSAS (VISÃO DO GESTOR)
// =======================================================

// 1. Controle das Abas Internas (Catálogo / Pedidos)
window.openStoreTab = function(tabId, btn) {
  document.querySelectorAll('.store-section').forEach(el => el.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
  
  document.querySelectorAll('.internal-tabs-nav .tab-btn').forEach(el => el.classList.remove('active'));
  if(btn) btn.classList.add('active');
  
  if (tabId === 'tabCatalogo') loadAdminRewards();
  if (tabId === 'tabResgates') loadAdminRedemptions();
};

// 2. Inicializador da Loja e Cadastro de Prémios
window.setupAdminStore = function() {
  loadAdminRewards(); // Carrega a lista ao abrir o ecrã

  const form = document.getElementById('adminNewRewardForm');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);

  novoForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = novoForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Guardar...';
      btn.disabled = true;

      const premio = {
          id: Date.now(),
          companyId: currentUser.companyId,
          nome: document.getElementById('rewardName').value.trim(),
          preco: parseInt(document.getElementById('rewardPrice').value),
          descricao: document.getElementById('rewardDesc').value.trim(),
          ativo: true,
          createdAt: new Date().toISOString()
      };

      db.collection('premios').doc(premio.id.toString()).set(premio).then(() => {
          showToast('Prémio adicionado ao catálogo!');
          novoForm.reset();
          loadAdminRewards();
          btn.innerHTML = originalText;
          btn.disabled = false;
      }).catch(err => {
          showToast('Erro ao guardar prémio', 'error');
          btn.innerHTML = originalText;
          btn.disabled = false;
      });
  });
};

// 3. Renderizar o Catálogo de Prémios
window.loadAdminRewards = function() {
  const container = document.getElementById('adminRewardsList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar catálogo...</div>';

  db.collection('premios').where('companyId', '==', currentUser.companyId).get().then(snap => {
      if (snap.empty) {
          container.innerHTML = '<div style="padding:15px; text-align:center; opacity:0.6;">Nenhum prémio cadastrado no seu cofre.</div>';
          return;
      }
      
      // Ordena para que os mais baratos apareçam primeiro
      let premios = [];
      snap.forEach(doc => premios.push(doc.data()));
      premios.sort((a, b) => a.preco - b.preco);

      let html = '';
      premios.forEach(p => {
          const btnStatus = p.ativo 
              ? `<button class="btn btn-small" style="background:#fca5a5; color:#7f1d1d; border:none;" onclick="togglePremioStatus(${p.id}, false)">Ocultar</button>`
              : `<button class="btn btn-small" style="background:#86efac; color:#14532d; border:none;" onclick="togglePremioStatus(${p.id}, true)">Mostrar na Loja</button>`;
          
          html += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border:1px solid var(--color-border); border-radius:8px; background: ${p.ativo ? 'var(--color-bg-secondary)' : 'rgba(0,0,0,0.05)'}; opacity: ${p.ativo ? '1' : '0.6'}; transition: 0.2s;">
              <div style="flex: 1;">
                  <h4 style="margin:0 0 5px 0; color: var(--color-text-primary);"><i class="fa-solid fa-gift" style="color: var(--color-primary); margin-right: 5px;"></i> ${p.nome}</h4>
                  <p style="margin:0; font-size:12px; color:var(--color-text-secondary);">${p.descricao || 'Sem descrição detalhada.'}</p>
                  <span style="display:inline-block; margin-top:8px; font-weight:800; color:#b45309; background:#fef3c7; padding:4px 10px; border-radius:12px; font-size:12px;"><i class="fa-solid fa-coins"></i> ${p.preco} Coins</span>
              </div>
              <div style="display: flex; gap: 8px;">
                  ${btnStatus}
                  <button class="btn btn-small btn-danger" onclick="excluirPremio(${p.id})"><i class="fa-solid fa-trash"></i></button>
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
  if(confirm("Tem a certeza que deseja excluir este prémio permanentemente?")) {
      db.collection('premios').doc(id.toString()).delete().then(() => {
          showToast('Prémio excluído!');
          loadAdminRewards();
      });
  }
};

// 4. Renderizar e Gerir Pedidos de Resgate
window.loadAdminRedemptions = function() {
  const container = document.getElementById('adminRedemptionList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A buscar pedidos...</div>';

  db.collection('resgates').where('companyId', '==', currentUser.companyId).where('status', '==', 'pendente').get().then(snap => {
      if (snap.empty) {
          container.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.6; background:var(--color-bg-secondary); border-radius:8px;">Nenhum pedido pendente de entrega.</div>';
          return;
      }
      
      let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
      snap.forEach(doc => {
          const r = doc.data();
          const func = users.find(u => u.id === r.userId);
          const nomeFunc = func ? func.name : 'Colaborador';
          const dataPedido = new Date(r.createdAt).toLocaleDateString('pt-BR');

          html += `
          <div style="border-left: 4px solid var(--color-warning); background: var(--color-bg-secondary); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <div>
                  <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">🗓️ Pedido em: ${dataPedido}</div>
                  <h4 style="margin: 0 0 5px 0; color: var(--color-text-primary);">${r.premioNome}</h4>
                  <p style="margin:0 0 3px 0; font-size: 13px; color: var(--color-text-secondary);"><strong>Colaborador:</strong> ${nomeFunc}</p>
                  <p style="margin:0; font-size: 13px;"><strong>Custo de Resgate:</strong> <i class="fa-solid fa-coins" style="color:#fbbf24;"></i> ${r.preco} Coins</p>
              </div>
              <div style="display: flex; gap: 8px;">
                  <button class="btn btn-small btn-success" onclick="aprovarResgate(${r.id}, ${r.preco})"><i class="fa-solid fa-check"></i> Entregue</button>
                  <button class="btn btn-small btn-danger" onclick="recusarResgate(${r.id}, ${r.userId}, ${r.preco})"><i class="fa-solid fa-xmark"></i> Cancelar</button>
              </div>
          </div>`;
      });
      html += '</div>';
      container.innerHTML = html;
  });
};

window.aprovarResgate = function(resgateId, preco) {
  if(confirm('Ao clicar em OK, você confirma que o prémio já foi entregue ao funcionário (ex: Vale enviado por email). Confirmar?')) {
      // Marca como aprovado e debita o valor do Banco da Empresa
      db.collection('resgates').doc(resgateId.toString()).update({ status: 'aprovado', dataAprovacao: new Date().toISOString() }).then(() => {
          db.collection('empresas').doc(currentUser.companyId.toString()).get().then(doc => {
              let bank = doc.data().companyBank || 0;
              db.collection('empresas').doc(currentUser.companyId.toString()).update({ companyBank: bank - preco }).then(() => {
                  showToast('Resgate concluído e entregue!');
                  loadAdminRedemptions();
              });
          });
      });
  }
};

window.recusarResgate = function(resgateId, userId, preco) {
  if(confirm('Cancelar pedido e devolver as moedas para o colaborador?')) {
      // Marca como recusado e devolve o dinheiro ao funcionário
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

// Alternador de Sub-abas da Gamificação
window.openGamiTab = function(tabId, btnElement) {
  // Esconde todas as sub-abas
  document.querySelectorAll('.gami-internal-section').forEach(sec => {
      sec.style.display = 'none';
  });
  
  // Mostra a aba clicada
  document.getElementById(tabId).style.display = 'block';
  
  // Remove a classe 'active' de todos os botões e adiciona no clicado
  const botoes = btnElement.parentElement.querySelectorAll('.tab-btn');
  botoes.forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
};

// =======================================================
// GAMIFICAÇÃO - FUNÇÕES DIRETAS (SEM FORMULÁRIOS)
// =======================================================

// 1. CARREGA OS DADOS AO ABRIR A ABA
window.setupAdminGamification = function() {
  db.collection('empresas').doc(currentUser.companyId.toString()).get().then(doc => {
      if (doc.exists) {
          const data = doc.data();
          const isAtiva = data.gamificationEnabled === true;
          // Carrega com os novos prêmios por padrão caso a empresa não os tenha
          const regras = data.gamificacao || { 
              xpBase: 50, xpNivel: 500, coinsNivel: 100, 
              pesoFacil: 2, pesoMedia: 3, pesoDificil: 4,
              premioTop1: 500, premioTop2: 400, premioTop3: 300, premioTop4: 200, premioTop5: 100
          };

          const chk = document.getElementById('chkGamificacaoMaster');
          if (chk) chk.checked = isAtiva;
          
          const area = document.getElementById('gamiSettingsArea');
          if (area) area.style.display = isAtiva ? 'block' : 'none';

          // Preenche todos os inputs
          const campos = ['gamiXpBase', 'gamiXpNivel', 'gamiCoinsNivel', 'gamiPesoFacil', 'gamiPesoMedia', 'gamiPesoDificil', 'gamiPremioTop1', 'gamiPremioTop2', 'gamiPremioTop3', 'gamiPremioTop4', 'gamiPremioTop5'];
          
          campos.forEach(id => {
              if(document.getElementById(id)) {
                  // Pega o ID (ex: gamiPremioTop1) e converte na chave do banco (premioTop1)
                  const key = id.replace('gami', '');
                  const finalKey = key.charAt(0).toLowerCase() + key.slice(1);
                  document.getElementById(id).value = regras[finalKey];
              }
          });
          
          if (document.getElementById('gamiToggleIcon')) document.getElementById('gamiToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-danger)';
          if (document.getElementById('gamiToggleText')) document.getElementById('gamiToggleText').innerText = isAtiva ? 'Gamificação Ativada' : 'Gamificação Desativada';
      }
  });
};

// 2. DISPARADO AO CLICAR NA CHAVINHA
window.alternarChaveGamificacao = function(checkboxElement) {
  const isAtiva = checkboxElement.checked;
  
  document.getElementById('gamiSettingsArea').style.display = isAtiva ? 'block' : 'none';
  document.getElementById('gamiToggleIcon').style.color = isAtiva ? 'var(--color-success)' : 'var(--color-danger)';
  document.getElementById('gamiToggleText').innerText = isAtiva ? 'Gamificação Ativada' : 'Gamificação Desativada';

  db.collection('empresas').doc(currentUser.companyId.toString()).set({ gamificationEnabled: isAtiva }, { merge: true }).then(() => {
      const compIndex = companies.findIndex(x => x.id === currentUser.companyId);
      if (compIndex !== -1) companies[compIndex].gamificationEnabled = isAtiva;
      
      if (typeof window.aplicarVisibilidadeGamificacao === 'function') window.aplicarVisibilidadeGamificacao();
      showToast(isAtiva ? 'Módulo ATIVADO!' : 'Módulo DESATIVADO!');
  });
};

// 3. DISPARADO AO CLICAR EM SALVAR
window.salvarRegrasGamificacao = function(btnElement) {
  const txtOriginal = btnElement.innerHTML;
  btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btnElement.disabled = true;

  // Recolhe todos os valores
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

  db.collection('empresas').doc(currentUser.companyId.toString()).set({ gamificacao: novasRegras }, { merge: true }).then(() => {
      const compIndex = companies.findIndex(x => x.id === currentUser.companyId);
      if (compIndex !== -1) companies[compIndex].gamificacao = novasRegras;

      showToast('Regras atualizadas!');
      btnElement.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
      
      // Atualiza os rankings na tela para refletir os novos valores imediatamente
      if(typeof window.renderRankingMensal === 'function') {
          window.renderRankingMensal('rankingAdminContainer');
          window.renderRankingMensal('rankingFuncContainer');
      }

      setTimeout(() => { btnElement.innerHTML = txtOriginal; btnElement.disabled = false; }, 2000);
  });
};