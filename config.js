/**
 * CONFIGURAÇÃO GLOBAL E DADOS ESTÁTICOS
 */

window.APP_CONFIG = {
  // 1. CONFIGURAÇÃO FIREBASE
  firebase: {
    apiKey: "AIzaSyCzNiOwGdmaOUlQ3_UMNw0TX6w3JO3vXVE",
    authDomain: "feedbackgooficial.firebaseapp.com",
    projectId: "feedbackgooficial",
    storageBucket: "feedbackgooficial.firebasestorage.app",
    messagingSenderId: "531915627918",
    appId: "1:531915627918:web:5210c0851b4ae9b088d8df",
    measurementId: "G-6N68F5759T"
  },

  // 2. CONFIGURAÇÃO EMAILJS
  emailjs: {
    SERVICE_ID: 'service_gmail',
    TEMPLATE_GENERIC: 'template_welcome',
    TEMPLATE_REPORT: 'template_report',
    PUBLIC_KEY: 'IF5hubbrNsxc_m7Qx'
  },

  // 4. DADOS PADRÃO DO SISTEMA

  defaults: {
    categories: [
      'Geral',
      'Reunião',
      'Desenvolvimento',
      'Suporte',
      'Vendas',
      'Formação',
    ],
    calendarCategories: [
      'Reunião',
      'Prazo',
      'Evento',
      'Feriado',
      'Outro'
    ],
    company: {
      companyBank: 0,
      gamificationEnabled: false,
      rewardsEnabled: true, // Nova chave para ativar/desativar loja e moedas
      monthlyBudget: 500,
      spentThisMonth: 0,
      teams: ['Equipe Geral']
    },
    categoryColors: {
      'Reunião': '#3b82f6',
      'Prazo': '#ef4444',
      'Evento': '#10b981',
      'Feriado': '#f59e0b',
      'Outro': '#64748b',
      'default': '#8b5cf6'
    },
    ui: {
      gamificationMenuIds: ['nav-loja-admin', 'nav-loja-func', 'nav-resgates-func'],
      gamificationDashboardIds: ['rankingAdminContainer', 'rankingFuncContainer', 'xpProgressBar'],
      calendarMenuIds: ['nav-calendario-admin', 'nav-calendario-func']
    }
  }
};

