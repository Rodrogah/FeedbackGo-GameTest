// 1. MÓDULO CALENDÁRIO CORPORATIVO

window.lembretesGlobais = [];
window.dataAtualCalendarioAdmin = new Date();
window.dataAtualCalendarioFunc = new Date();
window.filtroCalendarioAdmin = 'todos';
window.filtroCalendarioFunc = 'todos';
window.unsubscribeLembretes = null;

window.getDataCalendarioAtual = function () {
    const isAd = window.checkIsVisualAdmin();
    let d = isAd ? window.dataAtualCalendarioAdmin : window.dataAtualCalendarioFunc;
    if (!(d instanceof Date) || isNaN(d.getTime())) {
        d = new Date();
        if (isAd) window.dataAtualCalendarioAdmin = d;
        else window.dataAtualCalendarioFunc = d;
    }
    return d;
};

window.getFiltroCalendarioAtual = function () {
    return window.checkIsVisualAdmin() ? window.filtroCalendarioAdmin : window.filtroCalendarioFunc;
};

// =====================================================
// HELPER GLOBAL: Detecta se estamos na visão de Admin
// Admin puro = sempre true
// Hi­brido = depende do painel ativo (localStorage)
// Funcionário = sempre false
// =====================================================
window.checkIsVisualAdmin = function () {
    if (typeof currentUser === 'undefined' || !currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'hibrido') {
        return localStorage.getItem('feedbackgo_modo_hibrido') !== 'func';
    }
    return false;
};

// =====================================================
// HELPER GLOBAL: Pega o elemento do painel correto
// Evita colisão de IDs duplicados na SPA (admin/func)
// =====================================================
window.getCalEl = function (id) {
    const isVisAdmin = window.checkIsVisualAdmin();
    const p = document.getElementById(isVisAdmin ? 'adminPanel' : 'employeePanel');
    return p ? p.querySelector('#' + id) : null;
};

window.fecharModalVerMaisDia = function () {
    const el = window.getCalEl('modalVerMaisDia');
    if (el) el.classList.add('hidden');
};

// =====================================================
// RADAR: Escuta em tempo real os lembretes do Firestore
// =====================================================
window.iniciarRadarCalendario = function () {
    if (!currentUser) return;
    // Interromper radar anterior

    // Consulta otimizada no Firestore para lembretes
    // 1. Busca tudo que é PÚBLICO ("todos")
    // 2. Busca tudo que eu mesmo criei (Meus lembretes PRIVADOS)
    // 3. Se eu for ADM, busca também o que é para "adms"

    let baseRef = db.collection('lembretes').where('companyId', '==', currentUser.companyId);

    window.unsubscribeLembretes = baseRef.onSnapshot(snap => {
        let lista = [];
        snap.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;

            // Filtragem adicional no cliente
            const ehMeu = String(data.userId) === String(currentUser.id);
            const ehPublico = data.visibilidade === 'todos';
            const ehParaAdms = data.visibilidade === 'adms';
            const souAdmin = window.checkIsVisualAdmin();

            if (ehMeu || ehPublico || (souAdmin && ehParaAdms)) {
                lista.push(data);
            }
        });
        window.lembretesGlobais = lista || [];

        if (document.getElementById('calendarDaysBody') || document.getElementById('calendarDaysBodyFunc')) {
            window.renderizarCalendario();
        }

        // Atualização sincronizada com a versão mobile
        if (typeof window.renderMobileCalendar === 'function' && document.getElementById('mobileContent')) {
            window.renderMobileCalendar();
        }
    });
};

// =====================================================
// NAVEGAÇÃO: Mês / Ano / Filtros
// =====================================================
window.mudarMes = function (direcao) {
    const d = window.getDataCalendarioAtual();
    d.setMonth(d.getMonth() + direcao);
    window.renderizarCalendario();
};

window.mudarMesSelect = function () {
    const isVisualAdmin = window.checkIsVisualAdmin();
    const id = isVisualAdmin ? 'filtroMesCalendario' : 'filtroMesCalendarioFunc';
    const sel = document.getElementById(id);
    if (sel && !isNaN(parseInt(sel.value))) {
        const d = window.getDataCalendarioAtual();
        d.setMonth(parseInt(sel.value));
        window.renderizarCalendario();
    }
};

window.mudarAnoSelect = function () {
    const isVisualAdmin = window.checkIsVisualAdmin();
    const id = isVisualAdmin ? 'filtroAnoCalendario' : 'filtroAnoCalendarioFunc';
    const sel = document.getElementById(id);
    if (sel && !isNaN(parseInt(sel.value))) {
        const d = window.getDataCalendarioAtual();
        d.setFullYear(parseInt(sel.value));
        window.renderizarCalendario();
    }
};

window.filtrarCalendarioBase = function () {
    const isVisualAdmin = window.checkIsVisualAdmin();
    const id = isVisualAdmin ? 'filtroVisibilidadeCalendario' : 'filtroVisibilidadeCalendarioFunc';
    const sel = document.getElementById(id);
    if (sel) {
        if (isVisualAdmin) window.filtroCalendarioAdmin = sel.value;
        else window.filtroCalendarioFunc = sel.value;
        window.renderizarCalendario();
    }
};

// =================================================================
// REGRAS DE VISIBILIDADE E EDIÇÃO
// =================================================================
function filtrarLembretePorVisibilidade(l, isVisualAdmin) {
    const ehDono = String(l.userId) === String(currentUser.id);

    // Privado: só o dono vê, ponto final
    if (l.visibilidade === 'privado' && !ehDono) return false;

    // Adms: só quem está no painel admin OU o dono
    if (l.visibilidade === 'adms' && !isVisualAdmin && !ehDono) return false;

    // Separação de contas Híbridas: Tratar "Privado" como dois calendários isolados
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'hibrido' && l.visibilidade === 'privado' && ehDono) {
        const origem = l.origem || 'admin';
        if (isVisualAdmin && origem !== 'admin') return false;
        if (!isVisualAdmin && origem !== 'func') return false;
    }

    return true;
}

// 2. RENDERIZAÇÃO DO CALENDÁRIO

window.carregarCategoriasCalendarioAoIniciar = function () {
    if (!currentUser || typeof companies === 'undefined') return;
    const c = companies.find((x) => String(x.id) === String(currentUser.companyId));
    if (c) {
        let cats = c.calendarCategories;
        if (!cats || !Array.isArray(cats) || cats.length === 0) {
            cats = window.APP_CONFIG.defaults.calendarCategories;
        }
        if (typeof window.updateCalendarCategoriesSelects === 'function') {
            window.updateCalendarCategoriesSelects(cats);
        }
    }
};

window.updateCalendarCategoriesSelects = function (cats) {
    const glob = [
        document.getElementById('lembreteCategoria'),
        document.getElementById('filtroCategoriaCalendario'),
        document.getElementById('filtroCategoriaCalendarioFunc')
    ];

    // Also look inside modal just in case there are duplicates
    const pAdmin = document.getElementById('adminPanel');
    if (pAdmin) {
        glob.push(pAdmin.querySelector('#lembreteCategoria'));
    }
    const pFunc = document.getElementById('employeePanel');
    if (pFunc) {
        glob.push(pFunc.querySelector('#lembreteCategoria'));
    }

    const uniqueElements = [...new Set(glob.filter(e => e))];

    uniqueElements.forEach(sel => {
        const isFiltro = sel.id.indexOf('filtro') !== -1;
        const oldVal = sel.value;

        let prefix = '';
        if (isFiltro) prefix = '<option style="color: black;" value="">Todas as Categorias</option>';

        sel.innerHTML = prefix + cats.map(c => `<option style="color: black;" value="${c}">${c}</option>`).join('');

        let found = false;
        for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === oldVal) found = true;
        }
        if (found) sel.value = oldVal;
    });
};

window.renderizarCalendario = function () {
    const isVisualAdmin = window.checkIsVisualAdmin();

    // Atualiza as categorias no DOM
    window.carregarCategoriasCalendarioAoIniciar();

    const containerId = isVisualAdmin ? 'calendarDaysBody' : 'calendarDaysBodyFunc';
    const mesAnoLabelId = isVisualAdmin ? 'mesAnoAtualLabel' : 'mesAnoAtualLabelFunc';

    const container = document.getElementById(containerId);
    if (!container) return;

    const dataAtual = window.getDataCalendarioAtual();
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    // Atualiza label
    const labelMes = document.getElementById(mesAnoLabelId);
    let nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dataAtual);
    nomeMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    if (labelMes) labelMes.innerText = `${nomeMes} de ${ano}`;

    // Atualiza selects de mês e ano (Segurança redundante: preenche todos que encontrar)
    const idsMes = ['filtroMesCalendario', 'filtroMesCalendarioFunc'];
    idsMes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = mes;
    });

    const idsAno = ['filtroAnoCalendario', 'filtroAnoCalendarioFunc'];
    idsAno.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.options.length < 3) {
                el.innerHTML = '';
                const anoBase = new Date().getFullYear();
                for (let y = anoBase - 5; y <= anoBase + 5; y++) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    opt.style.color = 'black';
                    el.appendChild(opt);
                }
            }
            el.value = ano;
        }
    });

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();

    const blocosIniciais = primeiroDia + ultimoDia;
    const qtdLinhas = Math.max(5, Math.ceil(blocosIniciais / 7));
    container.style.gridTemplateRows = `repeat(${qtdLinhas}, minmax(130px, 1fr))`;

    let diasHTML = '';

    // Ordenação de lembretes por duração e data de início
    window.lembretesGlobais.sort((a, b) => {
        const dFimA = a.dataFim || a.data;
        const dFimB = b.dataFim || b.data;
        const durA = new Date(dFimA).getTime() - new Date(a.data).getTime();
        const durB = new Date(dFimB).getTime() - new Date(b.data).getTime();
        if (durA > durB) return -1;
        if (durA < durB) return 1;
        if (a.data < b.data) return -1;
        if (a.data > b.data) return 1;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });

    // Dias do mês anterior (cinzentos)
    for (let i = primeiroDia - 1; i >= 0; i--) {
        const diaAnteriorNum = ultimoDiaMesAnterior - i;
        const isDomingo = new Date(ano, mes - 1, diaAnteriorNum).getDay() === 0;
        const bLeft = isDomingo ? '' : 'border-left: 1px solid var(--color-border);';

        diasHTML += `<div style="position: relative; height: 100%; display: flex; flex-direction: column; min-height: 0; ${bLeft} border-bottom: 1px solid var(--color-border); opacity: 0.3; background: rgba(0,0,0,0.02); padding: 0;">
             <div style="height: 38px; display: flex; font-size: 15px; font-weight: bold; padding: 10px 10px 5px 10px; justify-content: flex-end; align-items: center; color: var(--color-text-primary);">
                 ${diaAnteriorNum}
             </div>
         </div>`;
    }

    const hoje = new Date();
    let faixasAtivas = [];

    // Cálculo de densidade para ajuste visual de marcadores
    let maxEventosSimultaneos = 0;
    for (let i = 1; i <= ultimoDia; i++) {
        const dFormat = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const prevLembretes = window.lembretesGlobais.filter(l => {
            const eStart = l.data; const eEnd = l.dataFim || l.data;
            if (dFormat < eStart || dFormat > eEnd) return false;
            if (!filtrarLembretePorVisibilidade(l, isVisualAdmin)) return false;
            if (window.getFiltroCalendarioAtual() === 'meus' && l.userId !== currentUser.id) return false;
            if (window.getFiltroCalendarioAtual() === 'empresa' && l.visibilidade === 'privado') return false;
            if (window.getFiltroCalendarioAtual() === 'adms' && l.visibilidade !== 'adms') return false;
            const ddlCat = document.getElementById(isVisualAdmin ? 'filtroCategoriaCalendario' : 'filtroCategoriaCalendarioFunc');
            if (ddlCat && ddlCat.value && l.categoria !== ddlCat.value) return false;
            return true;
        });
        if (prevLembretes.length > maxEventosSimultaneos) maxEventosSimultaneos = prevLembretes.length;
    }

    let configHeight = 26;
    let configPad = 4;
    let configFont = 13;
    let limiteExibicao = 3;

    if (maxEventosSimultaneos >= 4) {
        configHeight = 16; configPad = 1; configFont = 10;
    } else if (maxEventosSimultaneos === 3) {
        configHeight = 20; configPad = 2; configFont = 11;
    }
    // =======================================================================

    for (let i = 1; i <= ultimoDia; i++) {
        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const ehHoje = hoje.getDate() === i && hoje.getMonth() === mes && hoje.getFullYear() === ano;
        const isDomingo = new Date(ano, mes, i).getDay() === 0;

        const bStyle = `${isDomingo ? '' : 'border-left: 1px solid var(--color-border);'} border-bottom: 1px solid var(--color-border);`;

        // Eventos do dia (com filtro de visibilidade)
        const lembretesDia = window.lembretesGlobais.filter(l => {
            const evtStart = l.data;
            const evtEnd = l.dataFim || l.data;
            if (dataFormatada < evtStart || dataFormatada > evtEnd) return false;

            if (!filtrarLembretePorVisibilidade(l, isVisualAdmin)) return false;

            if (window.getFiltroCalendarioAtual() === 'meus') {
                if (l.userId !== currentUser.id) return false;
            } else if (window.getFiltroCalendarioAtual() === 'empresa') {
                if (l.visibilidade === 'privado') return false;
            } else if (window.getFiltroCalendarioAtual() === 'adms') {
                if (l.visibilidade !== 'adms') return false;
            }

            const idCat = isVisualAdmin ? 'filtroCategoriaCalendario' : 'filtroCategoriaCalendarioFunc';
            const ddlCat = document.getElementById(idCat);
            if (ddlCat && ddlCat.value) {
                if (l.categoria !== ddlCat.value) return false;
            }

            return true;
        });

        let htmlMarcacoes = '';

        if (isDomingo && i !== 1) {
            faixasAtivas = [];
        }

        const faixasDeHoje = [];

        // 1. Manter eventos jÃ¡ ativos exatamente nas mesmas faixas
        lembretesDia.forEach(l => {
            const t = faixasAtivas.indexOf(l.id);
            if (t !== -1) faixasDeHoje[t] = l;
        });

        // 2. Alocar novos eventos nas linhas livres comeÃ§ando do topo
        lembretesDia.forEach(l => {
            const t = faixasAtivas.indexOf(l.id);
            if (t === -1) {
                let slot = 0;
                while (faixasDeHoje[slot]) slot++;
                faixasDeHoje[slot] = l;
            }
        });

        // 3. Renovar as trilhas guardadas para o dia seguinte
        faixasAtivas = [];
        for (let k = 0; k < faixasDeHoje.length; k++) {
            faixasAtivas[k] = faixasDeHoje[k] ? faixasDeHoje[k].id : null;
        }

        let overflowOculto = false;

        for (let slot = 0; slot < faixasDeHoje.length; slot++) {
            if (slot >= limiteExibicao) { overflowOculto = true; break; }

            const lbl = faixasDeHoje[slot];
            if (!lbl) {
                // Slot vazio: placeholder para manter alinhamento
                htmlMarcacoes += `<div style="height: ${configHeight}px; margin-top: 2px; padding: ${configPad}px 0;">&nbsp;</div>`;
                continue;
            }

            const evtStart = lbl.data;
            const evtEnd = lbl.dataFim || lbl.data;

            const diaDaSemana = new Date(ano, mes, i).getDay();
            const isVisualStart = dataFormatada === evtStart || diaDaSemana === 0 || i === 1;
            const isVisualEnd = dataFormatada === evtEnd || diaDaSemana === 6 || i === ultimoDia;

            let mLeft = '0px';
            let mRight = '0px';
            let wStyle = 'width: 100%;';

            if (isVisualStart && isVisualEnd) {
                wStyle = 'width: 92%;';
                mLeft = '4%';
            } else if (isVisualStart && !isVisualEnd) {
                wStyle = 'width: 96%;';
                mLeft = '4%';
                mRight = '-1px';
            } else if (!isVisualStart && isVisualEnd) {
                wStyle = 'width: 96%;';
                mRight = '4%';
                mLeft = '-1px';
            } else {
                wStyle = 'width: calc(100% + 2px);';
                mLeft = '-1px';
                mRight = '-1px';
            }

            const bRadius = `${isVisualStart ? '4px' : '0'} ${isVisualEnd ? '4px' : '0'} ${isVisualEnd ? '4px' : '0'} ${isVisualStart ? '4px' : '0'}`;

            // Calcula contraste para garantir a legibilidade
            let textColor = '#ffffff';
            if (lbl.cor && lbl.cor.startsWith('#')) {
                let hc = lbl.cor.replace('#', '');
                if (hc.length === 3) hc = hc.split('').map(c => c + c).join('');
                if (hc.length === 6) {
                    const r = parseInt(hc.substr(0, 2), 16);
                    const g = parseInt(hc.substr(2, 2), 16);
                    const b = parseInt(hc.substr(4, 2), 16);
                    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                    textColor = (yiq >= 128) ? '#111111' : '#ffffff';
                }
            }

            const displayTitle = isVisualStart || diaDaSemana === 0 || i === 1 ? `<span style="font-size: ${configFont}px; font-weight: bold; margin-left: 12px; color: ${textColor}; letter-spacing: -0.2px;">${lbl.titulo}</span>` : `&nbsp;`;

            // PermissÃ£o de ediÃ§Ã£o: Apenas quem criou pode editar
            const canEdit = String(lbl.userId) === String(currentUser.id);
            const resizeHandle = (isVisualEnd && canEdit) ? `<div onmousedown="event.stopPropagation(); window.iniciarArrasteLembrete(event, '${lbl.id}', '${evtStart}')" style="position: absolute; right: 0; top: 0; bottom: 0; width: 12px; cursor: ew-resize; z-index: 5; border-top-right-radius: 4px; border-bottom-right-radius: 4px;" title="Arraste para alterar o fim"></div>` : '';

            htmlMarcacoes += `
                 <div onclick="event.stopPropagation(); window.abrirModalLembrete('${lbl.id}')" 
                      style="background: ${lbl.cor}; margin-left: ${mLeft}; margin-right: ${mRight}; ${wStyle} border-radius: ${bRadius}; padding: ${configPad}px 0; margin-top: 2px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: relative; z-index: 2; height: ${configHeight}px; display: flex; align-items: center;" title="${lbl.titulo}">
                     ${displayTitle}
                     ${resizeHandle}
                 </div>
             `;
        }

        if (overflowOculto || lembretesDia.length > limiteExibicao) {
            const sobra = lembretesDia.length - limiteExibicao;
            const lembretesFiltradosEscapados = JSON.stringify(lembretesDia).replace(/"/g, '&quot;');

            htmlMarcacoes += `
                <div onclick="event.stopPropagation(); window.abrirVerMaisDia('${dataFormatada}', '${lembretesFiltradosEscapados}')" style="color: var(--color-primary); font-size: 13px; margin-top: 6px; margin-left: 10px; cursor: pointer; font-weight: 600; z-index: 2; position: relative;">
                    Ver tudo (${sobra > 0 ? '+' + sobra : ''})
                </div>
             `;
        }

        const bgHojeSt = ehHoje ? 'background: rgba(16, 185, 129, 0.03);' : '';
        const badgeHoje = ehHoje
            ? `<span style="background: var(--color-primary); color: #111; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 14px;">${i}</span>`
            : `<span style="padding: 2px 8px; font-weight: bold; font-size: 15px; color: var(--color-text-primary);">${i}</span>`;

        const clickDia = `onclick="window.abrirModalLembretePeloDia('${dataFormatada}')"`;

        diasHTML += `<div class="calendar-day" data-date="${dataFormatada}" style="position: relative; height: 100%; display: flex; flex-direction: column; min-height: 0; ${bgHojeSt} ${bStyle} transition: 0.2s; padding: 0;" ${clickDia}>
             <div style="height: 38px; display: flex; font-size: 14px; font-weight: bold; padding: 10px 10px 5px 10px; justify-content: flex-end; align-items: center;">
                 ${badgeHoje}
             </div>
             <div style="display: flex; flex-direction: column;">
                ${htmlMarcacoes}
             </div>
         </div>`;
    }

    // Dias do mÃªs seguinte (cinzentos)
    const blocosAtuais = primeiroDia + ultimoDia;
    const qtdL = Math.max(5, Math.ceil(blocosAtuais / 7));
    const paddingFinalNecessario = (qtdL * 7) - blocosAtuais;

    if (paddingFinalNecessario > 0) {
        for (let i = 1; i <= paddingFinalNecessario; i++) {
            const isDomingo = new Date(ano, mes + 1, i).getDay() === 0;
            const bLeft = isDomingo ? '' : 'border-left: 1px solid var(--color-border);';

            diasHTML += `<div style="position: relative; height: 100%; display: flex; flex-direction: column; min-height: 0; ${bLeft} border-bottom: 1px solid var(--color-border); opacity: 0.3; background: rgba(0,0,0,0.02); padding: 0;">
                 <div style="height: 38px; display: flex; font-size: 15px; font-weight: bold; padding: 10px 10px 5px 10px; justify-content: flex-end; align-items: center; color: var(--color-text-primary);">
                     ${i}
                 </div>
             </div>`;
        }
    }

    try {
        container.innerHTML = diasHTML;
    } catch (err) {
        console.error('Erro ao renderizar HTML do calendÃ¡rio:', err);
    }
};


// ======================= MODAIS =======================

window.selecionarCorLembrete = function (color) {
    const ipt = window.getCalEl('lembreteCor');
    if (!ipt) return;
    ipt.value = color;

    const display = window.getCalEl('currentColorDisplay');
    if (display) display.style.backgroundColor = color;

    const dropdown = window.getCalEl('colorPickerDropdown');
    if (dropdown) dropdown.classList.add('hidden');

    // Atualiza o check visual nas bolinhas de cor
    const panel = document.getElementById(window.checkIsVisualAdmin() ? 'adminPanel' : 'employeePanel');
    const options = panel ? panel.querySelectorAll('.color-option') : document.querySelectorAll('.color-option');
    options.forEach(el => {
        if (el.getAttribute('data-color') === color) {
            el.innerHTML = '<i class="fa-solid fa-check" style="color: white; font-size: 12px;"></i>';
        } else {
            el.innerHTML = '';
        }
    });
};

document.addEventListener('click', function (e) {
    const btn = window.getCalEl('btnColorPicker');
    const dropdown = window.getCalEl('colorPickerDropdown');
    if (btn && dropdown && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

window.abrirModalLembretePeloDia = function (data) {
    window.getCalEl('formNovoLembrete').reset();
    window.getCalEl('lembreteId').value = '';

    const setDateVal = (id, val) => {
        const el = window.getCalEl(id);
        if (!el) return;
        if (el._flatpickr) el._flatpickr.setDate(val);
        else el.value = val;
    };

    setDateVal('lembreteData', data);
    setDateVal('lembreteDataFim', '');

    window.getCalEl('tituloModalLembrete').innerText = 'Novo Lembrete';
    window.getCalEl('btnExcluirLembrete').classList.add('hidden');
    window.getCalEl('btnSalvarLembrete').style.display = '';

    // Garante que os inputs estÃ£o desbloqueados para novo lembrete
    const inputsToToggle = ['lembreteTitulo', 'lembreteData', 'lembreteDataFim', 'lembreteCategoria', 'lembreteVisibilidade', 'lembreteDescricao', 'btnColorPicker'];
    inputsToToggle.forEach(id => { const el = window.getCalEl(id); if (el) el.disabled = false; });

    window.getCalEl('modalLembrete').classList.remove('hidden');
};

window.abrirModalLembreteForm = function (lembreteId) {
    const form = window.getCalEl('formNovoLembrete');
    form.reset();

    if (lembreteId) {
        const l = window.lembretesGlobais.find(x => x.id === lembreteId);
        if (!l) return;

        const isVisualAdmin = window.checkIsVisualAdmin();
        // Apenas quem criou pode editar
        let canEdit = String(l.userId) === String(currentUser.id);
        if (canEdit && currentUser.role === 'hibrido') {
            const origem = l.origem || 'admin';
            if ((isVisualAdmin && origem !== 'admin') || (!isVisualAdmin && origem !== 'func')) {
                canEdit = false;
            }
        }

        const inputsToToggle = ['lembreteTitulo', 'lembreteData', 'lembreteDataFim', 'lembreteCategoria', 'lembreteVisibilidade', 'lembreteDescricao', 'btnColorPicker'];

        if (!canEdit) {
            window.getCalEl('btnSalvarLembrete').style.display = 'none';
            inputsToToggle.forEach(id => { const el = window.getCalEl(id); if (el) el.disabled = true; });
        } else {
            window.getCalEl('btnSalvarLembrete').style.display = '';
            inputsToToggle.forEach(id => { const el = window.getCalEl(id); if (el) el.disabled = false; });
        }

        const setDateVal = (id, val) => {
            const el = window.getCalEl(id);
            if (!el) return;
            if (el._flatpickr) el._flatpickr.setDate(val);
            else el.value = val;
        };

        window.getCalEl('lembreteId').value = l.id;
        window.getCalEl('lembreteTitulo').value = l.titulo;
        setDateVal('lembreteData', l.data || '');
        setDateVal('lembreteDataFim', l.dataFim || '');
        window.selecionarCorLembrete(l.cor || '#4285f4');
        const visEl = window.getCalEl('lembreteVisibilidade');
        if (visEl) visEl.value = l.visibilidade || 'privado';
        window.getCalEl('lembreteCategoria').value = l.categoria || 'Evento';
        window.getCalEl('lembreteDescricao').value = l.descricao || '';

        window.getCalEl('tituloModalLembrete').innerText = 'Editar Lembrete';

        if (canEdit) {
            window.getCalEl('btnExcluirLembrete').classList.remove('hidden');
        } else {
            window.getCalEl('btnExcluirLembrete').classList.add('hidden');
        }
    } else {
        const setDateVal = (id, val) => {
            const el = window.getCalEl(id);
            if (!el) return;
            if (el._flatpickr) el._flatpickr.setDate(val);
            else el.value = val;
        };

        window.getCalEl('lembreteId').value = '';
        setDateVal('lembreteData', new Date().toISOString().split('T')[0]);
        setDateVal('lembreteDataFim', '');
        window.selecionarCorLembrete('#4285f4');
        window.getCalEl('tituloModalLembrete').innerText = 'Novo Lembrete';
        window.getCalEl('btnExcluirLembrete').classList.add('hidden');
        window.getCalEl('btnSalvarLembrete').style.display = '';

        const inputsToToggle = ['lembreteTitulo', 'lembreteData', 'lembreteDataFim', 'lembreteCategoria', 'lembreteVisibilidade', 'lembreteDescricao', 'btnColorPicker'];
        inputsToToggle.forEach(id => { const el = window.getCalEl(id); if (el) el.disabled = false; });
        
        // Tenta carregar rascunho se for NOVO
        window.carregarRascunhoCalendario();
    }
    
    // Configura os ouvintes de rascunho
    window.configurarAutoDraftCalendario();

    window.getCalEl('modalLembrete').classList.remove('hidden');
};

// 🛡️ SISTEMA DE RASCUNHO (Anti-Perda de Dados)
window.configurarAutoDraftCalendario = function() {
    const ids = ['lembreteTitulo', 'lembreteData', 'lembreteDataFim', 'lembreteCategoria', 'lembreteVisibilidade', 'lembreteDescricao', 'lembreteCor'];
    ids.forEach(id => {
        const el = window.getCalEl(id);
        if (el) {
            el.oninput = () => {
                const draft = {
                    titulo: window.getCalEl('lembreteTitulo').value,
                    data: window.getCalEl('lembreteData').value,
                    dataFim: window.getCalEl('lembreteDataFim').value,
                    categoria: window.getCalEl('lembreteCategoria').value,
                    visibilidade: window.getCalEl('lembreteVisibilidade') ? window.getCalEl('lembreteVisibilidade').value : 'privado',
                    descricao: window.getCalEl('lembreteDescricao').value,
                    cor: window.getCalEl('lembreteCor').value
                };
                localStorage.setItem('feedbackgo_draft_lembrete', JSON.stringify(draft));
            };
        }
    });
};

window.carregarRascunhoCalendario = function() {
    const raw = localStorage.getItem('feedbackgo_draft_lembrete');
    if (!raw) return;
    try {
        const draft = JSON.parse(raw);
        if (draft.titulo) window.getCalEl('lembreteTitulo').value = draft.titulo;
        if (draft.data) {
            const el = window.getCalEl('lembreteData');
            if (el._flatpickr) el._flatpickr.setDate(draft.data);
            else el.value = draft.data;
        }
        if (draft.dataFim) {
            const el = window.getCalEl('lembreteDataFim');
            if (el._flatpickr) el._flatpickr.setDate(draft.dataFim);
            else el.value = draft.dataFim;
        }
        if (draft.categoria) window.getCalEl('lembreteCategoria').value = draft.categoria;
        if (draft.visibilidade && window.getCalEl('lembreteVisibilidade')) window.getCalEl('lembreteVisibilidade').value = draft.visibilidade;
        if (draft.descricao) window.getCalEl('lembreteDescricao').value = draft.descricao;
        if (draft.cor) window.selecionarCorLembrete(draft.cor);
    } catch(e) {}
};

window.limparRascunhoCalendario = function() {
    localStorage.removeItem('feedbackgo_draft_lembrete');
};

window.abrirModalLembrete = function (lembreteId) {
    if (!lembreteId) {
        return window.abrirModalLembreteForm();
    }

    const l = window.lembretesGlobais.find(x => x.id === lembreteId);
    if (!l) return;

    const modalVer = window.getCalEl('modalVerLembrete');
    if (!modalVer) {
        return window.abrirModalLembreteForm(lembreteId);
    }

    const isVisualAdmin = window.checkIsVisualAdmin();
    let canEdit = String(l.userId) === String(currentUser.id);
    if (canEdit && currentUser.role === 'hibrido') {
        const origem = l.origem || 'admin';
        if ((isVisualAdmin && origem !== 'admin') || (!isVisualAdmin && origem !== 'func')) {
            canEdit = false;
        }
    }

    modalVer.setAttribute('data-lembrete-id', lembreteId);

    const header = window.getCalEl('headerModalVerLembrete');
    if (header) header.style.backgroundColor = l.cor || '#4285f4';

    const titulo = window.getCalEl('tituloModalVerLembrete');
    if (titulo) titulo.innerText = l.titulo;

    let dtLabel = new Date(l.data + 'T12:00:00Z').toLocaleDateString();
    if (l.dataFim && l.dataFim !== l.data) {
        dtLabel += ' atÃ© ' + new Date(l.dataFim + 'T12:00:00Z').toLocaleDateString();
    }
    const dataDisplay = window.getCalEl('dataModalVerLembrete');
    if (dataDisplay) dataDisplay.innerText = dtLabel;

    const catDisplay = window.getCalEl('categoriaModalVerLembrete');
    if (catDisplay) catDisplay.innerText = l.categoria || 'Evento';

    const desc = window.getCalEl('descModalVerLembrete');
    if (desc) desc.innerText = l.descricao || 'Nenhuma descrição detalhada.';

    const autor = window.getCalEl('autorModalVerLembrete');
    if (autor) autor.innerText = l.autorNome || 'Autor desconhecido';

    const btnEditar = window.getCalEl('btnEditarModalVerLembrete');
    if (btnEditar) {
        if (canEdit) btnEditar.classList.remove('hidden');
        else btnEditar.classList.add('hidden');
    }

    const btnExcluir = window.getCalEl('btnExcluirModalVerLembrete');
    if (btnExcluir) {
        if (canEdit) btnExcluir.classList.remove('hidden');
        else btnExcluir.classList.add('hidden');
    }

    modalVer.classList.remove('hidden');
};

window.abrirModalEdicaoAPartirDoVer = function () {
    const modalVer = window.getCalEl('modalVerLembrete');
    if (!modalVer) return;
    const id = modalVer.getAttribute('data-lembrete-id');
    window.fecharModalVerLembrete();
    window.abrirModalLembreteForm(id);
};

window.fecharModalLembrete = function () {
    window.getCalEl('modalLembrete').classList.add('hidden');
};

window.fecharModalVerLembrete = function () {
    const m = window.getCalEl('modalVerLembrete');
    if (m) m.classList.add('hidden');
};

window.excluirLembreteAPartirDoVer = function () {
    const modalVer = window.getCalEl('modalVerLembrete');
    if (!modalVer) return;
    const id = modalVer.getAttribute('data-lembrete-id');

    if (!id) return;

    const l = window.lembretesGlobais.find(x => x.id === id);
    if (!l) return;

    let podeExcluir = String(l.userId) === String(currentUser.id);
    if (podeExcluir && currentUser.role === 'hibrido') {
        const isVisualAdmin = window.checkIsVisualAdmin();
        const origem = l.origem || 'admin';
        if ((isVisualAdmin && origem !== 'admin') || (!isVisualAdmin && origem !== 'func')) {
            podeExcluir = false;
        }
    }

    if (!podeExcluir) {
        showToast('NÃ£o tens permissÃ£o para apagar este lembrete!', 'error');
        return;
    }

    showConfirm('Tem a certeza que pretende apagar este lembrete?', async () => {
        const btn = window.getCalEl('btnExcluirModalVerLembrete');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Apagando...';

        db.collection('lembretes').doc(id).delete().then(() => {
            showToast('Lembrete apagado!');
            window.fecharModalVerLembrete();
            if (btn) btn.innerHTML = '<i class="fa-solid fa-trash"></i> Excluir';
        });
    });
};

window.salvarLembrete = function (e) {
    if (e) e.preventDefault();

    const id = window.getCalEl('lembreteId').value;
    const isNovo = !id;
    const btn = window.getCalEl('btnSalvarLembrete');

    const dtIn = window.getCalEl('lembreteData').value;
    const elFim = window.getCalEl('lembreteDataFim');
    const dtFim = elFim ? elFim.value : '';

    if (dtFim && dtFim < dtIn) {
        showToast('A Data Final não pode ser anterior à Inicial!', 'error');
        return;
    }

    const payload = {
        titulo: window.getCalEl('lembreteTitulo').value,
        data: dtIn,
        dataFim: dtFim,
        cor: window.getCalEl('lembreteCor').value,
        categoria: window.getCalEl('lembreteCategoria').value,
        descricao: window.getCalEl('lembreteDescricao').value,
    };

    if (!isNovo) {
        const lembreteExistente = window.lembretesGlobais.find(x => x.id === id);
        if (lembreteExistente && String(lembreteExistente.userId) !== String(currentUser.id)) {
            showToast('Não tens permissão para editar este lembrete!', 'error');
            return;
        }
    }

    // Só grava autoria em novos lembretes (não rouba autoria ao editar)
    if (isNovo) {
        payload.companyId = currentUser.companyId;
        payload.userId = currentUser.id;
        payload.autorNome = currentUser.name;
        payload.origem = window.checkIsVisualAdmin() ? 'admin' : 'func';
    }

    // Visibilidade: usa o select se existir, senão 'privado' por defeito
    const selectVis = window.getCalEl('lembreteVisibilidade');
    if (selectVis) {
        payload.visibilidade = selectVis.value;
    } else if (isNovo) {
        payload.visibilidade = 'privado';
    }

    const txtOrig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    if (isNovo) {
        payload.createdAt = new Date().toISOString();
        db.collection('lembretes').add(payload).then(() => {
            showToast('Lembrete salvo!');
            window.limparRascunhoCalendario();
            window.fecharModalLembrete();
            btn.innerHTML = txtOrig; btn.disabled = false;
        }).catch(err => {
            console.error("Erro ao salvar lembrete:", err);
            showToast('Erro ao salvar no servidor. Mas não te preocupes, o rascunho está guardado localmente!', 'error');
            btn.innerHTML = txtOrig; btn.disabled = false;
        });
    } else {
        db.collection('lembretes').doc(id).update(payload).then(() => {
            showToast('Lembrete atualizado!');
            window.fecharModalLembrete();
            btn.innerHTML = txtOrig; btn.disabled = false;
        }).catch(err => {
            showToast('Erro ao atualizar!', 'error');
            btn.innerHTML = txtOrig; btn.disabled = false;
        });
    }
};

window.excluirLembrete = function () {
    const id = window.getCalEl('lembreteId').value;
    if (!id) return;

    const l = window.lembretesGlobais.find(x => x.id === id);
    if (!l) return;

    let podeExcluir = String(l.userId) === String(currentUser.id);
    if (podeExcluir && currentUser.role === 'hibrido') {
        const isVisualAdmin = window.checkIsVisualAdmin();
        const origem = l.origem || 'admin';
        if ((isVisualAdmin && origem !== 'admin') || (!isVisualAdmin && origem !== 'func')) {
            podeExcluir = false;
        }
    }

    if (!podeExcluir) {
        showToast('NÃ£o tens permissÃ£o para apagar este lembrete!', 'error');
        return;
    }

    showConfirm('Tem a certeza que pretende apagar este lembrete?', async () => {
        const btn = window.getCalEl('btnExcluirLembrete');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Apagando...';

        db.collection('lembretes').doc(id).delete().then(() => {
            showToast('Lembrete apagado!');
            window.fecharModalLembrete();
            btn.innerHTML = 'Excluir';
        });
    });
};

window.abrirVerMaisDia = function (dataStr, lembretesJSON) {
    const listaArr = JSON.parse(lembretesJSON);

    const partes = dataStr.split('-');
    const dataVis = `${partes[2]}/${partes[1]}/${partes[0]}`;
    window.getCalEl('modalVerMaisTitulo').innerHTML = `<i class="fa-regular fa-calendar" style="color: var(--color-primary);"></i> ${dataVis}`;

    let html = '';
    listaArr.forEach(lbl => {
        let tagVis = '';
        if (lbl.visibilidade === 'todos') tagVis = '<i class="fa-solid fa-globe" title="Para toda a Empresa"></i>';
        if (lbl.visibilidade === 'adms') tagVis = '<i class="fa-solid fa-user-tie" title="Eu e Coordenadores"></i>';
        if (lbl.visibilidade === 'privado') tagVis = '<i class="fa-solid fa-lock" title="Apenas Eu (Privado)"></i>';

        let subData = '';
        if (lbl.dataFim && lbl.dataFim !== lbl.data) {
            const inf = lbl.data.split('-'); const out = lbl.dataFim.split('-');
            subData = `<div style="font-size:10px; opacity:0.7; margin-bottom:5px;">PerÃ­odo: ${inf[2]}/${inf[1]} a ${out[2]}/${out[1]}</div>`;
        }

        html += `
        <div onclick="window.fecharModalVerMaisDia(); window.abrirModalLembrete('${lbl.id}');" style="padding: 15px; background: var(--color-bg-primary); display: flex; align-items: flex-start; gap: 12px; cursor: pointer; transition: 0.2s; margin-bottom: 2px;" class="notif-item-hover">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${lbl.cor}; margin-top: 5px; flex-shrink: 0;"></div>
            <div style="flex-grow: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong style="color: var(--color-text-primary); font-size: 14px;">${lbl.titulo}</strong>
                    <span style="color: var(--color-text-secondary); font-size: 11px;">${tagVis}</span>
                </div>
                ${subData}
                <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 5px;">
                    <span style="background: var(--color-bg-secondary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--color-border);">${lbl.categoria || 'Evento'}</span>
                    <span style="margin-left: 10px;"><i class="fa-regular fa-user"></i> ${lbl.autorNome || 'Desconhecido'}</span>
                </div>
                ${lbl.descricao ? `<p style="margin: 0; font-size: 12px; color: var(--color-text-secondary); font-style: italic;">"${lbl.descricao}"</p>` : ''}
            </div>
        </div>
        `;
    });

    window.getCalEl('modalVerMaisLista').innerHTML = html;
    window.getCalEl('modalVerMaisDia').classList.remove('hidden');
};

// ======================= ARRASTAR LEMBRETE =======================

let arrastandoId = null;
let arrastandoStart = null;
let dragOverlay = null;
let dragBackupFim = null;

window.iniciarArrasteLembrete = function (e, id, start) {
    if (e.button !== 0) return;
    arrastandoId = id;
    arrastandoStart = start;

    const l = window.lembretesGlobais.find(x => x.id === arrastandoId);
    if (l) dragBackupFim = l.dataFim || l.data;
    else dragBackupFim = null;

    dragOverlay = document.createElement('div');
    dragOverlay.style.position = 'fixed';
    dragOverlay.style.top = '0';
    dragOverlay.style.left = '0';
    dragOverlay.style.width = '100vw';
    dragOverlay.style.height = '100vh';
    dragOverlay.style.zIndex = '999999';
    dragOverlay.style.cursor = 'ew-resize';
    document.body.appendChild(dragOverlay);

    document.addEventListener('mousemove', window.moverArrasteLembrete);
    document.addEventListener('mouseup', window.finalizarArrasteLembrete);
};

window.moverArrasteLembrete = function (e) {
    if (!arrastandoId) return;

    dragOverlay.style.display = 'none';
    const elementosBaixo = document.elementsFromPoint(e.clientX, e.clientY);
    dragOverlay.style.display = 'block';

    let diaAlvo = null;
    if (elementosBaixo) {
        for (const el of elementosBaixo) {
            if (el && el.classList && el.classList.contains('calendar-day')) {
                diaAlvo = el.getAttribute('data-date');
                break;
            }
        }
    }

    if (diaAlvo && diaAlvo >= arrastandoStart) {
        const lIndex = window.lembretesGlobais.findIndex(x => x.id === arrastandoId);
        if (lIndex !== -1) {
            const currentFim = window.lembretesGlobais[lIndex].dataFim || window.lembretesGlobais[lIndex].data;
            if (currentFim !== diaAlvo) {
                window.lembretesGlobais[lIndex].dataFim = diaAlvo;
                window.renderizarCalendario();
            }
        }
    }
};

window.finalizarArrasteLembrete = function (e) {
    if (!arrastandoId) return;
    document.removeEventListener('mousemove', window.moverArrasteLembrete);
    document.removeEventListener('mouseup', window.finalizarArrasteLembrete);

    if (dragOverlay) {
        dragOverlay.remove();
        dragOverlay = null;
    }

    const lIndex = window.lembretesGlobais.findIndex(x => x.id === arrastandoId);
    if (lIndex !== -1) {
        let diaFinal = window.lembretesGlobais[lIndex].dataFim || window.lembretesGlobais[lIndex].data;

        if (diaFinal !== dragBackupFim) {
            db.collection('lembretes').doc(arrastandoId).update({
                dataFim: diaFinal
            }).catch(err => {
                console.error(err);
                window.lembretesGlobais[lIndex].dataFim = dragBackupFim;
                window.renderizarCalendario();
            });
        }
    }

    arrastandoId = null;
    arrastandoStart = null;
    dragBackupFim = null;
};


// =====================================================

// =====================================================
// TO-DO LIST PRO: Multi-Listas, Datas e Modais Internos
// =====================================================

window.currentTodoListId = null;
window.todoListsGlobais = [];
window.todosGlobais = [];

window.iniciarRadarTodo = function () {
    if (typeof currentUser === 'undefined' || !currentUser) return;

    console.log('📡 Iniciando Radar do To-Do Pro...');

    db.collection('todo_lists')
        .where('companyId', '==', currentUser.companyId)
        .where('userId', '==', currentUser.id)
        .onSnapshot(snap => {
            let listas = [];
            snap.forEach(doc => {
                let d = doc.data();
                d.id = doc.id;
                listas.push(d);
            });

            window.todoListsGlobais = listas;

            if (listas.length === 0) {
                window.criarListaPadrao();
            } else {
                if (!window.currentTodoListId) window.currentTodoListId = listas[0].id;
                window.renderizarTodoLists();
                window.iniciarRadarTarefasDaLista();
            }
        });
};

window.criarListaPadrao = function () {
    db.collection('todo_lists').add({
        nome: 'Minhas Tarefas',
        userId: currentUser.id,
        companyId: currentUser.companyId,
        createdAt: new Date().toISOString()
    });
};

window.verificarRembretesTarefas = function (todos) {
    if (typeof currentUser === 'undefined' || !currentUser) return;

    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD local

    todos.forEach(t => {
        // Se a tarefa nﾃ｣o estﾃ｡ concluﾃｭda e a data coincide com HOJE
        if (!t.done && t.dueDate === hoje) {
            const key = `notif_todo_${t.id}_${hoje}`;

            // Sﾃｳ notifica se ainda nﾃ｣o notificou NESTA SESSﾃグ de hoje
            if (!localStorage.getItem(key)) {
                console.log(`⏰ Alerta: Tarefa "${t.titulo}" vence hoje! Notificando...`);

                db.collection('notificacoes').add({
                    userId: currentUser.id,
                    titulo: '⏰ Tarefa para Hoje!',
                    mensagem: `Não se esqueça: sua tarefa "${t.titulo}" vence hoje.`,
                    tipo: 'Sistêmico',
                    acaoAlvo: 'calendario',
                    lida: false,
                    createdAt: new Date().toISOString()
                }).then(() => {
                    localStorage.setItem(key, 'true');
                }).catch(err => console.error("Erro ao gerar notificação de lembrete:", err));
            }
        }
    });
};

window.iniciarRadarTarefasDaLista = function () {
    if (window.unsubscribeTasks) window.unsubscribeTasks();
    if (!window.currentTodoListId) return;

    window.unsubscribeTasks = db.collection('todos')
        .where('listId', '==', window.currentTodoListId)
        .onSnapshot(snap => {
            let todos = [];
            snap.forEach(doc => {
                let d = doc.data();
                d.id = doc.id;
                todos.push(d);
            });
            window.todosGlobais = todos;
            window.renderizarTodosPro();

            // Dispara a verificação de lembretes sempre que as tarefas mudam
            window.verificarRembretesTarefas(todos);
        });
};

window.renderizarTodoLists = function () {
    const container = window.getCalEl('lista-todolists');
    if (!container) return;

    let html = '';
    window.todoListsGlobais.forEach(lista => {
        const activeStyle = lista.id === window.currentTodoListId ? 'background: rgba(16, 185, 129, 0.1); color: var(--color-primary); border: 1px solid var(--color-primary);' : 'color: var(--color-text-secondary);';
        html += `<div onclick="window.selecionarLista('${lista.id}')" style="padding: 12px 15px; border-radius: 10px; cursor: pointer; transition: 0.2s; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 10px; ${activeStyle}">
                <i class="fa-solid fa-layer-group"></i> ${lista.nome}
            </div>`;
    });
    container.innerHTML = html;

    const current = window.todoListsGlobais.find(l => l.id === window.currentTodoListId);
    if (current) {
        const elTitle = window.getCalEl('current-list-title');
        if (elTitle) elTitle.innerText = current.nome;
    }
};

window.selecionarLista = function (id) {
    window.currentTodoListId = id;
    window.renderizarTodoLists();
    window.iniciarRadarTarefasDaLista();
};

window.renderizarTodosPro = function () {
    const pendentesContainer = window.getCalEl('todos-pendentes');
    const concluidosContainer = window.getCalEl('todos-concluidos');
    if (!pendentesContainer || !concluidosContainer) return;

    const pendentes = window.todosGlobais.filter(t => !t.done);
    const concluidos = window.todosGlobais.filter(t => t.done);

    const countEl = window.getCalEl('count-concluidos');
    if (countEl) countEl.innerText = concluidos.length;

    const buildHtml = (lista) => {
        if (lista.length === 0) return '';
        return lista.map(item => {
            const ehAtrasado = !item.done && item.dueDate && new Date(item.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
            return `<div class="todo-item ${item.done ? 'done' : ''}" onclick="window.toggleTodoDone('${item.id}', ${item.done})" style="padding: 15px; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: 12px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: 0.2s;">
                    <div class="todo-checkbox" style="width: 20px; height: 20px; border: 2px solid ${item.done ? 'var(--color-primary)' : 'var(--color-border)'}; border-radius: 50%; background: ${item.done ? 'var(--color-primary)' : 'transparent'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${item.done ? '<span style="font-size: 12px; color: #111; font-weight: 800;">✓</span>' : ''}
                    </div>
                    <div style="flex-grow: 1;">
                        <span style="display: block; font-size: 14.5px; font-weight: 600; color: var(--color-text-primary); ${item.done ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${item.titulo}</span>
                        <div style="margin-top: 4px; display: flex; gap: 10px;">
                            ${item.dueDate ? `<span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; ${ehAtrasado ? 'color: #ef4444; background: rgba(239, 68, 68, 0.1);' : 'background: rgba(0,0,0,0.05); color: var(--color-text-secondary);'}"><i class="fa-regular fa-calendar"></i> ${new Date(item.dueDate).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                    <button class="btn-delete-todo" onclick="event.stopPropagation(); window.excluirTodo('${item.id}')" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; opacity: 0.5; transition: 0.2s;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>`;
        }).join('');
    };

    pendentesContainer.innerHTML = buildHtml(pendentes) || '<div style="text-align: center; opacity: 0.3; padding: 20px;">Nenhuma tarefa pendente</div>';
    concluidosContainer.innerHTML = buildHtml(concluidos);

    const wrapEl = window.getCalEl('todos-concluidos-wrapper');
    if (wrapEl) wrapEl.style.display = concluidos.length > 0 ? 'block' : 'none';
};

window.fecharModalTodoAdd = function () {
    const el = window.getCalEl('modalTodoAdd');
    if (el) el.classList.add('hidden');
};

window.fecharModalTodoConfirma = function () {
    const el = window.getCalEl('modalTodoConfirma');
    if (el) el.classList.add('hidden');
};

window.abrirModalNovaLista = function () {
    const tituloEl = window.getCalEl('todoAddTextoTitulo');
    const labelEl = window.getCalEl('todoLabelText');
    const inputEl = window.getCalEl('todoIptText');
    const grupoDataEl = window.getCalEl('todoGrupoData');

    if (tituloEl) tituloEl.innerText = 'Nova Lista';
    if (labelEl) labelEl.innerText = 'Dê um nome à sua lista:';
    if (inputEl) inputEl.value = '';
    if (grupoDataEl) grupoDataEl.style.display = 'none';

    const btnConf = window.getCalEl('todoBtnConfirmar');
    if (btnConf) {
        btnConf.onclick = function () {
            const nome = inputEl.value;
            if (!nome || nome.trim() === '') return;
            db.collection('todo_lists').add({
                nome: nome.trim(),
                userId: currentUser.id,
                companyId: currentUser.companyId,
                createdAt: new Date().toISOString()
            }).then(() => window.fecharModalTodoAdd());
        };
    }
    const modalEl = window.getCalEl('modalTodoAdd');
    if (modalEl) modalEl.classList.remove('hidden');
    if (inputEl) inputEl.focus();
};

window.abrirModalNovoTodo = function () {
    const tituloEl = window.getCalEl('todoAddTextoTitulo');
    const labelEl = window.getCalEl('todoLabelText');
    const inputEl = window.getCalEl('todoIptText');
    const inputDataEl = window.getCalEl('todoIptData');
    const grupoDataEl = window.getCalEl('todoGrupoData');

    if (tituloEl) tituloEl.innerText = 'Nova Tarefa';
    if (labelEl) labelEl.innerText = 'O que precisa de ser feito?';
    if (inputEl) inputEl.value = '';

    // Data Local Corrigida (Padrão Hoje para novos To-Dos)
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, '0');
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    const dateInput = `${ano}-${mes}-${dia}`;

    if (inputDataEl) {
        if (inputDataEl._flatpickr) {
            inputDataEl._flatpickr.setDate(dateInput);
        } else {
            inputDataEl.value = dateInput;
            inputDataEl.setAttribute('value', dateInput);
        }
        // Estilo visual conforme solicitado
        inputDataEl.style.border = '1px solid var(--color-primary)';
        inputDataEl.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.1)';
    }

    // Reforço via Timeout para contornar latências de renderização
    setTimeout(() => {
        const elRetry = window.getCalEl('todoIptData') || document.querySelector('#adminPanel:not(.hidden) #todoIptData') || document.querySelector('#employeePanel:not(.hidden) #todoIptData');
        if (elRetry) {
            elRetry.value = dateInput;
            elRetry.setAttribute('value', dateInput);
            elRetry.style.border = '1px solid var(--color-primary)';
        }
    }, 50);

    if (grupoDataEl) grupoDataEl.style.display = 'block';

    const btnConf = window.getCalEl('todoBtnConfirmar');
    if (btnConf) {
        btnConf.onclick = function () {
            const titulo = inputEl ? inputEl.value : '';
            if (!titulo || titulo.trim() === '') return;
            const data = inputDataEl ? inputDataEl.value : '';
            db.collection('todos').add({
                titulo: titulo.trim(),
                done: false,
                dueDate: data || null,
                listId: window.currentTodoListId,
                userId: currentUser.id,
                companyId: currentUser.companyId,
                createdAt: new Date().toISOString()
            }).then(() => window.fecharModalTodoAdd());
        };
    }
    const modalEl = window.getCalEl('modalTodoAdd');
    if (modalEl) modalEl.classList.remove('hidden');
    if (inputEl) inputEl.focus();
};

window.toggleTodoDone = function (id, statusAtual) {
    db.collection('todos').doc(id).update({ done: !statusAtual });
};

window.excluirTodo = function (id) {
    const tituloEl = window.getCalEl('todoConfTitulo');
    const descEl = window.getCalEl('todoConfDesc');
    const btnAcao = window.getCalEl('todoBtnAcaoReal');

    if (tituloEl) tituloEl.innerText = 'Excluir Tarefa?';
    if (descEl) descEl.innerText = 'Esta tarefa será removida permanentemente.';
    if (btnAcao) {
        btnAcao.onclick = function () {
            db.collection('todos').doc(id).delete().then(() => window.fecharModalTodoConfirma());
        };
    }
    const modalEl = window.getCalEl('modalTodoConfirma');
    if (modalEl) modalEl.classList.remove('hidden');
};

window.excluirListaAtual = function () {
    if (window.todoListsGlobais.length <= 1) return alert('Pelo menos uma lista é necessária!');

    const tituloEl = window.getCalEl('todoConfTitulo');
    const descEl = window.getCalEl('todoConfDesc');
    const btnAcao = window.getCalEl('todoBtnAcaoReal');

    if (tituloEl) tituloEl.innerText = 'Excluir esta Lista?';
    if (descEl) descEl.innerText = 'Tudo nela será apagado.';
    if (btnAcao) {
        btnAcao.onclick = function () {
            db.collection('todos').where('listId', '==', window.currentTodoListId).get().then(snap => {
                let batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                batch.commit();
            });
            db.collection('todo_lists').doc(window.currentTodoListId).delete().then(() => {
                window.currentTodoListId = null;
                window.fecharModalTodoConfirma();
            });
        };
    }
    const modalEl = window.getCalEl('modalTodoConfirma');
    if (modalEl) modalEl.classList.remove('hidden');
};

window.switchCalTab = function (tab) {
    const tabCal = window.getCalEl('tabContentCalendario');
    const tabTodo = window.getCalEl('tabContentTodo');
    const btnCal = window.getCalEl('tabBtnCalendario');
    const btnTodo = window.getCalEl('tabBtnTodo');
    if (tab === 'calendario') {
        if (tabCal) tabCal.style.display = 'block';
        if (tabTodo) tabTodo.style.display = 'none';
        if (btnCal) {
            btnCal.style.color = 'var(--color-primary)';
            btnCal.style.borderBottom = '2px solid var(--color-primary)';
        }
        if (btnTodo) {
            btnTodo.style.color = 'var(--color-text-secondary)';
            btnTodo.style.borderBottom = 'none';
        }
    } else {
        if (tabCal) tabCal.style.display = 'none';
        if (tabTodo) tabTodo.style.display = 'block';
        if (btnTodo) {
            btnTodo.style.color = 'var(--color-primary)';
            btnTodo.style.borderBottom = '2px solid var(--color-primary)';
        }
        if (btnCal) {
            btnCal.style.color = 'var(--color-text-secondary)';
            btnCal.style.borderBottom = 'none';
        }
        window.renderizarTodoLists();
    }
};

if (!window.radarTodoAtivado) {
    const originalRadar = window.iniciarRadarCalendario;
    window.iniciarRadarCalendario = function () {
        if (typeof originalRadar === 'function') originalRadar();
        window.iniciarRadarTodo();
    };
    window.radarTodoAtivado = true;
}

