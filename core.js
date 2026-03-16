// ============ 1. INTEGRAÇÃO FIREBASE & EMAIL ============
const firebaseConfig = {
  apiKey: "AIzaSyDNP3BqvD2udl05uIIQ4-VYqJAL7LpaKoE",
  authDomain: "feedbackgo---game-test.firebaseapp.com",
  projectId: "feedbackgo---game-test",
  storageBucket: "feedbackgo---game-test.firebasestorage.app",
  messagingSenderId: "360325357568",
  appId: "1:360325357568:web:760dba4d389ae3b3c438e5",
  measurementId: "G-R1WY7CLLS7"
};
if (!firebase.apps.length) {
firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const EMAILJS_SERVICE_ID = 'service_gmail';
const EMAILJS_TEMPLATE_GENERIC = 'template_welcome';
const EMAILJS_TEMPLATE_REPORT = 'template_report';

// ============ 2. VARIÁVEIS GLOBAIS ============
let companies = [],
users = [],
activities = [];
let currentUser = null,
nextCompanyId = 1,
nextUserId = 1,
nextActivityId = 1;
let isFirstLoad = true;
const defaultCategories = [
'Geral',
'Reunião',
'Desenvolvimento',
'Suporte',
'Vendas',
'Formação',
];

// ============ 3. MÁGICA DO TEMPO REAL (NOVA ARQUITETURA) ============
let loadState = { emp: false, usr: false, act: false };

function checkFirstLoad() {
// Só liberta o login quando as 3 coleções terminarem de carregar
if (isFirstLoad && loadState.emp && loadState.usr && loadState.act) {
  isFirstLoad = false;
  // Chama a função que agora vive no auth.js
  if (typeof window.processAutoLogin === 'function') {
      window.processAutoLogin();
  }
} else if (!isFirstLoad) {
  refreshLiveData();
}
}

// 📡 Radar das Empresas
db.collection('empresas').onSnapshot((snap) => {
  companies = snap.docs.map((doc) => doc.data());
  nextCompanyId = companies.length > 0 ? Math.max(...companies.map((c) => c.id)) + 1 : 1;
  loadState.emp = true;
  checkFirstLoad();
}, (err) => console.error('Erro Empresas:', err));

// 📡 Radar dos Usuários
db.collection('usuarios').onSnapshot((snap) => {
  users = snap.docs.map((doc) => doc.data());
  nextUserId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  loadState.usr = true;
  checkFirstLoad();
}, (err) => console.error('Erro Usuários:', err));

// 📡 Radar das Atividades
db.collection('atividades').onSnapshot((snap) => {
  activities = snap.docs.map((doc) => doc.data());
  nextActivityId = activities.length > 0 ? Math.max(...activities.map((a) => a.id)) + 1 : 1;
  loadState.act = true;
  checkFirstLoad();
}, (err) => console.error('Erro Atividades:', err));

function refreshLiveData() {
if (!currentUser) return;

if (currentUser.role === 'admin') {
  if (typeof updateAdminStats === 'function') updateAdminStats();

  const palco = document.getElementById('adminConteudoDinamico');
  if (palco) {
    if (palco.querySelector('#adminRecentActivities') && typeof loadAdminRecentActivities === 'function') loadAdminRecentActivities();
    if (palco.querySelector('#adminActivitiesTable') && typeof applyAdminFilters === 'function') applyAdminFilters();
    if (palco.querySelector('#usersTable') && typeof loadUsersTable === 'function') loadUsersTable();
    if (palco.querySelector('#adminStatusChart') && typeof renderAdminCharts === 'function') renderAdminCharts();
    if (palco.querySelector('#rankingAdminContainer') && typeof renderRankingMensal === 'function') renderRankingMensal('rankingAdminContainer');
  }
} else {
  if (typeof updateEmployeeStats === 'function') updateEmployeeStats();

  const palcoFunc = document.getElementById('funcConteudoDinamico');
  if (palcoFunc) {
    if (palcoFunc.querySelector('#employeeRecentTasks') && typeof loadEmployeeRecentTasks === 'function') loadEmployeeRecentTasks();
    if (palcoFunc.querySelector('#employeeHistoryTable') && typeof loadEmployeeHistory === 'function') loadEmployeeHistory();
    if (palcoFunc.querySelector('#funcStatusChart') && typeof renderFuncCharts === 'function') renderFuncCharts();
    if (palcoFunc.querySelector('#rankingFuncContainer') && typeof renderRankingMensal === 'function') renderRankingMensal('rankingFuncContainer');
  }
}
}

// ============ 4. EMAILS ============
function sendWelcomeEmail(userName, userEmail, userPass) {
const comp = companies.find((c) => c.id === currentUser.companyId);
emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_GENERIC, {
  to_name: userName,
  to_email: userEmail,
  subject: 'Bem-vindo à ' + (comp ? comp.name : 'FeedbackGo'),
  message_title: 'Sua conta foi criada',
  message_body: 'Seus dados de acesso:',
  label_destaque: 'Senha',
  password: userPass,
  extra_info: 'Altere a senha após o login.',
  company_name: comp ? comp.name : 'FeedbackGo',
});
}

function sendFilteredReportEmail(event) {
const filteredActs = getFilteredReportData();
if (filteredActs.length === 0) return alert('Não há dados para enviar.');

filteredActs.sort((a, b) => a.date.localeCompare(b.date));

let txt = `Relatório Gerado:\nTotal: ${filteredActs.length}\n\n`;
filteredActs.forEach((act) => {
  const u = users.find((x) => x.id === act.userId);
  txt += `[${formatDate(act.date)}] ${u ? u.name : 'Removido'} - ${act.category}: ${act.title} (${act.status})\n`;
});

const btn = event.currentTarget;
const orig = btn.innerHTML;
btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Enviar...';
btn.disabled = true;

emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_REPORT, {
    to_name: currentUser.name,
    to_email: currentUser.email,
    relatorio_texto: txt,
  }).then(() => {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Enviado!';
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 3000);
  }).catch((err) => {
    alert('Erro ao enviar.');
    btn.innerHTML = orig;
    btn.disabled = false;
  });
}

// ============ 5. ATIVIDADES SHARED (COMPARTILHADAS) ============
function generateActivityTableHTML(acts, isAdmin = false) {
if (!acts || !acts.length)
  return `<div class="empty-state"><i class="fa-solid fa-box-open empty-state-icon"></i><p>Nenhum registro encontrado.</p></div>`;

return `<div class="table-container"><table><thead><tr>${
  isAdmin ? '<th>Membro</th>' : ''
}<th>Data</th><th>Categoria</th><th>Atividade</th><th>Detalhes</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        ${acts
          .map((a) => {
            const u = users.find((x) => String(x.id) === String(a.userId));
            
            const souDono = String(a.userId) === String(currentUser.id);
            const podeEditar = isAdmin || souDono;
            const ehDelegada = !!(a.tarefaVinculadaId || a.adminId || a.tipo === 'delegada');
            const souGestor = (currentUser.role === 'admin' || currentUser.role === 'hibrido');

            const btnApagarOuCadeado = (ehDelegada && !souGestor)
              ? `<button type="button" class="btn-icon-only" style="opacity: 0.5; cursor: not-allowed;" title="Tarefa Delegada (Bloqueada)"><i class="fa-solid fa-lock"></i></button>`
              : `<button type="button" onclick="deleteActivity(${a.id})" class="btn-icon-only delete" title="Apagar"><i class="fa-solid fa-trash"></i></button>`;

            const btnAnexos = (a.attachments && a.attachments.length > 0) || a.attachmentUrl
              ? `<button type="button" onclick="openAttachmentModal(${a.id})" class="btn-icon-only" title="Ver Anexos" style="margin-right: 5px; color: var(--color-info);"><i class="fa-solid fa-paperclip"></i></button>`
              : '';
            
            const btnHistorico = `<button type="button" onclick="openHistoryModal(${a.id})" class="btn-icon-only" title="Ver Histórico" style="margin-right: 5px;"><i class="fa-solid fa-clock-rotate-left"></i></button>`;
            
            const btnEditar = `<button type="button" onclick="openEditModal(${a.id})" class="btn-icon-only edit" title="Editar" style="margin-right: 5px;"><i class="fa-solid fa-pen"></i></button>`;

            return `<tr>${
              isAdmin
                ? `<td class="td-membro"><strong>${u ? u.name : 'Membro'}</strong></td>`
                : ''
            }
            <td class="td-data">${formatDate(a.date)}</td>
            <td class="td-categoria">
              <span class="badge" style="${getCategoryStyleString(a.category || 'Geral')}">
                  ${typeof formatCategoryName === 'function' ? formatCategoryName(a.category) : (a.category || 'Geral')}
              </span>
            </td>
            <td class="td-titulo"><strong>${a.title || 'Sem título'}</strong></td>
            <td class="td-detalhes">${a.description || '-'}</td>
            <td class="td-status">${getStatusBadge(a.status)}</td>
            <td class="td-acoes">
              <div style="display: flex; align-items: center;">
                ${btnHistorico}
                ${podeEditar ? `${btnAnexos}${btnEditar}${btnApagarOuCadeado}` : `<i class="fa-solid fa-lock" style="color:#CBD5E1;" title="Apenas Leitura"></i>`}
              </div>
            </td></tr>`;
          })
          .join('')}</tbody></table></div>`;
}

window.deleteActivity = function(id) {
db.collection('atividades').doc(id.toString()).get().then(docSnap => {
  if (!docSnap.exists) return;
  const ativ = docSnap.data();

  const ehDelegada = !!(ativ.tarefaVinculadaId || ativ.adminId || ativ.tipo === 'delegada');
  const souGestor = (currentUser.role === 'admin' || currentUser.role === 'hibrido');

  if (ehDelegada && !souGestor) {
      showToast("Esta atividade foi delegada e não pode ser excluída.", "error");
      return;
  }

  showConfirm(
    'Tem certeza que deseja apagar esta atividade permanentemente?',
    () => {
      db.collection('atividades').doc(id.toString()).delete().then(() => {
        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EXCLUIR_ATIVIDADE', `Apagou o registro: ${ativ.title || 'Sem título'}`);
        }
        if (ativ.tarefaVinculadaId) {
          db.collection('tarefas').doc(ativ.tarefaVinculadaId.toString()).delete().catch(err => console.error(err));
        }
        showToast('Atividade apagada com sucesso!');
        if (typeof refreshLiveData === 'function') refreshLiveData();
      });
    },
    'Apagar Atividade?'
  );
});
};

document.getElementById('editTaskForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const id = parseInt(document.getElementById('editTaskId').value);
  const newStatus = document.getElementById('editTaskStatus').value;
  const btn = document.getElementById('btnSaveEdit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Guardar...';

  const a = activities.find((x) => x.id === id);
  if (a) {
    const oldStatus = a.status;
    if (oldStatus !== newStatus) {
      if (!a.logs) a.logs = [];
      a.logs.push({
        date: new Date().toISOString(),
        userName: currentUser.name,
        from: oldStatus,
        to: newStatus,
      });
    }
    a.date = document.getElementById('editTaskDate').value;
    a.category = document.getElementById('editTaskCategory').value;
    a.title = document.getElementById('editTaskTitle').value;
    a.description = document.getElementById('editTaskDescription').value;
    a.status = newStatus;

    db.collection('atividades').doc(id.toString()).update(a).then(() => {
        if (window.registrarAcao) {
            window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'EDITAR_ATIVIDADE', `Editou a atividade: ${a.title}`);
        }
        showToast('Atividade atualizada!');
        closeEditModal();
      }).catch(() => {
        showToast('Erro ao salvar', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
      });
  }
});

// ============ 6. GESTÃO DE MODO ESCURO ============

window.syncThemeSwitchUI = function() {
  const chk = document.getElementById('chkDarkMode');
  const textElement = document.getElementById('themeSwitchText');
  const iconElement = document.getElementById('themeSwitchIcon');
  
  const isDark = document.body.classList.contains('dark-mode');

  if (chk) chk.checked = isDark;
  
  if (textElement) {
      textElement.innerText = isDark ? 'Modo Claro' : 'Modo Escuro';
      textElement.style.color = isDark ? '#f8fafc' : '#1e293b';
  }
  
  if (iconElement) {
      iconElement.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      iconElement.style.color = isDark ? '#fbbf24' : '#64748b';
  }
};

window.alternarModoEscuro = function(event) {
  const isDark = event.target.checked;
  
  if (isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('feedbackgo_dark_mode', 'true');
  } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('feedbackgo_dark_mode', 'false');
  }

  syncThemeSwitchUI();

  if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
      db.collection('usuarios').doc(currentUser.id.toString()).update({
          darkMode: isDark
      }).then(() => {
          currentUser.darkMode = isDark;
      }).catch(err => console.error("Erro ao salvar tema:", err));
  }
};

// Olheiro Automático para o Botão do Tema
const themeObserver = new MutationObserver(() => {
if (document.getElementById('chkDarkMode')) {
    themeObserver.disconnect(); 
    syncThemeSwitchUI();
    themeObserver.observe(document.body, { childList: true, subtree: true });
}
});
themeObserver.observe(document.body, { childList: true, subtree: true });

// ============ 7. CÉREBRO DE CORES (UI) ============
const assignedCategoryHues = {};
let colorCounter = 0;
function getCategoryHue(categoryName) {
if (!categoryName) return 200;
if (assignedCategoryHues[categoryName] !== undefined)
  return assignedCategoryHues[categoryName];
let newHue = Math.floor(colorCounter * 137.5) % 360;
assignedCategoryHues[categoryName] = newHue;
colorCounter++;
return newHue;
}
function getCategoryStyleString(categoryName) {
let hue = getCategoryHue(categoryName);
let textLightness = hue >= 40 && hue <= 200 ? '15%' : '35%';
return `--cat-hue: ${hue}; --txt-l: ${textLightness};`;
}

// ============ 8. SISTEMA DE CONFIRMAÇÃO & TOASTS ============
window.currentConfirmCallback = null;

window.showConfirm = function(message, callback, title = 'Atenção', btnText = 'Sim, Apagar', btnClass = 'btn-danger') {
    document.getElementById('confirmTitle').innerHTML = title; 
    document.getElementById('confirmMessage').innerHTML = message; 
    window.currentConfirmCallback = callback;
    
    // Altera dinamicamente o aspeto do botão de ação
    const actionBtn = document.getElementById('confirmActionBtn');
    if (actionBtn) {
        actionBtn.innerHTML = btnText;
        actionBtn.className = `btn btn-small ${btnClass}`; 
    }
    
    document.getElementById('confirmModal').classList.remove('hidden');
};

// A FUNÇÃO QUE FAZ O "CANCELAR" FUNCIONAR
window.closeConfirmModal = function() {
    document.getElementById('confirmModal').classList.add('hidden');
    window.currentConfirmCallback = null;
};

//  A FUNÇÃO QUE FAZ O "COMPRAR" FUNCIONAR
window.executeConfirmAction = function() {
    if (window.currentConfirmCallback) {
        window.currentConfirmCallback();
    }
    window.closeConfirmModal();
};

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${
        type === 'success' ? '#10b981' : '#ef4444'
    }"></i><div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
};

// ============ 9. MODAIS DE EDIÇÃO E HISTÓRICO ============
function openEditModal(id) {
const a = activities.find((x) => x.id === id);
if (!a) return;
if (currentUser.role === 'funcionario' && a.userId !== currentUser.id) {
  showToast('Acesso negado!', 'error');
  return;
}
const c = companies.find((x) => x.id === currentUser.companyId);
document.getElementById('editTaskCategory').innerHTML = typeof buildCategorySelectOptions === 'function' 
    ? buildCategorySelectOptions(c.categories || defaultCategories) 
    : (c.categories || defaultCategories).map((cat) => `<option value="${cat}">${cat}</option>`).join('');

document.getElementById('editTaskId').value = a.id;
document.getElementById('editTaskDate').value = a.date;
document.getElementById('editTaskCategory').value = a.category || 'Geral';
document.getElementById('editTaskTitle').value = a.title;
document.getElementById('editTaskDescription').value = a.description || '';
document.getElementById('editTaskStatus').value = a.status;
document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal() {
document.getElementById('editModal').classList.add('hidden');
const btn = document.getElementById('btnSaveEdit');
if (btn) {
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Alterações';
}
}

let currentHistoryOrder = 'asc'; 

function openHistoryModal(id) {
const a = activities.find((x) => x.id === id);
if (!a) return;

const content = document.getElementById('historyContent');
if (content) {
  content.innerHTML = `
    <div class="history-header-filter" style="margin-bottom: 20px; display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
      <span style="font-size: 12px; opacity: 0.8;">Ordem:</span>
      <select id="changeHistoryOrder" onchange="reOrderHistory(${id})" style="padding: 6px 10px; border-radius: 8px; font-size: 12px; background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); cursor: pointer;">
        <option value="asc" ${currentHistoryOrder === 'asc' ? 'selected' : ''}>Mais antigo para novo</option>
        <option value="desc" ${currentHistoryOrder === 'desc' ? 'selected' : ''}>Mais novo para antigo</option>
      </select>
    </div>
    <div id="logItemsList"></div>
  `;
  reOrderHistory(id);
}
document.getElementById('historyModal').classList.remove('hidden');
}

window.reOrderHistory = function(activityId) {
const a = activities.find((x) => x.id === activityId);
const order = document.getElementById('changeHistoryOrder').value;
currentHistoryOrder = order; 

const listContainer = document.getElementById('logItemsList');
let logs = a.logs ? [...a.logs] : [];

logs.sort((x, y) => {
  return order === 'asc' ? new Date(x.date) - new Date(y.date) : new Date(y.date) - new Date(x.date);
});

listContainer.innerHTML = logs.length > 0
  ? logs.map(log => `
      <div class="log-item"><div class="log-dot"></div><div class="log-content">
          <span class="log-time" style="display:block; font-size:11px; opacity:0.7;">${new Date(log.date).toLocaleString('pt-BR')}</span>
          <strong>${log.userName}</strong> alterou para <span style="text-transform:uppercase; font-weight:bold; font-size:10px;">${log.to}</span>
      </div></div>`).join('')
  : '<p style="text-align:center; padding:20px; opacity:0.6;">Nenhuma alteração registrada.</p>';
};

function closeHistoryModal() {
document.getElementById('historyModal').classList.add('hidden');
}

// ============ UTILS DIVERSOS ============
function getLocalToday() {
const d = new Date();
return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDate(ds) {
if (!ds) return '';
const p = ds.split('-');
return `${p[2]}/${p[1]}/${p[0]}`;
}
function getStatusBadge(s) {
const b = {
  concluido: '<span class="badge badge-concluido">Concluído</span>',
  andamento: '<span class="badge badge-andamento">Em Andamento</span>',
  pendente: '<span class="badge badge-pendente">Pendente</span>',
};
return b[s] || s;
}
function updateCurrentDate(id) {
const el = document.getElementById(id);
if (el) {
  let str = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  el.textContent = str.charAt(0).toUpperCase() + str.slice(1);
}
}
function setTodayDate(id) {
const el = document.getElementById(id);
if (el) el.value = getLocalToday();
}
function showNotice(id, msg, type) {
const el = document.getElementById(id);
if (!el) return;
el.innerHTML = msg;
el.className = `alert alert-${type}`;
el.classList.remove('hidden');
setTimeout(() => el.classList.add('hidden'), 5000);
}
window.initApp = function () { console.log('Core iniciado!'); };

// ============ MODAL DE ANEXOS ============
window.openAttachmentModal = function (activityId) {
const atividade = activities.find((x) => x.id === activityId);
if (!atividade) return;

const content = document.getElementById('attachmentContent');
let html = `<i class="fa-solid fa-folder-open" style="font-size: 48px; color: var(--color-info); margin-bottom: 15px;"></i>`;

if (atividade.attachments && atividade.attachments.length > 0) {
  html += `<p style="margin-bottom: 20px; font-size: 14px;">Esta atividade contém <strong>${atividade.attachments.length} anexo(s)</strong>:</p>
             <div style="display: flex; flex-direction: column; gap: 10px;">`;

  atividade.attachments.forEach((anexo) => {
    const isBase64 = anexo.url.startsWith('data:');
    const actionAttr = isBase64 ? `download="${anexo.name}"` : 'target="_blank"';
    html += `<a href="${anexo.url}" ${actionAttr} class="btn btn-info" style="display: flex; justify-content: space-between; align-items: center; text-align: left;">
                    <span style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${anexo.name}</span> 
                    <i class="fa-solid fa-download"></i>
                 </a>`;
  });
  html += `</div>`;
} else if (atividade.attachmentUrl) {
  const isBase64 = atividade.attachmentUrl.startsWith('data:');
  const actionAttr = isBase64 ? `download="${atividade.attachmentName || 'Anexo'}"` : 'target="_blank"';
  html += `<p style="margin-bottom: 20px; font-size: 14px;">Arquivo: <strong style="color: var(--color-text-primary);">${atividade.attachmentName || 'Anexo'}</strong></p>
             <a href="${atividade.attachmentUrl}" ${actionAttr} class="btn btn-info"><i class="fa-solid fa-download"></i> Baixar Anexo</a>`;
}

content.innerHTML = html;
document.getElementById('attachmentModal').classList.remove('hidden');
};

window.closeAttachmentModal = function () {
document.getElementById('attachmentModal').classList.add('hidden');
};

// ============ ROBÔ DE LIMPEZA GLOBAL (VERSÃO BLINDADA) ============
window.runAutoCleanup = function () {
if (!currentUser) return;
console.log('[Robô] Iniciando varredura...');

const umAnoAtras = new Date();
umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
const dataLimite = umAnoAtras.toISOString().split('T')[0];

const atividadesParaLimpar = activities.filter(
  (a) => a.companyId === currentUser.companyId && a.date <= dataLimite && (a.attachmentUrl || (a.attachments && a.attachments.length > 0))
);

if (atividadesParaLimpar.length > 0) {
  atividadesParaLimpar.forEach((a) => {
    const limpeza = {
      attachmentUrl: firebase.firestore.FieldValue.delete(),
      attachmentName: firebase.firestore.FieldValue.delete(),
      attachments: firebase.firestore.FieldValue.delete(),
      systemNote: 'Limpeza automática realizada em ' + new Date().toLocaleDateString(),
    };

    const docId = String(a.id);
    db.collection('atividades').doc(docId).update(limpeza).catch((err) => console.error('[Robô] Erro na ID ' + docId + ':', err));

    a.attachmentUrl = null;
    a.attachments = null;
    a.attachmentName = null;
  });
  if (typeof refreshLiveData === 'function') refreshLiveData();
}
};

// ============ MENU MOBILE (HAMBÚRGUER) ============
window.toggleMobileMenu = function() {
document.querySelectorAll('.sidebar-nav, .sidebar-footer').forEach(el => {
    el.classList.toggle('open');
});
};

document.addEventListener('click', function(e) {
if (e.target.closest('.nav-item')) {
    document.querySelectorAll('.sidebar-nav, .sidebar-footer').forEach(el => el.classList.remove('open'));
} else if (!e.target.closest('.sidebar-nav') && !e.target.closest('.sidebar-footer') && !e.target.closest('.mobile-menu-toggle')) {
    document.querySelectorAll('.sidebar-nav, .sidebar-footer').forEach(el => {
        if (el.classList.contains('open')) el.classList.remove('open');
    });
}
});

// =======================================================
// LÓGICA DE INSTALAÇÃO DO APLICATIVO (PWA)
// =======================================================
let deferredPrompt;
const installBanner = document.getElementById('pwa-install-banner');
const installBtn = document.getElementById('pwa-install-btn');
const closeBtn = document.getElementById('pwa-close-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (window.innerWidth <= 768 && installBanner) {
      installBanner.style.display = 'flex';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
      installBanner.style.display = 'none';
      if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          deferredPrompt = null;
      }
  });
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => installBanner.style.display = 'none');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {});
}

// =======================================================
// MOTOR PULL-TO-REFRESH (VERSÃO MOBILE FINAL)
// =======================================================
(function() {
let startY = 0;
let isPulling = false;
const el = document.getElementById('pull-to-refresh');

window.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (!isPulling || !el) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY;

    if (diff > 0 && diff < 150) {
        const moveY = -100 + diff; 
        el.style.transform = `translateY(${moveY}px)`;
        if (diff > 80) el.classList.add('ptr-flip');
        else el.classList.remove('ptr-flip');
    }
}, { passive: true });

window.addEventListener('touchend', async () => {
  if (!isPulling) return;
  isPulling = false;

  if(!el) return;
  el.style.transition = 'transform 0.3s cubic-bezier(0, 0, 0.2, 1)';
  const diff = el.getBoundingClientRect().top + 120;

  if (diff > 80) {
      const icon = el.querySelector('.ptr-icon');
      const spinner = el.querySelector('.ptr-spinner');

      if (icon) icon.style.display = 'none';
      if (spinner) spinner.style.display = 'block';
      
      el.style.transform = `translateY(20px)`;
      if (navigator.vibrate) navigator.vibrate(10); 

      const palco = document.getElementById('adminConteudoDinamico') || document.getElementById('funcConteudoDinamico');
      if (palco) palco.style.opacity = '0.3'; 

      setTimeout(() => {
          if (typeof refreshLiveData === 'function') refreshLiveData();
          if (document.getElementById('periodReport') && typeof generateReport === 'function') generateReport();

          if (palco) palco.style.opacity = '1';

          el.style.transform = `translateY(-120px)`;
          setTimeout(() => {
              if (icon) icon.style.display = 'block';
              if (spinner) spinner.style.display = 'none';
              el.classList.remove('ptr-flip');
          }, 300);
      }, 500); 
  } else {
      el.style.transform = `translateY(-120px)`;
  }
});
})();

// ============ SISTEMA DE SUB-CATEGORIAS ============
window.buildCategorySelectOptions = function(categoriesArray) {
  let groups = {};
  categoriesArray.forEach(cat => {
      let g = "Outros"; 
      let sub = cat;
      if(cat.includes('::')) {
          let parts = cat.split('::');
          g = parts[0].trim();
          sub = parts[1].trim();
      }
      if(!groups[g]) groups[g] = [];
      groups[g].push({ full: cat, sub: sub });
  });

  let html = '';
  for (let g in groups) {
      html += `<optgroup label="${g}">`;
      groups[g].forEach(item => html += `<option value="${item.full}">${item.sub}</option>`);
      html += `</optgroup>`;
  }
  return html;
};

window.formatCategoryName = function(catString) {
if (!catString) return 'Geral';
return catString.replace('::', ' <i class="fa-solid fa-chevron-right" style="font-size:9px; opacity:0.6; margin: 0 4px;"></i> ');
};

// ==========================================
// REGISTRO DE AUDITORIA E STATUS ONLINE
// ==========================================
window.registrarAcao = function(userId, companyId, userName, acao, detalhes) {
const dataLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();

db.collection('acessos').add({
    userId: userId,
    companyId: companyId,
    userName: userName,
    acao: acao,
    detalhes: detalhes,
    timestamp: dataLocal 
}).then(() => {
    db.collection('usuarios').doc(userId.toString()).update({ isOnline: true }).catch(()=>{});
}).catch(err => console.error("Erro ao registrar ação:", err));
};

// =======================================================
// INICIALIZADOR AUTOMÁTICO DE CALENDÁRIOS PREMIUM
// =======================================================
const observerCalendario = new MutationObserver(() => {
if (typeof flatpickr !== 'undefined') {
    const datas = document.querySelectorAll('input[type="date"]:not(.flatpickr-input)');
    if (datas.length > 0) {
        flatpickr(datas, {
            locale: "pt", 
            altInput: true,         
            altFormat: "d/m/Y",     
            dateFormat: "Y-m-d",    
            disableMobile: true     
        });
    }
}
});
window.addEventListener('DOMContentLoaded', () => {
observerCalendario.observe(document.body, { childList: true, subtree: true });
});

// =======================================================
// =================== RANKING MENSAL ====================
// =======================================================
window.renderRankingMensal = function(containerId) {
const container = document.getElementById(containerId);
if (!container) return;

const parentCard = container.closest('.card');
if (parentCard) {
    parentCard.style.background = 'transparent';
    parentCard.style.border = 'none';
    parentCard.style.boxShadow = 'none';
    parentCard.style.padding = '0';
}

const hoje = new Date();
const mesAtual = hoje.getMonth();
const anoAtual = hoje.getFullYear();

const atividadesMes = activities.filter(a => {
    if (a.companyId !== currentUser.companyId || !a.xpEarned || !a.date) return false;
    const dataAtiv = new Date(a.date);
    return dataAtiv.getMonth() === mesAtual && dataAtiv.getFullYear() === anoAtual;
});

const xpPorUsuario = {};
atividadesMes.forEach(a => {
    xpPorUsuario[a.userId] = (xpPorUsuario[a.userId] || 0) + a.xpEarned;
});

let ranking = Object.keys(xpPorUsuario).map(userId => {
  const u = users.find(x => x.id == userId);
  
  let avatarVisual = '?';
  if (u) {
      if (u.avatarUrl) {
          avatarVisual = `<img src="${u.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
          avatarVisual = u.name.charAt(0).toUpperCase();
      }
  }

  return {
      userId: parseInt(userId),
      nome: u ? u.name.split(' ')[0] : 'Membro',
      xp: xpPorUsuario[userId],
      avatar: avatarVisual
  };
}).sort((a, b) => b.xp - a.xp).slice(0, 5);

const c = companies.find(x => x.id === currentUser.companyId);
const regras = (c && c.gamificacao) ? c.gamificacao : {};
const premios = [
    regras.premioTop1 || 500, regras.premioTop2 || 400, 
    regras.premioTop3 || 300, regras.premioTop4 || 200, regras.premioTop5 || 100
];

let html = `
<div style="background: var(--color-bg-secondary); border-radius: 16px; border: 1px solid var(--color-border); padding: 25px 15px 0 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); font-family: sans-serif; overflow-x: auto;">
    <h3 style="margin: 0 0 20px 10px; font-size: 16px; font-weight: 700; color: var(--color-text-primary);"><i class="fa-solid fa-trophy" style="color: #fbbf24;"></i> Pódio Mensal</h3>
    
    <div style="min-width: 480px;"> <div style="display: grid; grid-template-columns: repeat(5, 1fr); align-items: end; gap: 4px; border-bottom: 4px solid var(--color-border); padding-bottom: 0; min-height: 280px;">
`;

const posicoes = [
    { user: ranking[3], label: '4º', h: '90px', bg: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)', corTxt: '#1e3a8a', idxCoins: 3 },
    { user: ranking[1], label: '2º', h: '140px', bg: 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%)', corTxt: '#1e293b', idxCoins: 1 },
    { user: ranking[0], label: '1º', h: '170px', bg: 'linear-gradient(180deg, #fde68a 0%, #fbbf24 100%)', corTxt: '#78350f', crown: true, idxCoins: 0 },
    { user: ranking[2], label: '3º', h: '120px', bg: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)', corTxt: '#fff', idxCoins: 2 },
    { user: ranking[4], label: '5º', h: '60px', bg: 'linear-gradient(180deg, #34d399 0%, #10b981 100%)', corTxt: '#064e3b', idxCoins: 4 }
];

posicoes.forEach((col) => {
    if (col.user) {
        html += `
        <div style="display: flex; flex-direction: column; align-items: center; position: relative;">
            ${col.crown ? '<i class="fa-solid fa-crown" style="color: #fbbf24; font-size: 32px; margin-bottom: -5px; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>' : ''}
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--color-bg-primary); border: 3px solid ${col.bg.split(' ')[2]}; color: var(--color-text-primary); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; z-index: 2; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">${col.user.avatar}</div>
            <div style="font-size: 13px; font-weight: 800; margin: 8px 0 2px 0; color: var(--color-text-primary); text-align: center; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${col.user.nome}</div>
            <div style="font-size: 12px; font-weight: 900; color: var(--color-primary); margin-bottom: 2px;">${col.user.xp} XP</div>
            <div style="font-size: 10px; font-weight: 700; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 2px 6px; border-radius: 6px; margin-bottom: 8px;">+${premios[col.idxCoins]} <i class="fa-solid fa-coins"></i></div>
            <div style="height: ${col.h}; width: 100%; background: ${col.bg}; border-radius: 8px 8px 0 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 10px; color: ${col.corTxt}; font-size: 28px; font-weight: 900; box-shadow: inset 0 2px 5px rgba(255,255,255,0.4), 0 -2px 10px rgba(0,0,0,0.1);">${col.label}</div>
        </div>`;
    } else {
        html += `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
            <div style="height: ${col.h}; width: 100%; background: rgba(0,0,0,0.02); border-radius: 8px 8px 0 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 10px; color: rgba(0,0,0,0.1); font-size: 24px; font-weight: 900; border: 2px dashed var(--color-border); border-bottom: none;">${col.label}</div>
        </div>`;
    }
});

html += `</div></div></div>`;
container.innerHTML = html;
};

// =======================================================
// CONTROLE DE VISIBILIDADE DA GAMIFICAÇÃO
// =======================================================
window.aplicarVisibilidadeGamificacao = function() {
if (!currentUser) return;
const c = companies.find(x => x.id === currentUser.companyId);
const gamiAtiva = c && c.gamificationEnabled === true;

document.querySelectorAll('.nav-item[onclick*="store"]').forEach(el => {
    el.style.display = gamiAtiva ? 'flex' : 'none';
});

const barraXp = document.getElementById('xpProgressBar');
if (barraXp) {
    const cartaoXp = barraXp.closest('.card');
    if (cartaoXp) cartaoXp.style.display = gamiAtiva ? 'flex' : 'none';
}

['rankingFuncContainer', 'rankingAdminContainer'].forEach(id => {
    const container = document.getElementById(id);
    if (container) {
        const cartaoRanking = container.closest('.card');
        if (cartaoRanking) cartaoRanking.style.display = gamiAtiva ? 'block' : 'none';
    }
});

const cardStatusFunc = document.getElementById('cardStatusFuncionario');
if (cardStatusFunc) cardStatusFunc.style.display = gamiAtiva ? 'flex' : 'none';

const cardRankFunc = document.getElementById('cardRankingFuncionario');
if (cardRankFunc) cardRankFunc.style.display = gamiAtiva ? 'block' : 'none';

const cardRankAdmin = document.getElementById('cardRankingAdmin');
if (cardRankAdmin && cardRankAdmin.parentNode) {
    cardRankAdmin.parentNode.style.display = gamiAtiva ? 'block' : 'none';
}

const boxDif = document.getElementById('boxDificuldadeGamificacao');
if (boxDif) boxDif.style.display = gamiAtiva ? 'block' : 'none';
};

const observerTelas = new MutationObserver(() => aplicarVisibilidadeGamificacao());
document.addEventListener("DOMContentLoaded", () => {
observerTelas.observe(document.body, { childList: true, subtree: true });
});

// ==========================================
// CATÁLOGO DE GIFT CARDS E ORÇAMENTO MENSAL
// ==========================================
window.apiGiftCardsCatalog = [
  {
      id: 'uber', name: 'Uber (Uber Cash)', 
      bgColor: '#000000', logoUrl: 'https://cdn.simpleicons.org/uber/ffffff', fallbackIcon: 'fa-brands fa-uber',
      descricao: 'Créditos para viagens ou compras no app.',
      options: [ { brl: 25, sku: 'UBER-25' }, { brl: 50, sku: 'UBER-50' }, { brl: 100, sku: 'UBER-100' } ]
  },
  {
      id: 'netflix', name: 'Netflix', 
      bgColor: '#000000', logoUrl: 'https://cdn.simpleicons.org/netflix/E50914', fallbackIcon: 'fa-solid fa-film',
      descricao: 'Assinatura para filmes e séries.',
      options: [ { brl: 35, sku: 'NETFLIX-35' }, { brl: 50, sku: 'NETFLIX-50' } ]
  },
  {
      id: 'spotify', name: 'Spotify Premium', 
      bgColor: '#1ED760', logoUrl: 'https://cdn.simpleicons.org/spotify/ffffff', fallbackIcon: 'fa-brands fa-spotify',
      descricao: 'Música sem anúncios e offline.',
      options: [ { brl: 17, sku: 'SPOTIFY-17' }, { brl: 35, sku: 'SPOTIFY-35' }, { brl: 50, sku: 'SPOTIFY-50' } ]
  },
  {
      id: 'xbox', name: 'Xbox', 
      bgColor: '#107C10', logoUrl: '', fallbackIcon: 'fa-brands fa-xbox', 
      descricao: 'Jogos, DLCs ou assinatura Game Pass.',
      options: [ { brl: 50, sku: 'XBOX-50' }, { brl: 100, sku: 'XBOX-100' } ]
  },
  {
      id: 'playstation', name: 'PlayStation', 
      bgColor: '#00439C', logoUrl: 'https://cdn.simpleicons.org/playstation/ffffff', fallbackIcon: 'fa-brands fa-playstation',
      descricao: 'Créditos na PSN Store ou PS Plus.',
      options: [ { brl: 30, sku: 'PSN-30' }, { brl: 50, sku: 'PSN-50' }, { brl: 100, sku: 'PSN-100' } ]
  },
  {
      id: 'steam', name: 'Steam', 
      bgColor: '#163E58', logoUrl: 'https://cdn.simpleicons.org/steam/ffffff', fallbackIcon: 'fa-brands fa-steam',
      descricao: 'Jogos para PC na maior loja do mundo.',
      options: [ { brl: 30, sku: 'STEAM-30' }, { brl: 50, sku: 'STEAM-50' }, { brl: 100, sku: 'STEAM-100' } ]
  },
  {
      id: 'googleplay', name: 'Google Play', 
      bgColor: '#FFFFFF', logoUrl: 'https://helios-i.mashable.com/imagery/articles/06YkoiA6HHEVTWDiXFiFsw4/hero-image.fill.size_1248x702.v1658745007.png', fallbackIcon: 'fa-brands fa-google-play',
      descricao: 'Apps, jogos, filmes e livros para Android.',
      options: [ { brl: 15, sku: 'GPLAY-15' }, { brl: 30, sku: 'GPLAY-30' }, { brl: 50, sku: 'GPLAY-50' } ]
  },
  {
      id: 'apple', name: 'App Store', 
      bgColor: '#1CAEF7', logoUrl: 'https://cdn.simpleicons.org/apple/ffffff', fallbackIcon: 'fa-brands fa-apple',
      descricao: 'Apps, jogos, iCloud e Apple Music.',
      options: [ { brl: 20, sku: 'APPLE-20' }, { brl: 50, sku: 'APPLE-50' } ]
  },
  {
    id: 'zedelivery', name: 'Zé Delivery', 
    bgColor: '#FECE1D', 
    logoUrl: 'https://brandlogos.net/wp-content/uploads/2025/11/ze_delivery-logo_brandlogos.net_ubfml.png', 
    fallbackIcon: 'fa-solid fa-beer-mug-empty',
    descricao: 'Bebidas geladas entregues em minutos.',
    options: [ { brl: 30, sku: 'ZE-30' }, { brl: 50, sku: 'ZE-50' } ]
  },
  {
    id: 'outback', name: 'Outback', 
    bgColor: '#FCAC4F', 
    logoUrl: 'https://logodownload.org/wp-content/uploads/2016/09/outback-logo-1.png', 
    fallbackIcon: 'fa-solid fa-utensils',
    descricao: 'Aproveite o melhor do Outback Steakhouse.',
    options: [ { brl: 50, sku: 'OUTBACK-50' }, { brl: 100, sku: 'OUTBACK-100' } ]
  },
  {
    id: 'cacaushow', name: 'Cacau Show', 
    bgColor: '#ffffff', 
    logoUrl: 'https://logodownload.org/wp-content/uploads/2017/07/cacau-show-logo-16.png', 
    fallbackIcon: 'fa-solid fa-cookie-bite',
    descricao: 'Chocolates deliciosos para o seu dia.',
    options: [ { brl: 30, sku: 'CACAU-30' }, { brl: 50, sku: 'CACAU-50' } ]
  },
  {
      id: 'roblox', name: 'Roblox (Robux)', 
      bgColor: '#000000', logoUrl: 'https://cdn.simpleicons.org/roblox/ffffff', fallbackIcon: 'fa-solid fa-gamepad',
      descricao: 'Moeda virtual para o universo Roblox.',
      options: [ { brl: 25, sku: 'ROBUX-25' }, { brl: 50, sku: 'ROBUX-50' } ]
  }
];

window.verificarViradaDeMesOrcamento = async function(companyId) {
const c = companies.find(x => String(x.id) === String(companyId));
if (!c) return;

const mesAtual = new Date().toISOString().slice(0, 7); 

if (c.lastBudgetMonth !== mesAtual) {
    try {
        await db.collection('empresas').doc(String(c.id)).update({
            spentThisMonth: 0,
            lastBudgetMonth: mesAtual
        });
        c.spentThisMonth = 0;
        c.lastBudgetMonth = mesAtual;
        console.log("Orçamento da empresa resetado para o novo mês.");
    } catch(e) { console.error("Erro ao virar o mês:", e); }
}
};

// =======================================================
// MOTOR DE NOTIFICAÇÕES NATIVAS (CELULAR E PC)
// =======================================================

// 1. Pede autorização para enviar notificações
window.solicitarPermissaoNotificacao = function() {
  if (!("Notification" in window)) {
      console.log("Este navegador não suporta notificações nativas.");
      return;
  }
  if (Notification.permission !== "denied" && Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
              console.log("Permissão para notificações concedida!");
          }
      });
  }
};

// 2. O Radar que fica à escuta de mensagens novas no Firebase
window.iniciarRadarNotificacoes = function() {
  if (!currentUser) return;

  // Guarda a hora exata do login (em milissegundos)
  const horaLogin = new Date().getTime();
  let primeiraLeitura = true;

  // Tiramos o ">= createdAt" para não quebrar o Firebase sem índice
  db.collection('notificacoes')
    .where('userId', '==', currentUser.id)
    .onSnapshot(snap => {
        
        // Se for a primeira vez que a página carrega, apenas ignora as antigas
        if (primeiraLeitura) {
            primeiraLeitura = false;
            return;
        }

        // Nas próximas vezes, se algo for ADICIONADO, ele lê
        snap.docChanges().forEach(change => {
            if (change.type === 'added') {
                const notif = change.doc.data();
                const horaNotificacao = new Date(notif.createdAt).getTime();
                
                // Só apita se a notificação foi criada AGORA (depois do login)
                if (horaNotificacao > horaLogin) {
                    dispararNotificacaoNativa(notif.titulo, notif.mensagem);
                }
            }
        });
    }, err => {
        console.error("Erro no radar de notificações:", err);
    });
};

// 3. A função que faz o celular apitar de verdade!
window.dispararNotificacaoNativa = function(titulo, mensagem) {
  // Se ele autorizou, manda o Push Nativo
  if (Notification.permission === "granted") {
      const n = new Notification(titulo, {
          body: mensagem,
          icon: 'https://cdn-icons-png.flaticon.com/512/5661/5661092.png', // Ícone de presente genérico
          vibrate: [200, 100, 200] // Faz o celular vibrar!
      });
      
      // Se clicar na notificação, foca na tela do app
      n.onclick = function() {
          window.focus();
          n.close();
      };
  } else {
      // Se ele não autorizou o push do celular, mostra pelo menos o Toast verde na tela
      showToast(`🔔 ${titulo}: ${mensagem}`, 'success');
  }
};

// =======================================================
// MOTOR DE NOTIFICAÇÕES NATIVAS, SININHO E DEEP LINKING
// =======================================================

window.todasNotificacoesCache = []; // Guarda a lista completa em memória

window.solicitarPermissaoNotificacao = function() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "denied" && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
};

window.dispararNotificacaoNativa = function(titulo, mensagem, acaoAlvo, notifId) {
  if (Notification.permission === "granted") {
    const n = new Notification(titulo, {
      body: mensagem,
      icon: 'icon-512.png', // O seu logo
      vibrate: [200, 100, 200] 
  });
      n.onclick = function() { 
          window.focus(); 
          n.close(); 
          // 🔥 NOVO: Passa o ID da notificação para o Roteador!
          if(acaoAlvo) window.abrirAbaPelaNotificacao(acaoAlvo, notifId); 
      };
  } else {
      showToast(`🔔 ${titulo}: ${mensagem}`, 'success');
  }
};

// Navegação Inteligente (Deep Linking) Blindada + Marca como Lida
window.abrirAbaPelaNotificacao = function(alvo, notifId) {
  // 🔥 NOVO: Se tivermos o ID, marcamos a notificação como lida no banco de dados
  if (notifId && notifId !== 'undefined' && notifId !== 'null') {
      db.collection('notificacoes').doc(String(notifId)).update({ lida: true }).catch(e => console.error("Erro ao marcar lida:", e));
  }

  // 1. Se for uma notificação antiga, avisa na tela e não tenta navegar
  if (!alvo || alvo === 'undefined' || alvo === 'null') {
      if (typeof showToast === 'function') showToast('Esta notificação é antiga e não possui atalho.', 'warning');
      return;
  }
  
  // 2. Fecha menus abertos para limpar a tela
  document.querySelectorAll('.notifDropdown').forEach(d => d.style.display = 'none');

  // 3. Verifica o cargo e joga para a tela correta
  const modoAtual = currentUser.role === 'hibrido' ? localStorage.getItem('feedbackgo_modo_hibrido') : currentUser.role;
  
  try {
      if (modoAtual === 'admin') {
          if (typeof showAdminSection === 'function') showAdminSection(alvo);
      } else {
          if (typeof showEmployeeSection === 'function') showEmployeeSection(alvo);
      }
  } catch(e) {
      console.error("Erro ao redirecionar:", e);
  }
};

window.construirSininhoUI = function() {
  if (document.querySelector('.notificationBox')) return; 

  const notifHTML = `
  <style>
      .notif-scroll-hidden::-webkit-scrollbar { display: none; }
      .notif-scroll-hidden { -ms-overflow-style: none; scrollbar-width: none; }
      .notif-item-hover:hover { background: rgba(0,0,0,0.05) !important; }
      .dark-mode .notif-item-hover:hover { background: rgba(255,255,255,0.05) !important; }
  </style>
  
  <div class="notificationBox" style="position: absolute; right: 15px; top: 15px; z-index: 999;">
      <button onclick="toggleNotifMenu(this)" style="background: transparent; border: none; width: 40px; height: 40px; cursor: pointer; position: relative; color: var(--color-text-secondary); transition: 0.2s;">
          <i class="fa-solid fa-bell" style="font-size: 22px;"></i>
          <span class="notifBadge" style="position: absolute; top: 0px; right: 0px; background: var(--color-danger); color: white; font-size: 10px; font-weight: bold; width: 18px; height: 18px; border-radius: 50%; display: none; align-items: center; justify-content: center; border: 2px solid var(--color-bg-secondary); box-shadow: 0 2px 5px rgba(0,0,0,0.2);">0</span>
      </button>
      
      <div class="notifDropdown" style="display: none; position: absolute; bottom: 50px; left: 0px; width: 320px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 12px; box-shadow: 0 -10px 30px rgba(0,0,0,0.3); flex-direction: column; overflow: hidden;">
          <div style="padding: 15px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; background: var(--color-bg-secondary); z-index: 2;">
              <h4 style="margin: 0; font-size: 15px;"><i class="fa-solid fa-bell" style="color: var(--color-primary);"></i> Notificações</h4>
              <button onclick="marcarNotificacoesComoLidas()" style="background: transparent; border: none; color: var(--color-primary); font-size: 12px; cursor: pointer; font-weight: bold; transition: opacity 0.2s;">Marcar Lidas</button>
          </div>
          
          <div class="notifList notif-scroll-hidden" style="display: flex; flex-direction: column; max-height: 400px; overflow-y: auto;">
              <p style="padding: 20px; text-align: center; opacity: 0.6; font-size: 13px;">A carregar dados...</p>
          </div>
      </div>
  </div>`;
  
  const footers = document.querySelectorAll('.sidebar-footer');
  footers.forEach(footer => {
      footer.style.position = 'relative'; 
      footer.insertAdjacentHTML('beforeend', notifHTML);
  });

  document.addEventListener('click', (e) => {
      if (!e.target.closest('.notificationBox')) {
          document.querySelectorAll('.notifDropdown').forEach(drop => drop.style.display = 'none');
      }
  });
};

window.iniciarRadarNotificacoes = function() {
  if (!currentUser) return;

  construirSininhoUI(); 
  const horaLogin = new Date().getTime();
  let primeiraLeitura = true;

  db.collection('notificacoes')
    .where('userId', '==', currentUser.id)
    .onSnapshot(snap => {
        let lista = [];
        let naoLidas = 0;

        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            lista.push(data);
            if (data.lida !== true) naoLidas++;
        });

        window.todasNotificacoesGlobais = lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        document.querySelectorAll('.notifBadge').forEach(badge => {
            badge.innerText = naoLidas;
            badge.style.display = naoLidas > 0 ? 'flex' : 'none';
        });

        let htmlLista = '';
        if (window.todasNotificacoesGlobais.length === 0) {
            htmlLista = '<p style="padding: 30px 20px; text-align: center; opacity: 0.5; font-size: 13px; margin:0;"><i class="fa-regular fa-bell" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>Sem novas mensagens.</p>';
        } else {
            htmlLista = window.todasNotificacoesGlobais.map(n => {
                const cursorStyle = n.acaoAlvo ? 'cursor: pointer;' : 'cursor: default;';
                const hoverClass = n.acaoAlvo ? 'notif-item-hover' : '';
                
                let tagPerfil = '';
                  if (currentUser.role === 'hibrido') {
                      // Verifica se o título da notificação é típico de ações que o Gestor recebe
                      const isAdminMsg = ['Entregue', 'Pedido', 'Resgate', 'Interno'].some(palavra => n.titulo.includes(palavra)) || n.acaoAlvo === 'delegar';
                      
                      if (isAdminMsg) {
                          // Etiqueta ROXA para o modo Admin
                          tagPerfil = `<span style="font-size: 9px; background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); padding: 2px 6px; border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Admin</span>`;
                      } else {
                          // Etiqueta AMARELA (Âmbar) para o modo Colaborador
                          tagPerfil = `<span style="font-size: 9px; background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 6px; border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Colaborador</span>`;
                      }
                  }

                return `
                <div class="${hoverClass}" onclick="window.abrirAbaPelaNotificacao('${n.acaoAlvo}', '${n.id}')" style="padding: 15px; border-bottom: 1px solid var(--color-border); background: ${n.lida ? 'transparent' : 'rgba(16, 185, 129, 0.05)'}; ${cursorStyle} transition: background 0.2s;">
                    <div style="font-size: 10px; color: var(--color-text-secondary); margin-bottom: 5px;">${new Date(n.createdAt).toLocaleString('pt-BR')}</div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 10px;">
                        <strong style="font-size: 13px; color: var(--color-text-primary);">${n.titulo}</strong>
                        ${tagPerfil}
                    </div>
                    
                    <p style="margin: 0; font-size: 12px; color: var(--color-text-secondary); line-height: 1.4;">${n.mensagem}</p>
                </div>`;
            }).join('');
        }

        document.querySelectorAll('.notifList').forEach(listContainer => {
            listContainer.innerHTML = htmlLista;
        });

        if (!primeiraLeitura) {
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const notif = change.doc.data();
                    const horaNotificacao = new Date(notif.createdAt).getTime();
                    if (horaNotificacao > horaLogin) {
                        dispararNotificacaoNativa(notif.titulo, notif.mensagem, notif.acaoAlvo, change.doc.id);
                    }
                }
            });
        }
        primeiraLeitura = false;
    }, err => console.error(err));
};

window.abrirModalTodasNotificacoes = function() {
  document.querySelectorAll('.notifDropdown').forEach(drop => drop.style.display = 'none');
  if (document.getElementById('modalTodasNotificacoes')) return;

  // 🔥 O ESCUDO PROTETOR: Se a lista global não estiver pronta, assume uma lista vazia ([])
  const listaGlobal = window.todasNotificacoesGlobais || [];
  
  let listaHTML = '';
  
  // Agora o .length nunca vai falhar
  if (listaGlobal.length === 0) {
      listaHTML = '<div style="padding: 40px; text-align: center; opacity: 0.5;"><i class="fa-regular fa-bell-slash" style="font-size: 40px; margin-bottom: 15px;"></i><p>A sua caixa de entrada está limpa.</p></div>';
  } else {
      listaHTML = listaGlobal.map(n => {
          const cursorStyle = n.acaoAlvo ? 'cursor: pointer;' : 'cursor: default;';
          const hoverClass = n.acaoAlvo ? 'notif-item-hover' : '';
          return `
          <div class="${hoverClass}" onclick="window.abrirAbaPelaNotificacao('${n.acaoAlvo}')" style="padding: 15px 20px; border-bottom: 1px solid var(--color-border); background: ${n.lida ? 'transparent' : 'rgba(16, 185, 129, 0.05)'}; ${cursorStyle} transition: background 0.2s; display: flex; align-items: flex-start; gap: 15px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${n.lida ? 'transparent' : 'var(--color-primary)'}; margin-top: 6px; flex-shrink: 0;"></div>
              <div style="flex-grow: 1;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <strong style="font-size: 14px; color: var(--color-text-primary);">${n.titulo}</strong>
                      <span style="font-size: 11px; color: var(--color-text-secondary); opacity: 0.8;">${new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <p style="margin: 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.4;">${n.mensagem}</p>
              </div>
          </div>`;
      }).join('');
  }

  const overlayHTML = `
      <div id="modalTodasNotificacoes" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px);">
          <div class="modal-content" style="width: 90%; max-width: 500px; height: 80vh; max-height: 700px; display: flex; flex-direction: column; padding: 0; overflow: hidden; background: var(--color-bg-primary); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              <div class="modal-header" style="padding: 20px 25px; border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary); position: relative;">
                  <h2 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-inbox" style="color: var(--color-primary);"></i> Histórico Completo</h2>
                  <button onclick="document.getElementById('modalTodasNotificacoes').remove()" style="position: absolute; right: 20px; top: 15px; font-size: 24px; background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; transition: 0.2s;">&times;</button>
              </div>
              <div class="notif-scroll-hidden" style="overflow-y: auto; flex-grow: 1; padding-bottom: 20px;">
                  ${listaHTML}
              </div>
          </div>
      </div>
      <style>
          .notif-item-hover:hover { background: rgba(0,0,0,0.05) !important; }
          .dark-mode .notif-item-hover:hover { background: rgba(255,255,255,0.05) !important; }
      </style>
  `;
  
  document.body.insertAdjacentHTML('beforeend', overlayHTML);
};

window.toggleNotifMenu = function(btn) {
    const drop = btn.nextElementSibling;
    const isHidden = drop.style.display === 'none';
    document.querySelectorAll('.notifDropdown').forEach(d => d.style.display = 'none');
    if (isHidden) drop.style.display = 'flex';
};

window.marcarNotificacoesComoLidas = function() {
    db.collection('notificacoes').where('userId', '==', currentUser.id).get().then(snap => {
        const batch = db.batch();
        let contador = 0;
        snap.forEach(doc => {
            if (doc.data().lida !== true) {
                batch.update(doc.ref, { lida: true });
                contador++;
            }
        });
        if(contador > 0) batch.commit();
    });
};