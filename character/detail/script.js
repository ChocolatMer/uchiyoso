// detail/script.js
import { login, logout, monitorAuth, saveToCloud, loadFromCloud } from "../firestore.js";
import { parseIaChara } from "../data/parser_ia.js";

// --- GLOBAL STATE ---
let charData = null;
let charts = { main: null, category: null };

// DOM Elements
const els = {
    globalLoader: document.getElementById('global-loader'), // ★追加
    loaderMsg: document.getElementById('loader-msg'),       // ★追加
    boot: document.getElementById('boot-screen'),
    file: document.getElementById('fileInput'),
    tabs: document.getElementById('skillTabs'),
    listBody: document.getElementById('skillListBody'),
    hideToggle: document.getElementById('hideInitToggle'),
    shortDescToggle: document.getElementById('shortDescToggle'),
    summaryViz: document.getElementById('summaryViz'),
    localSave: document.getElementById('btnLocalSave'),
    localLoad: document.getElementById('btnLocalLoad'),
    modal: document.getElementById('loadDialog'),
    savedList: document.getElementById('savedList'),
    infoTabs: document.getElementById('infoTabs'),
    chartTitle: document.getElementById('chartTitle'),
    chartDesc: document.getElementById('chartDesc'),
    dashboard: document.getElementById('dashboard'),
    themeSwitcher: document.getElementById('themeSwitcher'),
    mainStyle: document.getElementById('mainStyle'),
    flavorList: document.getElementById('statusFlavorList'),
    memoArea: document.getElementById('memoArea')
};

const CAT_COLORS = {
    combat: '#ff4444',
    explore: '#44ff44',
    action: '#ffaa00',
    negotiate: '#d000ff',
    knowledge: '#0088ff',
    summary: '#00f3ff'
};

function adjustHeight(el) {
    if(document.querySelector('.short-view') && !el.matches(':focus') && !el.matches(':hover')) {
        el.style.height = ''; 
        return;
    }
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight + 5) + 'px';
}

// --- EVENTS ---
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');

if(btnLogin) btnLogin.addEventListener('click', login);
if(btnLogout) btnLogout.addEventListener('click', logout);

// --- ★修正: 認証とロードのロジック ---
monitorAuth(
    async (user) => {
        // 1. ログイン/ログアウトボタンの表示切替
        if(btnLogin) btnLogin.classList.add('hidden');
        if(btnLogout) {
            btnLogout.classList.remove('hidden');
            btnLogout.textContent = "DISCONNECT (" + user.displayName + ")";
        }

        // 2. URLパラメータチェック
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');

        if (targetId) {
            // IDがある場合: ロード試行
            if(els.loaderMsg) els.loaderMsg.textContent = "> SEARCHING ARCHIVES...";
            
            try {
                const cloudStore = await loadFromCloud();
                let foundData = null;
                
                if (cloudStore) {
                    if (cloudStore[targetId]) {
                        foundData = cloudStore[targetId];
                    } else {
                        foundData = Object.values(cloudStore).find(char => char && char.id == targetId);
                    }
                }
                
                if (foundData) {
                    // データが見つかった -> ダッシュボード起動
                    if(!foundData.id) foundData.id = targetId; 
                    launchDashboard(foundData);
                    // グローバルローダーを隠す (boot画面は最初からhiddenなのでそのまま)
                    hideGlobalLoader();
                } else {
                    // データが見つからない -> 手動画面へ
                    console.warn("Target ID not found:", targetId);
                    alert("指定されたキャラクターが見つかりませんでした。\n手動モードに移行します。");
                    showManualMode();
                }
            } catch (e) {
                console.error("Auto load failed:", e);
                alert("データ読み込みエラー。\n手動モードに移行します。");
                showManualMode();
            }
        } else {
            // IDがない場合 -> 即座に手動画面へ
            showManualMode();
        }
    },
    () => {
        // ログアウト時の処理
        if(btnLogin) btnLogin.classList.remove('hidden');
        if(btnLogout) btnLogout.classList.add('hidden');
        
        // 未ログイン状態でID指定がないなら手動画面へ
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('id')) {
            showManualMode();
        }
    }
);

// ★追加: モード切り替え用ヘルパー
function hideGlobalLoader() {
    if(els.globalLoader) els.globalLoader.classList.add('hidden');
}

function showManualMode() {
    hideGlobalLoader();
    if(els.boot) els.boot.classList.remove('hidden');
}

// ------------------------------------

els.file.addEventListener('change', handleFile);
els.hideToggle.addEventListener('change', () => renderCurrentTab());

els.shortDescToggle.addEventListener('change', (e) => {
    if(e.target.checked) {
        els.listBody.classList.add('short-view');
        document.querySelectorAll('.skill-desc-inp').forEach(tx => tx.style.height = '');
    } else {
        els.listBody.classList.remove('short-view');
        document.querySelectorAll('.skill-desc-inp').forEach(tx => adjustHeight(tx));
    }
});

els.themeSwitcher.addEventListener('click', () => {
    const currentHref = els.mainStyle.getAttribute('href');
    if (currentHref.includes('style-cork.css')) {
        els.mainStyle.setAttribute('href', 'detail/style.css');
        els.themeSwitcher.textContent = '◆ THEME: CYBER';
    } else {
        els.mainStyle.setAttribute('href', 'detail/style-cork.css');
        els.themeSwitcher.textContent = '◆ THEME: ANALOG';
    }
});

els.tabs.addEventListener('click', (e) => {
    if(e.target.classList.contains('tab')) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        renderSkillSection(e.target.dataset.cat);
    }
});

els.infoTabs.addEventListener('click', (e) => {
    if(e.target.classList.contains('d-tab')) {
        document.querySelectorAll('.d-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        const targetId = e.target.dataset.target;
        document.querySelectorAll('.deck-pane').forEach(p => p.classList.remove('active'));
        const targetPane = document.getElementById(targetId);
        targetPane.classList.add('active');
        targetPane.querySelectorAll('textarea').forEach(tx => adjustHeight(tx));
    }
});

document.querySelectorAll('.swap-btn-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
        els.dashboard.classList.toggle('swapped');
        setTimeout(() => {
            document.querySelectorAll('textarea').forEach(tx => {
                if(tx.offsetParent !== null) adjustHeight(tx);
            });
        }, 300); 
    });
});


function handleFile(e) {
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
        try {
            const d = parseIaChara(ev.target.result);
            launchDashboard(d);
            // 手動読み込み成功時もブート画面を消す
            if(els.boot) els.boot.classList.add('hidden');
        } catch(err) { console.error(err); alert('Parse Error: ' + err.message); }
    };
    r.readAsText(f);
}

function launchDashboard(data) {
    charData = data;
    
    renderProfile(data);
    renderSkillSection('summary'); 
    renderItems(data.items);
    
    const memoEl = document.getElementById('memoArea');
    memoEl.value = data.memo || "";
    requestAnimationFrame(() => adjustHeight(memoEl));
    
    const histBox = document.getElementById('scenarioList');
    if(histBox) {
        histBox.innerHTML = '';
        if(Array.isArray(data.scenarioList) && data.scenarioList.length > 0) {
            data.scenarioList.forEach(scn => {
                const div = document.createElement('div');
                div.className = 'scenario-entry';
                div.style.marginBottom = "15px";
                div.innerHTML = `<h4 style="color:var(--secondary); margin-bottom:5px;">${scn.title}</h4><div style="font-size:0.9rem; color:#aaa;">${scn.desc}</div>`;
                histBox.appendChild(div);
            });
        } else {
            renderSimpleList('scenarioList', data.scenarios, 'scenario-tag');
        }
    }

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || 'No records.'; };
    setTxt('spellsList', data.spells);
    setTxt('entitiesList', data.encountered);

    // ブート画面、グローバルローダーの両方を確実に消す
    hideGlobalLoader();
    if(els.boot) els.boot.classList.add('hidden');
    document.body.classList.add('loaded');
}

// (以下、renderCurrentTab, renderProfile 等の関数は変更なしのため省略。元のコードのまま維持してください)
function renderCurrentTab() {
    const activeCat = document.querySelector('.tab.active').dataset.cat;
    renderSkillSection(activeCat);
}

function renderProfile(d) {
    document.getElementById('charName').textContent = d.name;
    document.getElementById('charKana').textContent = d.kana;
    
    const displayImage = d.icon || d.image || 'https://placehold.co/400x600/000/333?text=NO+IMAGE';
    document.getElementById('charImage').src = displayImage;
    
    document.getElementById('valDB').textContent = d.db; 

    const metaInfo = document.querySelector('.meta-info');
    metaInfo.innerHTML = ''; 

    const infoItems = [
        { label: "JOB", val: d.job },
        { label: "AGE", val: d.age },
        { label: "GENDER", val: d.gender },
        { label: "BIRTH", val: d.birthday },
        { label: "HEIGHT", val: d.height },
        { label: "WEIGHT", val: d.weight }
    ];

    infoItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'meta-item';
        div.innerHTML = `<span class="meta-label">${item.label}</span><span class="meta-val">${item.val || '??'}</span>`;
        metaInfo.appendChild(div);
    });

    const existingColorMod = document.querySelector('.color-module');
    if(existingColorMod) existingColorMod.remove();

    const colorMod = document.createElement('div');
    colorMod.className = 'panel color-module';
    colorMod.innerHTML = `
        <h3>COLOR DATA</h3>
        <div class="color-grid">
            <div class="color-row"><span class="color-name">HAIR</span><span class="color-sample">${d.colorHair || '??'}</span></div>
            <div class="color-row"><span class="color-name">EYES</span><span class="color-sample">${d.colorEye || '??'}</span></div>
            <div class="color-row"><span class="color-name">SKIN</span><span class="color-sample">${d.colorSkin || '??'}</span></div>
            <div class="theme-picker-row">
                <span class="color-name">THEME COLOR</span>
                <input type="color" id="themeColorInput" value="${d.color || '#d9333f'}">
            </div>
        </div>
    `;
    
    const vitalsMod = document.querySelector('.vitals-module');
    if(vitalsMod) {
        vitalsMod.after(colorMod);
    } else {
        document.querySelector('.profile-card').after(colorMod);
    }

    if(d.color) applyThemeColor(d.color);
    const picker = colorMod.querySelector('#themeColorInput');
    picker.addEventListener('input', (e) => {
        d.color = e.target.value;
        applyThemeColor(d.color);
    });


    const tags = document.getElementById('charTags'); tags.innerHTML='';
    if(d.tags) d.tags.split(' ').forEach(t=>{if(t.trim()) tags.innerHTML+=`<span class="tag">${t}</span>`});

    const stats = d.stats || {};
    const maxHP = (stats.CON && stats.SIZ) ? Math.ceil((parseInt(stats.CON) + parseInt(stats.SIZ)) / 2) : (d.vitals.hp || 1);
    const maxMP = stats.POW ? parseInt(stats.POW) : (d.vitals.mp || 1);
    
    let mythosVal = 0;
    if(d.skills) {
        Object.values(d.skills).flat().forEach(s => {
            if(s.name && s.name.includes('クトゥルフ神話')) {
                mythosVal = s.total;
            }
        });
    }
    const maxSAN = 99 - mythosVal;

    setBar('HP', d.vitals.hp, maxHP);
    setBar('MP', d.vitals.mp, maxMP);
    setBar('SAN', d.vitals.san, maxSAN);

    const sGrid = document.getElementById('rawStatsGrid'); sGrid.innerHTML='';
    Object.keys(d.stats).forEach(k => sGrid.innerHTML+=`<div class="stat-box"><small>${k}</small><span>${d.stats[k]}</span></div>`);

    setTimeout(() => {
        const ctx = document.getElementById('mainStatsChart').getContext('2d');
        if(charts.main) charts.main.destroy();
        charts.main = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: Object.keys(d.stats),
                datasets: [{
                    label: 'BASE', data: Object.values(d.stats),
                    backgroundColor: 'rgba(255,0,85,0.2)', borderColor: '#ff0055', borderWidth: 1, pointRadius: 0
                }]
            },
            options: chartOpts(18)
        });
    }, 100);

    renderStatusFlavor(d.stats);
}

function applyThemeColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--ink-red', color);
    root.style.setProperty('--primary', color);
}

function renderStatusFlavor(stats) {
    const list = els.flavorList;
    list.innerHTML = '';
    const flavorDB = window.STATUS_FLAVOR;

    if (!flavorDB) {
        console.warn('STATUS_FLAVOR not loaded');
        return;
    }

    Object.keys(stats).forEach(key => {
        const val = parseInt(stats[key], 10);
        const flavorObj = flavorDB[key];
        
        if (flavorObj && flavorObj[val]) {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="flavor-label">${key} (${val})</span>
                <span class="flavor-text">${flavorObj[val]}</span>
            `;
            list.appendChild(li);
        }
    });
}

function renderSimpleList(id, text, tagClass) {
    const box = document.getElementById(id);
    if(!box) return;
    box.innerHTML = '';
    if(!text) { box.textContent = 'No records.'; return; }
    const lines = text.split('\n');
    lines.forEach(l => {
        if(!l.trim()) return;
        const div = document.createElement('div');
        if(tagClass) div.innerHTML = l.replace(/\[(.*?)\]/g, `<span class="${tagClass}">$1</span>`);
        else div.textContent = l;
        box.appendChild(div);
    });
}

function setBar(id, v, m) {
    const elVal = document.getElementById(`val${id}`);
    const elBar = document.getElementById(`bar${id}`);
    if(elVal) elVal.textContent = `${v}/${m}`;
    const pct = Math.min(100, Math.max(0, (v/m)*100));
    if(elBar) elBar.style.width = pct + '%';
}

function renderSkillSection(cat) {
    const hideInit = els.hideToggle.checked;
    let skillsToRender = [];
    
    if(cat === 'summary') {
        ['combat','explore','action','negotiate','knowledge'].forEach(c => {
            if(charData.skills[c]) {
                skillsToRender = skillsToRender.concat(charData.skills[c]);
            }
        });
    } else {
        skillsToRender = charData.skills[cat] || [];
    }

    skillsToRender.sort((a,b) => b.total - a.total);

    els.listBody.innerHTML = '';
    skillsToRender.forEach(s => {
        if(hideInit && s.total === s.init) return;
        const row = document.createElement('tr');
        row.className = `cat-${s.category || cat}`;

        let badge = '';
        if(s.total >= 90) badge = `<span class="mastery-badge badge-legend">LEGEND</span>`;
        else if(s.total >= 80) badge = `<span class="mastery-badge badge-master">MASTER</span>`;

        const max = 100;
        const pInit = (s.init/max)*100;
        const pJob = (s.job/max)*100;
        const pInt = (s.interest/max)*100;
        const pGrow = (s.growth/max)*100;

        row.innerHTML = `
            <td>
                <div class="skill-name-row">${s.name}${badge}</div>
                <textarea class="skill-desc-inp" placeholder="..." rows="1">${s.desc || ''}</textarea>
            </td>
            <td class="skill-val-cell">${s.total}</td>
            <td>
                <div class="val-row">
                    <span>Init:${s.init}</span>
                    <span style="color:var(--secondary)">Job:${s.job}</span>
                    <span style="color:var(--accent)">Int:${s.interest}</span>
                    <span style="color:var(--grow)">Grow:${s.growth}</span>
                </div>
                <div class="dist-bar-track">
                    <div class="d-init" style="width:${pInit}%"></div>
                    <div class="d-job" style="width:${pJob}%"></div>
                    <div class="d-int" style="width:${pInt}%"></div>
                    <div class="d-grow" style="width:${pGrow}%"></div>
                </div>
            </td>
        `;

        const tx = row.querySelector('textarea');
        tx.addEventListener('input', (e) => { s.desc = e.target.value; adjustHeight(e.target); });
        
        setTimeout(() => adjustHeight(tx), 0);
        
        els.listBody.appendChild(row);
    });
    
    if(els.shortDescToggle.checked) {
        els.listBody.classList.add('short-view');
        els.listBody.querySelectorAll('textarea').forEach(t => t.style.height = '');
    }
    renderTabChart(cat, skillsToRender);
}

function renderTabChart(cat, skills) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if(charts.category) charts.category.destroy();

    let labels = [];
    let data = [];
    let labelText = '';
    let descText = '';
    let chartColor = CAT_COLORS[cat] || CAT_COLORS.summary;

    if (cat === 'summary') {
        const cats = ['combat','explore','action','negotiate','knowledge'];
        const catLabels = ['戦闘','探索','行動','交渉','知識'];
        labels = catLabels;
        data = cats.map(c => {
            if(!charData.skills[c]) return 0;
            const sorted = [...charData.skills[c]].sort((a,b)=>b.total-a.total);
            if(sorted.length === 0) return 0;
            const top = sorted.slice(0, 3);
            const sum = top.reduce((a,b) => a + b.total, 0);
            return sum / top.length;
        });
        labelText = 'BALANCE ANALYSIS';
        descText = 'Average proficiency of top 3 skills per category.';
    } else {
        const topSkills = skills.slice(0, 6); 
        labels = topSkills.map(s => s.name);
        data = topSkills.map(s => s.total);
        labelText = cat.toUpperCase() + ' PROFICIENCY';
        descText = 'Top rated skills in this category.';
    }

    els.chartTitle.textContent = labelText;
    els.chartDesc.textContent = descText;

    setTimeout(() => {
        charts.category = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'VAL', data: data,
                    backgroundColor: chartColor + '33', borderColor: chartColor, borderWidth: 2, pointBackgroundColor: '#fff', pointRadius: 3
                }]
            },
            options: chartOpts(99) 
        });
    }, 100);
}

function renderItems(items) {
    const list = document.getElementById('itemList'); list.innerHTML='';
    if(!items) return;
    items.forEach(i => {
        const d = document.createElement('div');
        d.className = 'item-row';
        d.innerHTML = `<span class="item-name">${i.name}</span><textarea class="item-desc-inp" rows="1">${i.desc || ''}</textarea>`;
        const tx = d.querySelector('textarea');
        tx.addEventListener('input', (e)=>{ i.desc=e.target.value; adjustHeight(e.target); });
        requestAnimationFrame(() => adjustHeight(tx));
        list.appendChild(d);
    });
}

function chartOpts(max) {
    return {
        scales: { r: { 
            angleLines: {color:'rgba(255,255,255,0.1)'}, grid: {color:'rgba(255,255,255,0.1)'},
            pointLabels: {color:'#ddd', font:{size:11, family:'"Zen Kaku Gothic New", sans-serif'}}, 
            suggestedMin:0, suggestedMax:max, 
            ticks:{display:false, backdropColor:'transparent'}
        }},
        plugins: { legend: {display:false} }, maintainAspectRatio: false
    };
}

window.prepareSaveData = function() {
    if(!charData) { alert("データが読み込まれていません。"); return null; }
    const memo = document.getElementById('memoArea');
    if(memo) charData.memo = memo.value;
    return charData; 
};