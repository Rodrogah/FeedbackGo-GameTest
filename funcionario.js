// ============ MOTOR DE NAVEGAÇÃO DO FUNCIONÁRIO ============
async function showEmployeeSection(sec) {
    const palco = document.getElementById('funcConteudoDinamico'); 
    if (!palco) return console.error('Erro fatal: funcConteudoDinamico não existe!');
  
    // 🛡️ LIMPEZA
    sec = String(sec).replace(/['"]/g, '').trim();
    if (sec === 'null' || sec === 'undefined' || sec === '') sec = 'dashboard';
    localStorage.setItem('feedbackgo_aba_func', sec);
  
    try {
        document.querySelectorAll('#employeePanel .nav-item').forEach((i) => i.classList.remove('active'));
        const activeNav = document.querySelector(`#employeePanel .nav-item[onclick*="${sec}"]`);
        if (activeNav) activeNav.classList.add('active');
    } catch(e) {}
  
    palco.style.transition = 'opacity 0.2s ease';
    palco.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 200));
  
    palco.innerHTML = '<div style="text-align:center; padding:50px; opacity: 0.4;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
    palco.style.opacity = '1';
  
    try {
      const rotas = {
        dashboard: 'func-dashboard.html',
        'new-task': 'func-nova-atividade.html',
        history: 'func-historico.html',
        settings: 'func-configuracoes.html',
        'tarefas-recebidas': 'func-tarefas-recebidas.html',
        store: 'func-loja.html',
        resgates: 'func-resgates.html' 
      };
      
      if (!rotas[sec]) sec = 'dashboard';
  
      const resposta = await fetch(`./telas/${rotas[sec]}`);
      if (!resposta.ok) throw new Error('Erro de fetch: Ficheiro não encontrado.');
      
      palco.innerHTML = await resposta.text();
      palco.classList.remove('fade-entrar');
      void palco.offsetWidth; 
      palco.classList.add('fade-entrar');
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  
      const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
  
      if (sec === 'dashboard') {
        const greet = document.getElementById('employeeGreeting');
        if (greet) greet.textContent = `Olá, ${currentUser.name.split(' ')[0]}!`;
        updateCurrentDate('currentDate');
        if (typeof window.refreshFuncDashboard === 'function') window.refreshFuncDashboard();
        if (typeof window.atualizarPainelGamificacao === 'function') window.atualizarPainelGamificacao();
        if (typeof window.renderRankingMensal === 'function') window.renderRankingMensal('rankingFuncContainer');
        if (typeof window.verificarRecompensasPendentes === 'function') window.verificarRecompensasPendentes();
  
      } else if (sec === 'new-task') {
        if (typeof setTodayDate === 'function') setTodayDate('taskDate');
        const catEl = document.getElementById('taskCategory');
        if (catEl && c) {
            catEl.innerHTML = '<option value="" disabled selected>Selecione a categoria...</option>' + 
               (typeof buildCategorySelectOptions === 'function' ? buildCategorySelectOptions(c.categories || defaultCategories) : '');
        }
        setupNewTaskForm();
  
      } else if (sec === 'history') {
        const catEl = document.getElementById('empFilterCategory');
        if (catEl && c) {
            catEl.innerHTML = '<option value="">Todas as Categorias</option>' + 
                (typeof buildCategorySelectOptions === 'function' ? buildCategorySelectOptions(c.categories || defaultCategories) : '');
        }
        loadEmployeeHistory();
  
      } else if (sec === 'settings') {
        const profileInput = document.getElementById('empProfileName');
        if (profileInput) profileInput.value = currentUser.name;
        setupFuncSettingsForms();
        if (typeof window.carregarPerfilEAvatarFunc === 'function') setTimeout(window.carregarPerfilEAvatarFunc, 150);
  
        // MODO ESCURO NA ABA DE CONFIGURAÇÕES
        setTimeout(() => {
            const toggle = document.getElementById('chkDarkMode');
            if (toggle && currentUser) {
                toggle.checked = currentUser.darkMode === true;
            }
        }, 300);
  
      } else if (sec === 'tarefas-recebidas') {
        setupFuncionarioTarefas();
  
      } else if (sec === 'store') {
        if (typeof window.setupFuncStore === 'function') {
            window.setupFuncStore();
        }
  
      } else if (sec === 'resgates') {
        setTimeout(() => {
            if (typeof window.loadFuncRedemptions === 'function') window.loadFuncRedemptions();
        }, 150);
      }
  
    } catch (err) {
      palco.innerHTML = `<div class="alert alert-error">Erro: ${err.message}</div>`;
    }
    
    const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
    const isGamiAtiva = c && c.gamificationEnabled === true;
  
    const menuLojaFunc = document.querySelector('#employeePanel .nav-item[onclick*="store"]');
    if (menuLojaFunc) menuLojaFunc.style.display = isGamiAtiva ? 'flex' : 'none';
  
    if (sec === 'dashboard') {
        setTimeout(() => {
            const barraXp = document.getElementById('xpProgressBar');
            if (barraXp) barraXp.closest('.card').style.display = isGamiAtiva ? 'flex' : 'none';
            
            const rankingFunc = document.getElementById('rankingFuncContainer');
            if (rankingFunc) rankingFunc.parentElement.style.display = isGamiAtiva ? 'block' : 'none';
        }, 150);
    }
    setTimeout(() => {
      if (typeof window.aplicarVisibilidadeGamificacao === 'function') {
          window.aplicarVisibilidadeGamificacao();
      }
    }, 200);
  }
  
  function initEmployeePanel(abaForcada = null) {
    const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
    if (!c) return;
    
    document.getElementById('empCompanySidebar').textContent = c.name;
    document.getElementById('sidebarEmployeeName').textContent = currentUser.name.split(' ')[0];
    document.getElementById('employeeTeamName').textContent = currentUser.team || 'Membro';
  
    const sideAvatar = document.getElementById('employeeAvatar');
    if (sideAvatar) {
        if (currentUser.avatarUrl && currentUser.avatarUrl.includes('dicebear')) {
            sideAvatar.innerHTML = `<img src="${currentUser.avatarUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            sideAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        }
    }
  
    if (currentUser.role === 'hibrido') {
      let btnBox = document.getElementById('boxSwitchToAdmin');
      if (!btnBox) {
          const nav = document.querySelector('#employeePanel .sidebar-nav');
          if(nav) {
              nav.insertAdjacentHTML('afterbegin', `
                <div id="boxSwitchToAdmin" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #1e293b; padding-left: 12px; padding-right: 12px; padding-top: 5px;">
                    <button onclick="alternarVisaoHibrida('admin')" class="btn" style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); width: 100%; border-radius: 8px; font-size: 13px; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.2);">
                        <i class="fa-solid fa-crown"></i> Modo Admin
                    </button>
                </div>
              `);
          }
      }
    }
  
    let abaParaAbrir = abaForcada || localStorage.getItem('feedbackgo_aba_func') || 'dashboard';
    abaParaAbrir = String(abaParaAbrir).replace(/['"]/g, '').trim(); 
    if (abaParaAbrir === 'null' || abaParaAbrir === 'undefined' || abaParaAbrir === '') {
        abaParaAbrir = 'dashboard';
    }
  
    showEmployeeSection(abaParaAbrir);
    setTimeout(runAutoCleanup, 5000);
  }
  
  // ==========================================
  // MÓDULO POWER BI - FUNCIONÁRIO
  // ==========================================
  window.funcDashActiveStatus = null;
  window.funcDashActiveCategory = null;
  
  window.clearFuncDashFilters = function() {
    const elCat = document.getElementById('funcDashFilterCategory');
    const elStart = document.getElementById('funcDashFilterStartDate');
    const elEnd = document.getElementById('funcDashFilterEndDate');
  
    if(elCat) elCat.value = '';
    if(elStart) elStart.value = '';
    if(elEnd) elEnd.value = '';
    
    window.funcDashActiveStatus = null;
    window.funcDashActiveCategory = null;
    if (typeof refreshFuncDashboard === 'function') refreshFuncDashboard();
  };
  
  function getFilteredFuncDashboardData(ignoreStatus = false, ignoreCategory = false) {
    const domCat = document.getElementById('funcDashFilterCategory')?.value;
    const startDate = document.getElementById('funcDashFilterStartDate')?.value;
    const endDate = document.getElementById('funcDashFilterEndDate')?.value;
  
    let f = activities.filter(a => String(a.userId) === String(currentUser.id));
  
    if (domCat) f = f.filter(a => a.category === domCat);
    if (startDate) f = f.filter(a => a.date >= startDate);
    if (endDate) f = f.filter(a => a.date <= endDate);
    
    if (!ignoreCategory && window.funcDashActiveCategory) {
        f = f.filter(a => a.category === window.funcDashActiveCategory);
    }
    if (!ignoreStatus && window.funcDashActiveStatus) {
        f = f.filter(a => a.status === window.funcDashActiveStatus);
    }
    return f;
  }
  
  window.refreshFuncDashboard = function() {
    const c = companies.find((x) => x.id === currentUser.companyId);
    if (!c) return;
  
    const catSelect = document.getElementById('funcDashFilterCategory');
    if (catSelect && catSelect.options.length <= 1) {
        catSelect.innerHTML = '<option value="">Todas Categorias</option>' + 
            (c.categories || defaultCategories).map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
  
    updateEmployeeStats();
    loadEmployeeRecentTasks();
    if (typeof window.renderFuncCharts === 'function') window.renderFuncCharts();
  };
  
  window.updateEmployeeStats = function() {
  const filtered = getFilteredFuncDashboardData();
  
  const elHoje = document.getElementById('todayTasksCount');
  if (elHoje) elHoje.textContent = filtered.filter((a) => a.date === getLocalToday()).length;
  
  const elMes = document.getElementById('monthTasks');
  if (elMes) {
      const hoje = new Date();
      elMes.textContent = filtered.filter((a) => {
          const d = new Date(a.date);
          return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      }).length;
  }
  
  const elTotal = document.getElementById('totalTasks');
  if (elTotal) elTotal.textContent = filtered.length;
  };
  
  window.loadEmployeeRecentTasks = function() {
  const el = document.getElementById('employeeRecentTasks');
  if (!el) return;
  const lista = getFilteredFuncDashboardData()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  el.innerHTML = generateActivityTableHTML(lista, false);
  };
  
  window.renderFuncCharts = function () {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
  
    const actsForStatus = getFilteredFuncDashboardData(true, false);
    const ctxStatus = document.getElementById('funcStatusChart');
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
            if (!window.funcDashActiveStatus) return activeColors[i];
            return window.funcDashActiveStatus === st ? activeColors[i] : inactiveColors[i];
        });
  
        if (window.funcStatusChartInstance) window.funcStatusChartInstance.destroy();
        window.funcStatusChartInstance = new Chart(ctxStatus, {
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
                        window.funcDashActiveStatus = (window.funcDashActiveStatus === clicked) ? null : clicked;
                        refreshFuncDashboard();
                    }
                },
                plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
            }
        });
    }
  
    const actsForCategory = getFilteredFuncDashboardData(false, true);
    const ctxCategory = document.getElementById('funcCategoryChart');
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
            const isActive = !window.funcDashActiveCategory || window.funcDashActiveCategory === cat;
            const alpha = isActive ? (isDark ? '0.85' : '0.9') : '0.2';
            return `hsla(${hue}, 80%, 50%, ${alpha})`;
        });
  
        if (window.funcCategoryChartInstance) window.funcCategoryChartInstance.destroy();
        window.funcCategoryChartInstance = new Chart(ctxCategory, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Atividades', data: data, backgroundColor: bgColors, borderRadius: 4 }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const clickedCat = labels[elements[0].index];
                        window.funcDashActiveCategory = (window.funcDashActiveCategory === clickedCat) ? null : clickedCat;
                        refreshFuncDashboard();
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
  };
  
  // ============ SISTEMA DE PAGINAÇÃO ============
  let currentEmpPage = 1;
  let currentEmpFilteredActs = [];
  
  function loadEmployeeHistory() {
  currentEmpPage = 1;
  const fStart = document.getElementById('empFilterStart');
  const fEnd = document.getElementById('empFilterEnd');
  const fSearch = document.getElementById('empFilterSearch');
  
  if (fStart) fStart.value = '';
  if (fEnd) fEnd.value = '';
  if (fSearch) fSearch.value = '';
  
  if (typeof window.applyEmployeeFilters === 'function') {
      window.applyEmployeeFilters(1);
  }
  }
  
  window.applyEmployeeFilters = function(page = 1) {
  currentEmpPage = page;
  const s = document.getElementById('empFilterStart') ? document.getElementById('empFilterStart').value : '';
  const e = document.getElementById('empFilterEnd') ? document.getElementById('empFilterEnd').value : '';
  const cat = document.getElementById('empFilterCategory') ? document.getElementById('empFilterCategory').value : ''; 
  const search = document.getElementById('empFilterSearch') ? document.getElementById('empFilterSearch').value.toLowerCase().trim() : ''; 
  
  let f = activities.filter((a) => String(a.userId) === String(currentUser.id));
  
  if (s) f = f.filter((a) => a.date >= s);
  if (e) f = f.filter((a) => a.date <= e);
  if (cat) f = f.filter((a) => a.category === cat);
  if (search) {
      f = f.filter((a) => 
          (a.title && a.title.toLowerCase().includes(search)) || 
          (a.description && a.description.toLowerCase().includes(search))
      );
  }
  
  currentEmpFilteredActs = f.sort((a, b) => {
    const diffData = new Date(b.date) - new Date(a.date);
    if (diffData === 0 && a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return diffData;
  });
  
  renderEmployeeHistoryPage();
  };
  
  window.renderEmployeeHistoryPage = function() {
  const el = document.getElementById('employeeHistoryTable');
  if (!el) return;
  
  const itemsPerPage = 20; 
  const totalPages = Math.ceil(currentEmpFilteredActs.length / itemsPerPage) || 1;
  
  if (currentEmpPage > totalPages) currentEmpPage = totalPages;
  if (currentEmpPage < 1) currentEmpPage = 1;
  
  const start = (currentEmpPage - 1) * itemsPerPage;
  const actsPage = currentEmpFilteredActs.slice(start, start + itemsPerPage);
  
  let html = generateActivityTableHTML(actsPage, false);
  
  if (totalPages > 1) {
      html += `
      <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; padding: 10px;">
          <button class="btn btn-secondary btn-small" onclick="applyEmployeeFilters(${currentEmpPage - 1})" ${currentEmpPage === 1 ? 'disabled' : ''}>
              <i class="fa-solid fa-chevron-left"></i> Anterior
          </button>
          <span style="font-size: 14px; font-weight: bold; color: var(--color-text-secondary);">
              Página ${currentEmpPage} de ${totalPages}
          </span>
          <button class="btn btn-secondary btn-small" onclick="applyEmployeeFilters(${currentEmpPage + 1})" ${currentEmpPage === totalPages ? 'disabled' : ''}>
              Próxima <i class="fa-solid fa-chevron-right"></i>
          </button>
      </div>`;
  }
  el.innerHTML = html;
  };
  
  function setupNewTaskForm() {
  const form = document.getElementById('newTaskForm');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);
  
  const fileInput = novoForm.querySelector('#taskAttachment');
  const fileListDisplay = novoForm.querySelector('#fileListDisplay');
  let arquivosSelecionados = [];
  
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      const files = Array.from(this.files);
      if (files.length > 3) {
        showToast('Você só pode anexar no máximo 3 arquivos!', 'error');
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
      date: document.getElementById('taskDate').value,
      category: document.getElementById('taskCategory').value,
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      status: document.getElementById('taskStatus').value,
      xpEarned: 0, 
      createdAt: new Date().toISOString(),
    };
  
    const salvarNoBanco = (atividadeFinal) => {
      atividadeFinal.id = Date.now(); 
      db.collection('atividades')
        .doc(atividadeFinal.id.toString())
        .set(atividadeFinal)
        .then(() => {
          if (window.registrarAcao) {
              window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'CRIAR_ATIVIDADE', `Registrou a atividade: ${atividadeFinal.title}`);
          }
          showEmployeeSection('dashboard').then(() => {
              showToast('Atividade salva com sucesso!', 'success');
          });
        })
        .catch(() => {
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
          reader.onload = function (evento) {
            resolve({ name: file.name, url: evento.target.result });
          };
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
  
  // =========================================================
  // TAREFAS DELEGADAS E RESPOSTAS
  // =========================================================
  window.setupFuncionarioTarefas = function() {
  loadTarefasRecebidas();
  
  const form = document.getElementById('formEntregarTarefa');
  if (!form) return;
  const novoForm = form.cloneNode(true);
  form.parentNode.replaceChild(novoForm, form);
  
  let arquivosSelecionados = [];
  const fileInput = novoForm.querySelector('#entregarArquivos');
  const fileListDisplay = novoForm.querySelector('#entregarArquivosLista');
  
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
    const btn = novoForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    // 1. Capturamos tudo o que está no seu novo HTML
    const tarefaId = document.getElementById('entregarTarefaId').value;
    const observacoes = document.getElementById('entregarObservacoes').value;
    const tituloFinal = document.getElementById('entregarTitulo').value; 
    const quantidade = document.getElementById('entregarQuantidade').value;

    const finalizarParaRevisao = (anexosNovos) => {
      db.collection('tarefas').doc(tarefaId.toString()).update({ 
          status: 'em_revisao',
          quantidade: parseInt(quantidade) || 0, // 🔥 A quantidade vai para o banco de dados aqui!
          respostaFuncionario: observacoes,
          tituloEntrega: tituloFinal,
          attachments: anexosNovos 
      }).then(() => {
          if (window.registrarAcao) {
              window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'ENTREGAR_TAREFA', `Enviou a tarefa com volume de ${quantidade || 0}: ${tituloFinal}`);
          }
          
            db.collection('tarefas').doc(tarefaId.toString()).get().then(docTarefa => {
                const donoDaTarefa = docTarefa.data().senderId;
                if (donoDaTarefa) {
                    db.collection('notificacoes').add({
                        userId: donoDaTarefa,
                        titulo: '📩 Tarefa Entregue!',
                        mensagem: `${currentUser.name} enviou a tarefa "${tituloFinal}" para a sua avaliação.`,
                        createdAt: new Date().toISOString(),
                        acaoAlvo: 'delegar',
                        lida: false
                    });
                }
            });

            showToast('Entregue! Aguardando avaliação.');
            fecharModalTarefa();
            fileListDisplay.innerHTML = '';
            arquivosSelecionados = [];
            btn.innerHTML = originalText;
            btn.disabled = false;
            loadTarefasRecebidas(); 
        }).catch(err => {
            showToast('Erro ao entregar.', 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    };
  
      if (arquivosSelecionados.length > 0) {
          const promessas = arquivosSelecionados.map((file) => {
              return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = function (evento) { resolve({ name: file.name, url: evento.target.result }); };
                  reader.readAsDataURL(file);
              });
          });
          Promise.all(promessas).then(anexos => finalizarParaRevisao(anexos));
      } else {
          finalizarParaRevisao([]);
      }
  });
};
  
  window.loadTarefasRecebidas = function() {
  const container = document.getElementById('listaTarefasFuncionario');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando tarefas...</div>';
  
  db.collection('tarefas').where('userId', '==', currentUser.id).get()
  .then((querySnapshot) => {
      if (querySnapshot.empty) {
          container.innerHTML = '<div style="text-align:center; padding: 20px; background: var(--color-bg-primary); border-radius: 8px;">Nenhuma tarefa pendente. Você está em dia! 🎉</div>';
          return;
      }
  
      let lista = [];
      querySnapshot.forEach(doc => lista.push(doc.data()));
      
      lista.sort((a, b) => {
          const order = { 'pendente': 1, 'em_revisao': 2, 'concluido': 3 };
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
          return new Date(b.createdAt) - new Date(a.createdAt);
      });
  
      let html = `<div style="display: grid; gap: 15px;">`;
  
      lista.forEach(t => {
          const dataFormatada = new Date(t.createdAt).toLocaleDateString('pt-BR');
          const admin = users.find(u => u.id === t.senderId);
          const nomeAdmin = admin ? admin.name : 'Administrador';
  
          const pendente = t.status === 'pendente';
          const emRevisao = t.status === 'em_revisao';
          
          let corBorda = 'border-left: 4px solid var(--color-success);'; 
          let badge = `<span class="badge" style="background:#dcfce7; color:#166534;">Concluída & Aprovada</span>`;
          
          if (pendente) {
              corBorda = t.feedbackAdmin ? 'border-left: 4px solid var(--color-danger);' : 'border-left: 4px solid var(--color-warning);';
              badge = t.feedbackAdmin 
                  ? `<span class="badge" style="background:#fee2e2; color:#991b1b;">Devolvida c/ Erro</span>` 
                  : `<span class="badge" style="background:#fef9c3; color:#854d0e;">Pendente</span>`;
          } else if (emRevisao) {
              corBorda = 'border-left: 4px solid var(--color-info);';
              badge = `<span class="badge" style="background:#dbeafe; color:#1e40af;">Em Revisão</span>`;
          }
  
          html += `
          <div class="card" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; ${corBorda}">
              <div style="flex: 1;">
                  <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 5px;">De: ${nomeAdmin} • ${dataFormatada}</div>
                  <h4 style="margin: 0 0 5px 0;">${t.title}</h4>
                  ${badge}
              </div>
              <div>
                  ${pendente
                      ? `<button class="btn btn-primary btn-small" onclick="abrirModalTarefa('${t.id}')"><i class="fa-solid fa-reply"></i> ${t.feedbackAdmin ? 'Ver Erro e Reenviar' : 'Abrir & Responder'}</button>`
                      : emRevisao 
                          ? `<button class="btn btn-info btn-small" onclick="abrirModalTarefa('${t.id}')" style="background: var(--color-info); color: white; border: none;"><i class="fa-solid fa-pen"></i> Editar Entrega</button>`
                          : `<button class="btn btn-secondary btn-small" disabled><i class="fa-solid fa-check-double"></i> Aprovada</button>`
                  }
              </div>
          </div>`;
      });
  
      html += `</div>`;
      container.innerHTML = html;
  }).catch(err => {
      container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--color-danger);">Erro de conexão.</div>';
  });
  };
  
  window.abrirModalTarefa = function(idTarefa) {
  db.collection('tarefas').doc(idTarefa.toString()).get().then(docSnap => {
      if (!docSnap.exists) return;
      const t = docSnap.data();
  
      const admin = users.find(u => u.id === t.senderId);
      document.getElementById('modalTarefaRemetente').textContent = admin ? admin.name : 'Administrador';
      document.getElementById('modalTarefaTitulo').textContent = t.title;
      document.getElementById('modalTarefaDescricao').textContent = t.description;
      document.getElementById('entregarTarefaId').value = t.id;
      
      document.getElementById('entregarTitulo').value = t.tituloEntrega || t.title; 
      document.getElementById('entregarObservacoes').value = t.respostaFuncionario || '';
  
      const boxFeedback = document.getElementById('boxFeedbackAdmin');
        const txtFeedback = document.getElementById('textoFeedbackAdmin');
        const boxAnexosFeedback = document.getElementById('anexosFeedbackAdmin'); 
  
        if (t.feedbackAdmin && boxFeedback && txtFeedback) {
            txtFeedback.textContent = t.feedbackAdmin;
            if (t.feedbackAttachments && t.feedbackAttachments.length > 0 && boxAnexosFeedback) {
                let anexosHtml = '';
                t.feedbackAttachments.forEach(an => {
                    anexosHtml += `<a href="${an.url}" download="${an.name}" class="badge" style="background: #fca5a5; color: #7f1d1d; text-decoration: none; display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid #f87171;"><i class="fa-solid fa-download"></i> ${an.name}</a>`;
                });
                boxAnexosFeedback.innerHTML = anexosHtml;
            } else if (boxAnexosFeedback) {
                boxAnexosFeedback.innerHTML = ''; 
            }
            boxFeedback.style.display = 'block';
        } else if (boxFeedback) {
            boxFeedback.style.display = 'none';
        }
  
      const boxAnexos = document.getElementById('modalTarefaAnexosAdmin');
      if (t.attachments && t.attachments.length > 0) {
          let anexosHtml = '<strong style="font-size:14px; display:block; margin-bottom: 5px;">Arquivos enviados pelo Administrador:</strong><div style="display: flex; gap: 10px; flex-wrap: wrap;">';
          t.attachments.forEach(an => {
              anexosHtml += `<a href="${an.url}" download="${an.name}" class="badge" style="background: var(--color-bg-secondary); color: var(--color-primary); text-decoration: none; display: flex; align-items: center; gap: 5px; padding: 6px 12px; border: 1px solid var(--color-border);"><i class="fa-solid fa-download"></i> ${an.name}</a>`;
          });
          anexosHtml += '</div>';
          boxAnexos.innerHTML = anexosHtml;
      } else {
          boxAnexos.innerHTML = '';
      }
  
      document.getElementById('entregarArquivosLista').innerHTML = '';
      document.getElementById('modalResponderTarefa').classList.remove('hidden');
  });
  };
  
  window.fecharModalTarefa = function() {
  document.getElementById('modalResponderTarefa').classList.add('hidden');
  };
  
  // ============ CONFIGURAÇÕES DE PERFIL ============
  window.setupFuncSettingsForms = function() {
  const profForm = document.getElementById('empProfileForm');
  if (profForm) {
      profForm.addEventListener('submit', function (e) {
          e.preventDefault();
          const newName = document.getElementById('empProfileName').value.trim();
          const newPass = document.getElementById('empProfilePassword').value;
          const btn = profForm.querySelector('button');
          const originalText = btn ? btn.innerHTML : '';
          if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
  
          let updates = {};
          if (newName) updates.name = newName;
          if (newPass) updates.password = newPass;
  
          db.collection('usuarios').doc(currentUser.id.toString()).update(updates).then(() => {
              if (newName) {
                  currentUser.name = newName;
                  const sidebarName = document.getElementById('sidebarEmployeeName');
                  if (sidebarName) sidebarName.textContent = currentUser.name.split(' ')[0];
                  const avatar = document.getElementById('employeeAvatar');
                  if (avatar) avatar.textContent = currentUser.name.charAt(0).toUpperCase();
              }
              const passInput = document.getElementById('empProfilePassword');
              if (passInput) passInput.value = '';
              showNotice('empProfileAlert', 'Perfil atualizado!', 'success');
              if (btn) btn.innerHTML = originalText || '<i class="fa-solid fa-floppy-disk"></i> Atualizar';
          });
      });
  }
  };
  
  // =======================================================
  // RADAR DE GAMIFICAÇÃO AO VIVO E BARRAS DE XP
  // =======================================================
  window.radarGamificacao = null;
  
  window.atualizarPainelGamificacao = function() {
    if (!document.getElementById('userLevelDisplay')) return;
    
    if (!window.radarGamificacao) {
        window.radarGamificacao = db.collection('usuarios')
            .doc(currentUser.id.toString())
            .onSnapshot(doc => {
                if (doc.exists) {
                    const u = doc.data();
                    currentUser.xp = u.xp || 0;
                    currentUser.goCoins = u.goCoins || 0;
                    currentUser.level = u.level || 1;
                    renderizarBarraGamificacao();
                }
            });
    } else {
        renderizarBarraGamificacao();
    }
  };
  
  function renderizarBarraGamificacao() {
  let xp = currentUser.xp || 0;
  let coins = currentUser.goCoins || 0;
  let level = currentUser.level || 1;
  
  const c = companies.find(x => x.id === currentUser.companyId);
  let xpNecessarioPorNivel = 500;
  if (c && c.gamificacao && c.gamificacao.xpNivel) {
      xpNecessarioPorNivel = c.gamificacao.xpNivel;
  }
  
  let titulos = { 1: 'Iniciante', 2: 'Focado', 3: 'Produtivo', 4: 'Especialista', 5: 'Mestre das Entregas' };
  let tituloAtual = titulos[level] || 'Lenda da Empresa 👑';
  
  let xpAtualNoNivel = xp % xpNecessarioPorNivel; 
  let porcentagem = (xpAtualNoNivel / xpNecessarioPorNivel) * 100;
  
  const levelDisplay = document.getElementById('userLevelDisplay');
  if (levelDisplay) {
      levelDisplay.innerText = level;
      document.getElementById('userTitleDisplay').innerText = tituloAtual;
      document.getElementById('currentXpDisplay').innerText = xpAtualNoNivel;
      
      const nextLevelDisplay = document.getElementById('nextLevelXpDisplay');
      if(nextLevelDisplay) nextLevelDisplay.innerText = xpNecessarioPorNivel;
  
      document.getElementById('xpProgressBar').style.width = Math.min(porcentagem, 100) + '%';
      
      const coinDisplay = document.getElementById('goCoinsDisplay');
      if (coinDisplay && coinDisplay.innerText !== coins.toString()) {
          coinDisplay.innerText = coins;
          coinDisplay.parentElement.style.transform = 'scale(1.2)';
          setTimeout(() => { coinDisplay.parentElement.style.transform = 'scale(1)'; }, 300);
      } else if (coinDisplay) {
          coinDisplay.innerText = coins;
      }
  }
  }
  
  
// ==========================================
// ======== NOVA LOJA DO FUNCIONÁRIO ========
// ==========================================
window.setupFuncStore = function() {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    if (!c) return;

    if (typeof verificarViradaDeMesOrcamento === 'function') verificarViradaDeMesOrcamento(c.id);

    const displayCoins = document.getElementById('storeUserCoinsDisplay');
    if (displayCoins) displayCoins.textContent = currentUser.goCoins || 0;

    const catalogoDiv = document.getElementById('funcRewardsCatalog');
    if (!catalogoDiv) return;

    catalogoDiv.style.display = 'grid';
    catalogoDiv.style.gridTemplateColumns = 'repeat(auto-fill, minmax(230px, 1fr))';
    catalogoDiv.style.gap = '20px';

    let html = '';
    
    // 🔥 NOVO: Lê as configurações do Admin (Câmbio e Marcas Ativas)
    const configLoja = c.giftCardConfig || { rate: 10, active: ['uber', 'netflix', 'xbox', 'spotify', 'playstation', 'steam'] };
    const taxaCambio = configLoja.rate || 10;
    
    if (window.apiGiftCardsCatalog) {
        // Filtra para desenhar APENAS os cartões que o Admin ativou
        const cartoesAtivos = window.apiGiftCardsCatalog.filter(card => configLoja.active.includes(card.id));

        cartoesAtivos.forEach(card => {
            const visualMarca = card.logoUrl 
                ? `<img src="${card.logoUrl}" alt="${card.name}" style="max-width: 60%; max-height: 45%; object-fit: contain;" onerror="this.outerHTML='<i class=&quot;${card.fallbackIcon}&quot; style=&quot;font-size: 55px; color: white;&quot;></i>'">`
                : `<i class="${card.fallbackIcon}" style="font-size: 55px; color: white;"></i>`;

            html += `
            <div class="card reward-card" style="padding: 15px; text-align: center; border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; background: var(--color-bg-primary);">
                <div>
                    <div style="background-color: ${card.bgColor}; width: 100%; height: 130px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                        ${visualMarca}
                    </div>
                    <p style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 15px; height: 35px; line-height: 1.4;">${card.descricao}</p>
                </div>
                <div>
                    <select id="select-sku-${card.id}" style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 6px; border: 1px solid var(--color-border); font-size: 13px; background: var(--color-bg-secondary); color: var(--color-text-primary); cursor: pointer;">
                        <option value="" disabled selected>Escolha o valor...</option>
                        ${card.options.map(opt => {
                            // CÁLCULO DINÂMICO DA MOEDA COM BASE NA TAXA DE CÂMBIO!
                            const custoDinamico = opt.brl * taxaCambio;
                            return `<option value="${opt.sku}" data-brl="${opt.brl}">R$ ${opt.brl} (${custoDinamico} GoCoins)</option>`;
                        }).join('')}
                    </select>

                    <button onclick="solicitarResgateGiftCard('${card.id}')" class="btn" style="width: 100%; background: #10b981; color: white; border: none; font-weight: bold; padding: 12px; border-radius: 6px; font-size: 14px; transition: 0.2s;">
                        <i class="fa-solid fa-cart-shopping"></i> Resgatar
                    </button>
                </div>
            </div>`;
        });
    }

    db.collection('premios').where('companyId', '==', currentUser.companyId).where('ativo', '==', true).get().then(snap => {
        if (!snap.empty) {
            let premiosInternos = [];
            snap.forEach(doc => premiosInternos.push(doc.data()));
            premiosInternos.sort((a, b) => a.preco - b.preco);

            premiosInternos.forEach(p => {
                html += `
                <div class="card reward-card" style="padding: 15px; text-align: center; border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; background: var(--color-bg-primary);">
                    <div>
                        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); width: 100%; height: 130px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 15px; color: white;">
                            <i class="fa-solid fa-star" style="font-size: 32px; margin-bottom: 10px; color: #fbbf24;"></i>
                            <h3 style="margin: 0; font-size: 16px; padding: 0 10px;">${p.nome}</h3>
                        </div>
                        <p style="font-size: 13px; color: var(--color-text-secondary); margin-bottom: 15px; height: 35px; line-height: 1.4;">${p.descricao || 'Prêmio corporativo exclusivo.'}</p>
                    </div>
                    <div>
                        <div style="width: 100%; padding: 10px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #f59e0b; font-size: 14px; background: #fef3c7; color: #b45309; font-weight: bold;">
                            <i class="fa-solid fa-coins"></i> ${p.preco} GoCoins
                        </div>
                        <button class="btn" style="width: 100%; background: #3b82f6; color: white; border: none; font-weight: bold; padding: 12px; border-radius: 6px; font-size: 14px; transition: 0.2s;" onclick="solicitarResgateInterno(${p.id}, '${p.nome}', ${p.preco})">
                            <i class="fa-solid fa-check"></i> Resgatar
                        </button>
                    </div>
                </div>`;
            });
        }
        catalogoDiv.innerHTML = html;
    });
};

window.solicitarResgateGiftCard = async function(cardId) {
    const c = companies.find(x => String(x.id) === String(currentUser.companyId));
    const cardData = window.apiGiftCardsCatalog.find(x => x.id === cardId);
    
    const select = document.getElementById(`select-sku-${cardId}`);
    const opcaoSelecionada = select.options[select.selectedIndex];
    
    if (!opcaoSelecionada || !opcaoSelecionada.value) {
        return showToast('Por favor, escolha um valor antes de resgatar.', 'warning');
    }

    const sku = opcaoSelecionada.value;
    const valorReais = parseFloat(opcaoSelecionada.getAttribute('data-brl'));
    const nomePremio = `${cardData.name} R$ ${valorReais}`;

    // 🔥 NOVO: Cálculo de Segurança Anti-Hacker (Calcula sempre pelo backend local)
    const configLoja = c.giftCardConfig || { rate: 10 };
    const taxaCambio = configLoja.rate || 10;
    const custoCoinsDinamico = valorReais * taxaCambio; // Multiplica o real pela taxa atual!

    const userCoins = currentUser.goCoins || 0;
    if (userCoins < custoCoinsDinamico) {
        return showToast(`Saldo insuficiente! Você precisa de ${custoCoinsDinamico} GoCoins.`, 'error');
    }

    const orcamentoMensal = c.monthlyBudget || 500;
    const gastoNesteMes = c.spentThisMonth || 0;
    const orcamentoRestante = orcamentoMensal - gastoNesteMes;

    if (valorReais > orcamentoRestante) {
        return showToast(`O limite financeiro da empresa esgotou este mês. Restam apenas R$ ${orcamentoRestante.toFixed(2)}.`, 'error');
    }

    const btnOriginal = document.activeElement;
    const btnOriginalHTML = btnOriginal.innerHTML;

    const mensagemHtml = `
        <div style="text-align: center;">
            <i class="${cardData.fallbackIcon}" style="font-size: 40px; color: ${cardData.bgColor === '#000000' ? '#1e293b' : cardData.bgColor}; margin-bottom: 15px;"></i>
            <p style="font-size: 15px; margin-bottom: 15px;">Confirma o resgate do vale <strong>${nomePremio}</strong>?</p>
            <div style="display: inline-block; background: #fef3c7; color: #b45309; padding: 10px 20px; border-radius: 8px; font-weight: 900; font-size: 18px; border: 2px dashed #f59e0b;">
                - ${custoCoinsDinamico} <i class="fa-solid fa-coins"></i>
            </div>
        </div>
    `;

    showConfirm(mensagemHtml, async () => {
        if(btnOriginal && btnOriginal.tagName === 'BUTTON') {
            btnOriginal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
            btnOriginal.disabled = true;
        }

        try {
            const novoSaldo = userCoins - custoCoinsDinamico;
            await db.collection('usuarios').doc(String(currentUser.id)).update({ goCoins: novoSaldo });
            currentUser.goCoins = novoSaldo; 

            const novoGasto = gastoNesteMes + valorReais;
            await db.collection('empresas').doc(String(c.id)).update({ spentThisMonth: novoGasto });
            c.spentThisMonth = novoGasto; 

            const novoResgate = {
                id: Date.now(),
                companyId: c.id,
                userId: currentUser.id,
                userName: currentUser.name,
                premioNome: nomePremio,
                preco: custoCoinsDinamico, 
                valorBRL: valorReais,
                skuApi: sku,
                tipo: 'giftcard',
                status: 'pendente', 
                createdAt: new Date().toISOString()
            };

            await db.collection('resgates').doc(String(novoResgate.id)).set(novoResgate);

            // 🔥 GATILHO: AVISA TODOS OS ADMINS SOBRE O PEDIDO DE GIFT CARD
            db.collection('usuarios').where('companyId', '==', c.id).where('role', '==', 'admin').get().then(snap => {
                snap.forEach(adminDoc => {
                    db.collection('notificacoes').add({
                        userId: adminDoc.data().id,
                        titulo: '🛍️ Novo Pedido na Loja!',
                        mensagem: `${currentUser.name} solicitou o resgate de: ${nomePremio}.`,
                        createdAt: new Date().toISOString(),
                        acaoAlvo: 'store',
                        lida: false
                    });
                });
            });

            showToast('🎉 Pedido realizado! Aguarde o PIN.', 'success');
            setupFuncStore(); 

        } catch (e) {
            showToast('Erro no processamento do resgate.', 'error');
            if(btnOriginal && btnOriginal.tagName === 'BUTTON') {
                btnOriginal.innerHTML = btnOriginalHTML;
                btnOriginal.disabled = false;
            }
        }
    }, '🛒 Confirmar Compra', '<i class="fa-solid fa-check"></i> Comprar', 'btn-success');
};

// Resgate de Prêmio Interno (Não gasta Orçamento da Empresa)
window.solicitarResgateInterno = async function(premioId, nomePremio, precoCoins) {
    const userCoins = currentUser.goCoins || 0;
    if (userCoins < precoCoins) {
        return showToast(`Saldo insuficiente!`, 'error');
    }

    const btnOriginal = document.activeElement;
    const btnOriginalHTML = btnOriginal.innerHTML;

    // === NOVA CAIXA DE CONFIRMAÇÃO INTERNA E BONITA ===
    const mensagemHtml = `
        <div style="text-align: center;">
            <div style="width: 50px; height: 50px; background: rgba(59, 130, 246, 0.1); color: var(--color-info); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 15px auto;">
                <i class="fa-solid fa-star"></i>
            </div>
            <p style="font-size: 15px; margin-bottom: 15px;">Confirma o resgate de <strong>${nomePremio}</strong>?</p>
            <div style="display: inline-block; background: #fef3c7; color: #b45309; padding: 10px 20px; border-radius: 8px; font-weight: 900; font-size: 18px; border: 2px dashed #f59e0b;">
                - ${precoCoins} <i class="fa-solid fa-coins"></i>
            </div>
        </div>
    `;

    showConfirm(mensagemHtml, async () => {
        if(btnOriginal && btnOriginal.tagName === 'BUTTON') {
            btnOriginal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
            btnOriginal.disabled = true;
        }

        try {
            const novoSaldo = userCoins - precoCoins;
            await db.collection('usuarios').doc(String(currentUser.id)).update({ goCoins: novoSaldo });
            currentUser.goCoins = novoSaldo; 

            const novoResgate = {
                id: Date.now(),
                companyId: currentUser.companyId,
                userId: currentUser.id,
                userName: currentUser.name,
                premioNome: nomePremio,
                preco: precoCoins, 
                valorBRL: 0, 
                tipo: 'interno',
                status: 'pendente', 
                createdAt: new Date().toISOString()
            };

            await db.collection('resgates').doc(String(novoResgate.id)).set(novoResgate);

            // 🔥 GATILHO: AVISA TODOS OS ADMINS SOBRE O PEDIDO INTERNO
            db.collection('usuarios').where('companyId', '==', currentUser.companyId).where('role', '==', 'admin').get().then(snap => {
                snap.forEach(adminDoc => {
                    db.collection('notificacoes').add({
                        userId: adminDoc.data().id,
                        titulo: '⭐ Resgate de Prêmio Interno!',
                        mensagem: `${currentUser.name} resgatou: ${nomePremio}.`,
                        createdAt: new Date().toISOString(),
                        acaoAlvo: 'store',
                        lida: false
                    });
                });
            });

            showToast('🎉 Pedido realizado com sucesso!', 'success');
            setupFuncStore(); 

        } catch (e) {
            showToast('Erro no processamento.', 'error');
            if(btnOriginal && btnOriginal.tagName === 'BUTTON') {
                btnOriginal.innerHTML = btnOriginalHTML;
                btnOriginal.disabled = false;
            }
        }
    }, '⭐ Confirmar Resgate', '<i class="fa-solid fa-check"></i> Resgatar', 'btn-primary');
};
  
  // ==========================================
  // ABA: MEUS RESGATES (HISTÓRICO DO FUNCIONÁRIO)
  // ==========================================
  window.verCodigoResgate = function(codigo) {
    if (!codigo || codigo === 'undefined' || codigo === '') {
        return showToast('O código ainda não foi inserido pelo gestor.', 'error');
    }
    showConfirm(
        `<div style="text-align: center; margin-top: 10px;">
            <p style="font-size: 14px; margin-bottom: 15px; color: var(--color-text-secondary);">Copie o seu código abaixo:</p>
            <div style="background: rgba(16, 185, 129, 0.1); border: 2px dashed var(--color-primary); padding: 15px; border-radius: 8px; font-size: 22px; font-weight: 900; color: var(--color-primary); user-select: all; cursor: pointer;">
                ${codigo}
            </div>
        </div>`,
        () => { }, '🎁 O Seu Prêmio Chegou!'
    );
  };
  
  window.loadFuncRedemptions = function() {
    const container = document.getElementById('listaMeusResgates');
    if (!container) return;
  
    container.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fa-solid fa-spinner fa-spin"></i> A carregar...</div>';
  
    db.collection('resgates').where('userId', '==', currentUser.id).get().then(snap => {
        if (snap.empty) {
            container.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.6;">Ainda não tens resgates feitos.</div>';
            return;
        }
  
        let html = '<div class="table-container"><table><thead><tr><th>Data</th><th>Prêmio</th><th>Coins</th><th>Status / Ação</th></tr></thead><tbody>';
        let lista = [];
        snap.forEach(doc => lista.push(doc.data()));
        lista.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  
        lista.forEach(r => {
            const dataP = new Date(r.createdAt).toLocaleDateString('pt-BR');
            let acaoHtml = '';
            
            if (r.status === 'pendente') {
                acaoHtml = '<span class="badge" style="background:#fef9c3; color:#ca8a04;">Aguardando Gestor</span>';
            } else if (r.status === 'aprovado') {
                if(r.tipo === 'interno') {
                   acaoHtml = '<span class="badge" style="background:#dcfce7; color:#166534;"><i class="fa-solid fa-check"></i> Autorizado</span>';
                } else {
                   const pinSeguro = r.codigoResgate || r.pin || ''; 
                   acaoHtml = `<button class="btn btn-small" style="background:var(--color-primary); color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" onclick="window.verCodigoResgate('${pinSeguro}')">
                        <i class="fa-solid fa-gift"></i> Ver PIN
                    </button>`;
                }
            } else {
                acaoHtml = '<span class="badge" style="background:#fee2e2; color:#dc2626;">Devolvido / Recusado</span>';
            }
  
            html += `<tr><td>${dataP}</td><td><strong>${r.premioNome}</strong></td><td><span style="color:#b45309; font-weight:bold;">${r.preco} <i class="fa-solid fa-coins"></i></span></td><td>${acaoHtml}</td></tr>`;
        });
  
        html += '</tbody></table></div>';
        container.innerHTML = html;
    });
  };
  
  // =======================================================
  // ESTÚDIO DE AVATARES FUNCIONÁRIO - LORELEI EXCLUSIVO
  // =======================================================
  
  const genVarFunc = (count) => Array.from({length: count}, (_, i) => `variant${String(i+1).padStart(2, '0')}`);
  
  const loreleiConfigFunc = {
    f1: { prop: 'hair', values: genVarFunc(47) }, 
    f2: { prop: 'eyes', values: genVarFunc(24) }, 
    f3: { prop: 'mouth', values: genVarFunc(20) }, 
    f4: { prop: 'glasses', values: ['none', ...genVarFunc(5)] } 
  };
  
  window.charState = { f1: 0, f2: 0, f3: 0, f4: 0 };
  
  window.mudarTracoStudio = function(traco, direcao) {
    const opcoes = loreleiConfigFunc[traco].values;
    window.charState[traco] += direcao;
    if (window.charState[traco] > opcoes.length - 1) window.charState[traco] = 0;
    if (window.charState[traco] < 0) window.charState[traco] = opcoes.length - 1;
    window.renderStudio();
  };
  
  window.renderStudio = function() {
    ['f1', 'f2', 'f3', 'f4'].forEach(t => {
        const lbl = document.getElementById(`lbl_${t}`);
        if (lbl) lbl.innerText = window.charState[t];
    });
  
    const getCor = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.replace('#', '') : 'ffffff';
    }
    
    const url = `https://api.dicebear.com/9.x/lorelei/svg?seed=Func&backgroundColor=${getCor('studioBgColor')}&skinColor=${getCor('studioSkinColor')}&hairColor=${getCor('studioHairColor')}&hair=${loreleiConfigFunc.f1.values[window.charState.f1]}&eyes=${loreleiConfigFunc.f2.values[window.charState.f2]}&mouth=${loreleiConfigFunc.f3.values[window.charState.f3]}&glasses=${loreleiConfigFunc.f4.values[window.charState.f4]}&glassesProbability=${window.charState.f4 === 0 ? 0 : 100}`;
  
    const imgEl = document.getElementById('avatarStudioImg');
    if (imgEl) { imgEl.src = url; imgEl.style.display = 'block'; }
    
    const letraEl = document.getElementById('avatarStudioLetra');
    if (letraEl) letraEl.style.display = 'none';
  };
  
  window.carregarPerfilEAvatarFunc = function() {
    if (!currentUser) return;
    const inName = document.getElementById('funcProfileName');
    if(inName) inName.value = currentUser.name;
  
    if (currentUser.avatarUrl && currentUser.avatarUrl.includes('lorelei')) {
        try {
            const urlObj = new URL(currentUser.avatarUrl);
            const p = (param, slot) => {
                const v = urlObj.searchParams.get(param);
                const idx = loreleiConfigFunc[slot].values.indexOf(v);
                return idx !== -1 ? idx : 0;
            };
            window.charState = { f1: p('hair', 'f1'), f2: p('eyes', 'f2'), f3: p('mouth', 'f3'), f4: p('glasses', 'f4') };
            
            const c = (param, id) => {
                let v = urlObj.searchParams.get(param);
                const el = document.getElementById(id);
                if (v && el) {
                    v = v.replace('#', '');
                    el.value = '#' + v;
                }
            };
            c('backgroundColor', 'studioBgColor'); c('skinColor', 'studioSkinColor'); c('hairColor', 'studioHairColor');
        } catch(e) {}
    } else {
        if(document.getElementById('studioBgColor')) document.getElementById('studioBgColor').value = '#b6e3f4';
        if(document.getElementById('studioSkinColor')) document.getElementById('studioSkinColor').value = '#ffdbb4';
        if(document.getElementById('studioHairColor')) document.getElementById('studioHairColor').value = '#2a2a2a';
    }
    
    window.renderStudio();
  };
  
  window.salvarPerfilStudioFuncionario = function(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;
  
  const novoNome = document.getElementById('funcProfileName').value.trim();
  const novaSenha = document.getElementById('funcProfilePassword').value.trim();
  
  const imgEl = document.getElementById('avatarStudioImg');
  let novoAvatar = '';
  if (imgEl && imgEl.src && imgEl.src.includes('dicebear.com')) {
      novoAvatar = imgEl.src;
  }
  
  if (!novoNome) { 
      showToast('O nome não pode estar vazio!', 'error'); 
      btn.innerHTML = original; btn.disabled = false; return; 
  }
  
  const updates = { name: novoNome };
  if (novaSenha) updates.password = novaSenha;
  if (novoAvatar) updates.avatarUrl = novoAvatar;
  
  db.collection('usuarios').doc(currentUser.id.toString()).update(updates).then(() => {
      currentUser.name = novoNome;
      if (novaSenha) currentUser.password = novaSenha;
      if (novoAvatar) currentUser.avatarUrl = novoAvatar;
  
      const uIndex = users.findIndex(x => x.id === currentUser.id);
      if (uIndex !== -1) { users[uIndex].name = novoNome; users[uIndex].avatarUrl = novoAvatar; }
  
      const sideAvatar = document.getElementById('employeeAvatar');
      if (sideAvatar) sideAvatar.innerHTML = `<img src="${novoAvatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      
      const sideName = document.getElementById('sidebarEmployeeName');
      if (sideName) sideName.textContent = novoNome.split(' ')[0];
  
      showToast('Perfil e Avatar guardados!');
      document.getElementById('funcProfilePassword').value = '';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvo!';
      setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2000);
  }).catch(err => {
      console.error(err);
      showToast('Erro ao salvar.', 'error');
      btn.innerHTML = original; btn.disabled = false;
  });
  };
  
  // =======================================================
  // SISTEMA DE RECOMPENSAS MENSAIS DO PÓDIO
  // =======================================================
  function isUltimoDiaDoMes(data) {
  const amanha = new Date(data);
  amanha.setDate(data.getDate() + 1);
  return amanha.getDate() === 1;
  }
  
  function formatarMesParaResgate(data) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }
  
  function calcularTop5ParaResgate(companyId, mesString) {
  const acts = activities.filter(a =>
      a.companyId === companyId &&
      a.status === 'concluido' &&
      a.date && a.date.startsWith(mesString)
  );
  
  let mapaPontos = {};
  acts.forEach(a => {
      mapaPontos[a.userId] = (mapaPontos[a.userId] || 0) + (a.xpEarned || 0);
  });
  
  let ranking = Object.keys(mapaPontos).map(uid => ({
      userId: parseInt(uid),
      xp: mapaPontos[uid]
  })).filter(u => u.xp > 0).sort((a, b) => b.xp - a.xp);
  
  return ranking;
  }
  
  window.verificarRecompensasPendentes = function() {
  const c = companies.find(x => x.id === currentUser.companyId);
  if (!c || !c.gamificationEnabled) return;
  
  const regras = c.gamificacao || { premioTop1: 500, premioTop2: 400, premioTop3: 300, premioTop4: 200, premioTop5: 100 };
  const valoresPremios = [regras.premioTop1, regras.premioTop2, regras.premioTop3, regras.premioTop4, regras.premioTop5];
  
  const hoje = new Date();
  const mesAtualStr = formatarMesParaResgate(hoje);
  
  const mesPassadoData = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesPassadoStr = formatarMesParaResgate(mesPassadoData);
  
  let mesesParaVerificar = [mesPassadoStr];
  
  if (isUltimoDiaDoMes(hoje)) {
      mesesParaVerificar.push(mesAtualStr);
  }
  
  const historicoResgates = currentUser.resgatesRanking || [];
  let htmlBanner = '';
  
  for (let mes of mesesParaVerificar) {
      if (!historicoResgates.includes(mes)) { 
          const ranking = calcularTop5ParaResgate(c.id, mes);
          const minhaPosicaoIndex = ranking.findIndex(u => u.userId === currentUser.id);
  
          if (minhaPosicaoIndex >= 0 && minhaPosicaoIndex < 5) {
              const premioMoedas = valoresPremios[minhaPosicaoIndex] || 0;
              
              const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
              const mesNum = parseInt(mes.split('-')[1]) - 1;
              const nomeDoMes = nomesMeses[mesNum];
  
              htmlBanner = `
              <div id="bannerPremioRanking_${mes}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 22px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4); animation: transicaoTela 0.5s ease; flex-wrap: wrap; gap: 15px;">
                  <div style="display: flex; align-items: center; gap: 18px;">
                      <div style="background: rgba(255,255,255,0.2); width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);">
                          🏆
                      </div>
                      <div>
                          <h3 style="margin: 0 0 4px 0; font-size: 18px; color: white;">Parabéns! Você ficou no Top ${minhaPosicaoIndex + 1} de ${nomeDoMes}!</h3>
                      </div>
                  </div>
                  <button onclick="resgatarPremioDoRanking('${mes}', ${premioMoedas})" style="background: white; color: #d97706; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 900; cursor: pointer; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: 0.2s; min-width: 160px;">
                      RESGATAR <i class="fa-solid fa-coins"></i> ${premioMoedas}
                  </button>
              </div>
              `;
              break; 
          }
      }
  }
  
  const container = document.getElementById('areaAvisosGamificacao');
  if (container) {
      container.innerHTML = htmlBanner;
  }
  };
  
  window.resgatarPremioDoRanking = function(mesId, valorMoedas) {
  const btn = event.currentTarget;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Resgatar...';
  btn.disabled = true;
  
  const meusResgates = currentUser.resgatesRanking || [];
  if (!meusResgates.includes(mesId)) {
      meusResgates.push(mesId);
  }
  
  const novoSaldo = (currentUser.goCoins || 0) + valorMoedas;
  
  db.collection('usuarios').doc(currentUser.id.toString()).update({
      goCoins: novoSaldo,
      resgatesRanking: meusResgates
  }).then(() => {
      currentUser.goCoins = novoSaldo;
      currentUser.resgatesRanking = meusResgates;
      
      showToast(`🎉 Incrível! +${valorMoedas} GoCoins adicionados ao teu saldo!`);
      
      const banner = document.getElementById(`bannerPremioRanking_${mesId}`);
      if(banner) {
          banner.style.opacity = '0';
          banner.style.transform = 'scale(0.9)';
          setTimeout(() => { banner.style.display = 'none'; }, 300);
      }
  
      if (typeof atualizarPainelGamificacao === 'function') atualizarPainelGamificacao();
  }).catch(err => {
      showToast('Erro ao resgatar prêmio.', 'error');
      btn.innerHTML = `RESGATAR <i class="fa-solid fa-coins"></i> ${valorMoedas}`;
      btn.disabled = false;
  });
  };