// ============ LÓGICA DE AUTENTICAÇÃO E LOGIN ============

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
    gamificationEnabled: false
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

  // NOVA ARQUITETURA: Salva direto nas coleções do Firebase sem travar!
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
  
  window.logout = function() {
    if (currentUser) {
        // Apaga a bolinha verde de Online no banco de dados
        db.collection('usuarios').doc(currentUser.id.toString()).update({ isOnline: false }).catch(()=>{});
    }
    
    // Limpa o usuário da memória
    currentUser = null;
    localStorage.removeItem('feedbackgo_logged_user');
    sessionStorage.removeItem('sessao_registrada'); 
    
    // O truque de mestre: recarrega a página inteira. 
    // Isso desliga todos os radares ao vivo, limpa o cache da tela e mostra o login perfeitamente!
    window.location.reload();
};

document.getElementById('recoverForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const em = document.getElementById('recoverEmail').value.trim();
  const u = users.find((x) => x.email === em && x.active);

  if (u) {
    const btn = document.querySelector('#recoverForm button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> A Processar...';
    btn.disabled = true;

    const temp = Math.random().toString(36).substring(2, 8);
    const comp = companies.find((c) => c.id === u.companyId);

    // NOVA ARQUITETURA: Atualiza direto no documento do usuário específico
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

function showRegisterScreen() {
  ['loginScreen', 'recoverScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById('registerScreen').classList.remove('hidden');
}
function showLoginScreen() {
  ['registerScreen', 'recoverScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById('loginScreen').classList.remove('hidden');
}
function showRecoverScreen() {
  ['loginScreen', 'registerScreen'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
  document.getElementById('recoverScreen').classList.remove('hidden');
}

function showPanel(userOrRole) {
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) loginScreen.classList.add('hidden');
  
  const loginContainer = document.getElementById('login-container');
  if (loginContainer) loginContainer.style.display = 'none';

  const appInterface = document.getElementById('app-interface');
  if (appInterface) appInterface.style.display = 'block';

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
}