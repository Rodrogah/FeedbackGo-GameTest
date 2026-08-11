// ============ LÓGICA DE AUTENTICAÇÃO E LOGIN (Firebase Auth) ============
// A autenticação agora é gerenciada pelo Firebase Auth. As senhas NUNCA são
// armazenadas ou comparadas no Firestore. O documento do usuário (usuarios/{id})
// mantém o id numérico legado e referencia a conta Auth pelo campo `authUid`.

// ==========================================
// 1. SESSÃO EM TEMPO REAL (carrega o perfil a partir do UID autenticado)
// ==========================================
let currentUnsubscribeUser = null;

function carregarUsuarioPorAuthUid(uid) {
  if (currentUnsubscribeUser) { currentUnsubscribeUser(); currentUnsubscribeUser = null; }

  // A consulta por authUid dispara também quando o documento é criado logo após
  // o cadastro (createUserWithEmailAndPassword), evitando corrida no registro.
  currentUnsubscribeUser = db.collection('usuarios')
    .where('authUid', '==', uid)
    .limit(1)
    .onSnapshot((snap) => {
        if (snap.empty) return; // conta recém-criada ou ainda sem documento

        const userData = snap.docs[0].data();

        // Conta desativada: encerra a sessão imediatamente
        if (userData.active === false) {
            if (firebase.auth().currentUser) firebase.auth().signOut();
            removerSplashESemLog();
            return;
        }

        const themeChanged = !currentUser || currentUser.darkMode !== userData.darkMode;
        currentUser = userData;

        // Aplica tema em tempo real
        if (currentUser.darkMode === true) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('feedbackgo_dark_mode', 'true');
        } else if (currentUser.darkMode === false) {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('feedbackgo_dark_mode', 'false');
        }

        // Atualiza UI se o tema mudar enquanto o app está aberto
        if (themeChanged) {
            if (typeof syncThemeSwitchUI === 'function') syncThemeSwitchUI();
        }

        // Atualiza a chave (Switch) se ela já existir na tela
        setTimeout(() => {
            const toggle = document.getElementById('chkDarkMode');
            if (toggle) toggle.checked = currentUser.darkMode === true;
        }, 500);

        if (!window.sessionStarted) {
            window.sessionStarted = true;
            db.collection('usuarios').doc(currentUser.id.toString()).update({ isOnline: true }).catch(() => {});

            if (window.registrarAcao && !sessionStorage.getItem('sessao_registrada')) {
                window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'LOGIN', 'Login realizado (Firebase Auth)');
                sessionStorage.setItem('sessao_registrada', 'sim');
            }

            console.log("Sessão sincronizada e ativa!");

            // === REMOVE A CORTINA (SPLASH) COM ANIMAÇÃO ===
            const splash = document.getElementById('splashLoadingGlobal');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 400);
            }

            // Abre o painel correto
            if (typeof showPanel === 'function') {
                showPanel(currentUser.role);
            }
        }
    }, (err) => {
        console.error("Erro na sincronização de perfil:", err);
        removerSplashESemLog();
    });
}

// Observa o estado de autenticação do Firebase Auth (restaura a sessão sozinho)
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    carregarUsuarioPorAuthUid(user.uid);
  } else {
    if (currentUnsubscribeUser) { currentUnsubscribeUser(); currentUnsubscribeUser = null; }
    currentUser = null;
    window.unsubscribeUser = null;
    window.sessionStarted = false;
    removerSplashESemLog();
  }
});

// Mantido por compatibilidade com core.js (checkFirstLoad) — a sessão agora é
// gerenciada exclusivamente pelo onAuthStateChanged acima.
window.processAutoLogin = function() {
  if (!firebase.auth().currentUser) removerSplashESemLog();
};

function removerSplashESemLog() {
  const splash = document.getElementById('splashLoadingGlobal');
  if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 400);
  }
  
  const pAdm = document.getElementById('adminPanel');
  const pFunc = document.getElementById('employeePanel');
  if (pAdm) { pAdm.classList.add('hidden'); pAdm.style.display = 'none'; }
  if (pFunc) { pFunc.classList.add('hidden'); pFunc.style.display = 'none'; }

  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) {
      loginScreen.style.display = 'flex';
      loginScreen.classList.remove('hidden');
  }
}

function msgErroAuth(err) {
  const map = {
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'E-mail ou senha inválidos.',
    'auth/wrong-password': 'E-mail ou senha inválidos.',
    'auth/user-disabled': 'Conta desativada. Contacte o administrador.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed': 'Falha de conexão. Verifique a internet.',
    'auth/invalid-credential': 'E-mail ou senha inválidos.',
    'auth/missing-password': 'Informe a senha.',
    'auth/operation-not-allowed': 'Cadastro desativado no momento.',
    'auth/internal-error': 'Erro interno. Tente novamente.'
  };
  return map[err.code] || (err.message || 'Erro de autenticação.');
}

// ==========================================
// 2. REGISTRO DE NOVA EMPRESA
// ==========================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const em = document.getElementById('adminEmail').value.trim();
    const senha = document.getElementById('adminPassword').value;

    const btn = document.getElementById('registerBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Criar...';
    btn.disabled = true;

    try {
      // Cria a conta no Firebase Auth (valida e-mail duplicado no servidor)
      const cred = await firebase.auth().createUserWithEmailAndPassword(em, senha);
      const authUid = cred.user.uid;

      const compId = Date.now();
      const nComp = {
        id: compId,
        name: document.getElementById('companyName').value.trim(),
        accessCode: 'EMP-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        createdAt: new Date().toISOString(),
        teams: ['Equipe Geral'],
        categories: [...defaultCategories],
        companyBank: 0,
        gamificationEnabled: false,
        rewardsEnabled: true, // Nova chave para ativar/desativar loja e moedas
        monthlyBudget: 500, // Limite padrão em Reais (R$)
        spentThisMonth: 0,  // Quanto já foi gasto neste mês
        lastBudgetMonth: new Date().toISOString().slice(0, 7) // Formato "YYYY-MM"
      };

      const adminId = Date.now() + 1;
      const nUser = {
          id: adminId,
          authUid: authUid,
          companyId: nComp.id,
          name: document.getElementById('adminName').value.trim(),
          email: em,
          role: 'admin',
          active: true,
          team: 'Administração',
      };

      // Grava primeiro o mapa authUid -> userId (as regras do Firestore exigem
      // que ele exista para permitir a criação da empresa e do usuário)
      await db.collection('usuarioAuth').doc(authUid).set({
          userId: nUser.id,
          companyId: nComp.id,
          role: nUser.role
      });

      // Depois grava empresa e usuário (agora autorizados pelas regras)
      await Promise.all([
          db.collection('empresas').doc(nComp.id.toString()).set(nComp),
          db.collection('usuarios').doc(nUser.id.toString()).set(nUser),
      ]);

      document.getElementById('registerForm').reset();
      showToast('Empresa Registrada com sucesso!');
      // A sessão é aberta automaticamente pelo onAuthStateChanged
    } catch (err) {
        console.error("Erro completo:", err);
        showNotice('registerAlert', msgErroAuth(err), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
  });
}

// ==========================================
// 3. LOGIN MANUAL DE UTILIZADOR
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const em = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;

    const btn = document.querySelector('#loginForm button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Autenticando...';
    btn.disabled = true;

    firebase.auth().signInWithEmailAndPassword(em, pw)
      .then(() => {
          showToast('Bem-vindo ao FeedbackGo!');
          // O onAuthStateChanged carrega o perfil e abre o painel
      })
      .catch((err) => {
          showNotice('loginAlert', msgErroAuth(err), 'error');
      })
      .finally(() => {
          btn.innerHTML = originalText;
          btn.disabled = false;
      });
  });
}

// ==========================================
// 4. LOGOUT (SAIR)
// ==========================================
window.logout = function() {
  if (currentUser) {
      if (window.registrarAcao) {
        window.registrarAcao(currentUser.id, currentUser.companyId, currentUser.name, 'LOGOUT', 'Utilizador saiu do sistema');
      }
      db.collection('usuarios').doc(currentUser.id.toString()).update({ isOnline: false }).catch(()=>{});
  }
  currentUser = null;
  sessionStorage.removeItem('sessao_registrada');
  firebase.auth().signOut().finally(() => {
    window.location.reload();
  });
};

// ==========================================
// 5. RECUPERAÇÃO DE SENHA (o Firebase Auth envia o e-mail de redefinição)
// ==========================================
const recoverForm = document.getElementById('recoverForm');
if (recoverForm) {
  recoverForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const em = document.getElementById('recoverEmail').value.trim();

    const btn = document.querySelector('#recoverForm button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> A Processar...';
    btn.disabled = true;

    firebase.auth().sendPasswordResetEmail(em)
        .then(() => {
            showToast('E-mail de redefinição enviado! Verifique a sua caixa de entrada.');
            btn.innerHTML = originalText;
            btn.disabled = false;
            showLoginScreen();
        })
        .catch((err) => {
            // Não revela se o e-mail existe; mantém mensagem neutra para user-not-found
            const msg = (err.code === 'auth/user-not-found')
                ? 'E-mail de redefinição enviado se a conta existir.'
                : msgErroAuth(err);
            showNotice('recoverAlert', msg, 'error');
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
  });
}

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
