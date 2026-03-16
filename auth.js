// ============ LÓGICA DE AUTENTICAÇÃO E LOGIN ============

// ==========================================
// 1. AUTO-LOGIN E CORTINA DE CARREGAMENTO
// ==========================================
window.processAutoLogin = function() {
  const savedUserId = localStorage.getItem('feedbackgo_logged_user');
  
  if (savedUserId) {
    const autoUser = users.find(
      (u) => String(u.id) === String(savedUserId) && u.active
    );
    
    if (autoUser) {
      currentUser = autoUser;

      // === APLICA O MODO ESCURO ===
      const prefEscuro = currentUser.darkMode === true;
      if (prefEscuro) {
          document.body.classList.add('dark-mode');
          localStorage.setItem('feedbackgo_dark_mode', 'true');
      } else {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('feedbackgo_dark_mode', 'false');
      }

      // Sincroniza a chave (Switch) se ela já existir na tela
      setTimeout(() => {
          const toggle = document.getElementById('chkDarkMode');
          if (toggle) toggle.checked = prefEscuro;
      }, 500);

      // === REMOVE A CORTINA (SPLASH) COM ANIMAÇÃO ===
      const splash = document.getElementById('splashLoadingGlobal');
      if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 400);
      }

      // Atualiza status online no banco
      db.collection('usuarios').doc(currentUser.id.toString()).update({ isOnline: true }).catch(() => {});

      // Abre o painel correto
      if (typeof showPanel === 'function') {
          showPanel(currentUser.role);
      }
      return; 
    }
  }

  // === SE NÃO HOUVER USUÁRIO (MOSTRA O LOGIN) ===
  const splash = document.getElementById('splashLoadingGlobal');
  if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
  }

  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) {
      loginScreen.style.display = 'flex';
      loginScreen.classList.remove('hidden');
  }
};

// ==========================================
// 2. REGISTRO DE NOVA EMPRESA
// ==========================================
document.getElementById('registerForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const em = document.getElementById('adminEmail').value.trim();
  if (users.find((u) => u.email === em))
      return showNotice('registerAlert', 'E-mail já em uso.', 'error');

  const btn = document.getElementById('registerBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Criar...';
  btn.disabled = true;

  const nComp = {
    id: nextCompanyId,
    name: document.getElementById('companyName').value.trim(),
    accessCode: 'EMP-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
    createdAt: new Date().toISOString(),
    teams: ['Equipe Geral'],
    categories: [...defaultCategories],
    companyBank: 0,
    gamificationEnabled: false,
    // === CONTROLE DE ORÇAMENTO DA LOJA ===
    monthlyBudget: 500, // Limite padrão em Reais (R$)
    spentThisMonth: 0,  // Quanto já foi gasto neste mês
    lastBudgetMonth: new Date().toISOString().slice(0, 7) // Formato "YYYY-MM"
  };

  const nUser = {
      id: nextUserId,
      companyId: nComp.id,
      name: document.getElementById('adminName').value.trim(),
      email: em,
      password: document.getElementById('adminPassword').value,
      role: 'admin',
      active: true,
      team: 'Administração',
  };

  // Salva direto nas coleções do Firebase
  Promise.all([
      db.collection('empresas').doc(nComp.id.toString()).set(nComp),
      db.collection('usuarios').doc(nUser.id.toString()).set(nUser),
  ]).then(() => {
      document.getElementById('registerForm').reset();
      showToast('Empresa Registrada com sucesso!');
      showLoginScreen();
      document.getElementById('loginEmail').value = em;
      btn.innerHTML = originalText;
      btn.disabled = false;
  }).catch((err) => {
      console.error(err);
      showNotice('registerAlert', 'Erro ao criar empresa.', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
  });
});

// ==========================================
// 3. LOGIN MANUAL DE UTILIZADOR
// ==========================================
document.getElementById('loginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const em = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const u = users.find((u) => u.email === em && u.password === pw && u.active);
  
  if (u) {
      currentUser = u;
      localStorage.setItem('feedbackgo_logged_user', u.id);
      
      // Marca como ONLINE
      db.collection('usuarios').doc(u.id.toString()).update({ isOnline: true });
      
      // Pega a data e hora exata do Brasil (Fuso Local)
      const dataLocal = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
      
      // Salva o login MANUAL diretamente
      db.collection('acessos').add({
          userId: u.id,
          companyId: u.companyId,
          userName: u.name,
          acao: 'LOGIN',
          detalhes: 'Fez login no sistema',
          timestamp: dataLocal
      });

      // 🔒 Trava a sessão para não duplicar se ele der F5 depois de logar
      sessionStorage.setItem('sessao_registrada', 'sim');

      showPanel(u.role);
  } else {
      showNotice('loginAlert', 'Credenciais inválidas.', 'error');
  }
});

// ==========================================
// 4. LOGOUT (SAIR)
// ==========================================
window.logout = function() {
  if (currentUser) {
      // Apaga a bolinha verde de Online no banco de dados
      db.collection('usuarios').doc(currentUser.id.toString()).update({ isOnline: false }).catch(()=>{});
  }
  
  // Limpa o usuário da memória
  currentUser = null;
  localStorage.removeItem('feedbackgo_logged_user');
  sessionStorage.removeItem('sessao_registrada'); 
  
  // Recarrega a página inteira para limpar caches e matar escutas
  window.location.reload();
};

// ==========================================
// 5. RECUPERAÇÃO DE SENHA
// ==========================================
document.getElementById('recoverForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const em = document.getElementById('recoverEmail').value.trim();
  const u = users.find((x) => x.email === em && x.active);

  if (u) {
    const btn = document.querySelector('#recoverForm button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Processar...';
    btn.disabled = true;

    const temp = Math.random().toString(36).substring(2, 8);
    const comp = companies.find((c) => c.id === u.companyId);

    db.collection('usuarios')
      .doc(u.id.toString())
      .update({ password: temp })
      .then(() => {
        emailjs
          .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_GENERIC, {
            to_name: u.name,
            to_email: u.email,
            subject: 'Recuperação',
            message_title: 'Recuperação de Senha',
            message_body: 'Use o código abaixo:',
            label_destaque: 'Senha Temporária',
            password: temp,
            extra_info: 'Altere após o login.',
            company_name: comp ? comp.name : 'FeedbackGo',
          })
          .then(() => {
            showToast('Senha alterada! Verifique o seu e-mail.');
            btn.innerHTML = originalText;
            btn.disabled = false;
            showLoginScreen();
          })
          .catch((err) => {
            btn.innerHTML = originalText;
            btn.disabled = false;
          });
      })
      .catch((error) => {
        showNotice('recoverAlert', 'Erro ao processar.', 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      });
  } else {
    showNotice('recoverAlert', 'E-mail não encontrado.', 'error');
  }
});

// ==========================================
// 6. NAVEGAÇÃO DE TELAS DE LOGIN
// ==========================================
window.showRegisterScreen = function() {
  ['loginScreen', 'recoverScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  const registerScreen = document.getElementById('registerScreen');
  registerScreen.classList.remove('hidden');
  registerScreen.style.display = 'flex';
};

window.showLoginScreen = function() {
  ['registerScreen', 'recoverScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  const loginScreen = document.getElementById('loginScreen');
  loginScreen.classList.remove('hidden');
  loginScreen.style.display = 'flex';
};

window.showRecoverScreen = function() {
  ['loginScreen', 'registerScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  const recoverScreen = document.getElementById('recoverScreen');
  recoverScreen.classList.remove('hidden');
  recoverScreen.style.display = 'flex';
};

// ==========================================
// 7. INICIALIZADOR DE PAINÉIS (ROTEADOR)
// ==========================================
window.showPanel = function(userOrRole) {
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) {
      loginScreen.classList.add('hidden');
      loginScreen.style.display = 'none';
  }

  const appInterface = document.getElementById('app-interface');
  if (appInterface) appInterface.style.display = 'block';

  if (typeof solicitarPermissaoNotificacao === 'function') solicitarPermissaoNotificacao();
  if (typeof iniciarRadarNotificacoes === 'function') iniciarRadarNotificacoes();

  let role = 'funcionario'; 
  if (typeof userOrRole === 'string') {
      role = userOrRole;
  } else if (userOrRole && userOrRole.role) {
      role = userOrRole.role;
  } else if (typeof currentUser !== 'undefined' && currentUser) {
      role = currentUser.role;

      // === APLICA O MODO ESCURO AO FAZER LOGIN MANUAL ===
      if (currentUser.darkMode === true) {
          document.body.classList.add('dark-mode');
          localStorage.setItem('feedbackgo_dark_mode', 'true');
      } else if (currentUser.darkMode === false) {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('feedbackgo_dark_mode', 'false');
      }
  }

  const pAdmin = document.getElementById('adminPanel');
  const pFunc = document.getElementById('employeePanel');

  if (pAdmin) pAdmin.classList.add('hidden');
  if (pFunc) pFunc.classList.add('hidden');

  let painelFinal = role;
  if (role === 'hibrido') {
      painelFinal = localStorage.getItem('feedbackgo_modo_hibrido') || 'admin';
  }

  if (painelFinal === 'admin') { 
      if (pAdmin) pAdmin.classList.remove('hidden');
      if (typeof initAdminPanel === 'function') initAdminPanel(localStorage.getItem('feedbackgo_aba_admin'));
  } else {
      if (pFunc) pFunc.classList.remove('hidden');
      if (typeof initEmployeePanel === 'function') initEmployeePanel(localStorage.getItem('feedbackgo_aba_func'));
  }
};