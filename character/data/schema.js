// data/schema.js

// ■ データ項目の定義マップ (全ての保存対象データ)
export const FIELD_MAPPING = [
    { key: 'name',      id: 'inpName' },
    { key: 'kana',      id: 'inpKana' },
    { key: 'job',       id: 'inpJob' },
    { key: 'tags',      id: 'inpTags' },
    { key: 'age',       id: 'inpAge' },
    { key: 'gender',    id: 'inpGender' },
    { key: 'birthday',  id: 'inpBirthday' },
    { key: 'birthplace',id: 'inpOrigin' },
    { key: 'height',    id: 'inpHeight' },
    { key: 'weight',    id: 'inpWeight' },
    { key: 'colorHair', id: 'inpHair' },       
    { key: 'colorEye',  id: 'inpEye' },        
    { key: 'colorSkin', id: 'inpSkin' },       
    { key: 'color',     id: 'inpThemeColor' }, 
    { key: 'image',     id: 'inpImageBody' },
    { key: 'icon',      id: 'inpImageIcon' },
    { key: 'money',     id: 'inpMoney' },
    { key: 'debt',      id: 'inpDebt' },
    { key: 'db',        id: 'v_db' },
    { key: 'spells',    id: 'txtSpells' },
    { key: 'growth',    id: 'txtGrowth' },         
    { key: 'encountered', id: 'txtEncountered' },  
    { key: 'weapons',   id: 'txtWeapons' },        
    { key: 'skillList', id: 'txtSkillList' },      
    { key: 'scenarios', id: 'txtScenarios' },                
    { key: 'scenarioDetailsText', id: 'txtScenarioDetails' } 
];

export const STATS_MAPPING = [
    { key: 'STR', id: 's_str' }, { key: 'CON', id: 's_con' },
    { key: 'POW', id: 's_pow' }, { key: 'DEX', id: 's_dex' },
    { key: 'APP', id: 's_app' }, { key: 'SIZ', id: 's_siz' },
    { key: 'INT', id: 's_int' }, { key: 'EDU', id: 's_edu' }
];

export const VITALS_MAPPING = [
    { key: 'hp', id: 'v_hp' }, { key: 'mp', id: 'v_mp' }, { key: 'san', id: 'v_san' }
];

/**
 * いあキャラ形式のテキストを解析して、全ての画面で使える共通データオブジェクトを作る
 */
export function parseIaChara(text) {
    const d = { 
        id: crypto.randomUUID(), 
        stats:{}, vitals:{}, memo:{}, 
        skills: {combat:[], explore:[], action:[], negotiate:[], knowledge:[]},
        items: [], scenarioList: [],
        color: '#d9333f', colorHair: '', colorEye: '', colorSkin: ''
    };

    const m = (regex) => {
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };
    const getProfileVal = (label) => {
        const regex = new RegExp(`${label}[:：]\\s*(.*?)(?:\\s*\\/|$)`, 'm');
        return m(regex);
    };

    const nameLine = m(/名前[:：]\s*(.+)/) || 'Unknown';
    const nameMatch = nameLine.match(/^(.+?)[\s　]*[(（](.+?)[)）]/);
    if(nameMatch) { d.name = nameMatch[1].trim(); d.kana = nameMatch[2].trim(); } 
    else { d.name = nameLine; }

    d.job = getProfileVal('職業');
    d.tags = m(/タグ[:：]\s*(.+)/);
    
    // ★修正: 年齢・身長・体重は数字だけを取り出す
    // parseIntは文字列の先頭から数字の部分だけを読み取るため、"152cm" -> 152 となります
    d.age = parseInt(getProfileVal('年齢')) || '';
    d.gender = getProfileVal('性別');
    d.height = parseInt(getProfileVal('身長')) || '';
    d.weight = parseInt(getProfileVal('体重')) || '';
    
    d.birthday = getProfileVal('誕生日');
    d.origin = getProfileVal('出身'); 
    d.birthplace = d.origin; 

    d.colorHair = getProfileVal('髪の色');
    d.colorEye = getProfileVal('瞳の色');
    d.colorSkin = getProfileVal('肌の色');
    
    d.image = m(/画像URL[:：]\s*(\S+)/) || m(/【画像】\n:(\S+)/) || m(/【立ち絵】\n:(\S+)/);
    d.icon = m(/アイコンURL[:：]\s*(\S+)/) || m(/【アイコン】\n:(\S+)/);
    
    d.money = m(/(?:現在の)?所持金[:：]\s*([^()\n]+)/);
    d.debt = m(/借金[:：]\s*([^()\n]+)/);

    const getStat = (name) => {
        const reg = new RegExp(`${name}[\\s:：]+(\\d+)`);
        return parseInt(m(reg)) || 0;
    };
    d.stats.STR = getStat('STR'); d.stats.CON = getStat('CON');
    d.stats.POW = getStat('POW'); d.stats.DEX = getStat('DEX');
    d.stats.APP = getStat('APP'); d.stats.SIZ = getStat('SIZ');
    d.stats.INT = getStat('INT'); d.stats.EDU = getStat('EDU');
    d.vitals.hp = getStat('HP'); d.vitals.mp = getStat('MP');
    d.vitals.san = parseInt(m(/SAN[:：\s]+(\d+)/)) || getStat('SAN');
    d.db = m(/DB[:：\s]+([+-]\S+)/);

    const descMap = {};
    const detailSec = text.split('[技能詳細]')[1];
    if(detailSec) {
        detailSec.split('\n').forEach(l => {
            const match = l.match(/^([^\s…]+)[…\s]+(.+)/);
            if(match) descMap[match[1].trim()] = match[2].trim();
        });
    }

    const lines = text.split('\n');
    let cat = null;
    lines.forEach(l => {
        l = l.trim();
        if(l.includes('『戦闘技能』')) cat='combat';
        else if(l.includes('『探索技能』')) cat='explore';
        else if(l.includes('『行動技能』')) cat='action';
        else if(l.includes('『交渉技能』')) cat='negotiate';
        else if(l.includes('『知識技能』')) cat='knowledge';
        else if(l.startsWith('【')) cat=null;

        if(cat) {
            const match = l.match(/^([^\d]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
            if(match && match[1].trim()!=='技能名') {
                const n = match[1].trim();
                d.skills[cat].push({
                    name: n, 
                    total: parseInt(match[2]), 
                    init: parseInt(match[3]), 
                    job: parseInt(match[4]), 
                    interest: parseInt(match[5]), 
                    growth: parseInt(match[6]),
                    desc: descMap[n]||'',
                    category: cat
                });
            }
        }
    });

    const getSec = (tag) => {
        const regex = new RegExp(`(?:\\[|【|〈)${tag}(?:\\]|】|〉)([\\s\\S]*?)(?=(?:\\[|【|〈)|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : '';
    };
    
    d.memo.background = getSec('経歴');
    d.memo.personality = getSec('性格');
    d.memo.relations = getSec('人間関係');
    d.memo.appearance = getSec('外見') || getSec('外見的特徴');
    d.memo.roleplay = getSec('RP補足') || getSec('RP用補足');
    d.memo.skillDetails = getSec('技能詳細') || [getSec('職業P振り分け詳細'), getSec('趣味P振り分け詳細')].filter(Boolean).join('\n\n');
    d.memo.memo = getSec('メモ');

    d.spells = getSec('魔導書、呪文、アーティファクト') || getSec('魔術');
    d.encountered = getSec('遭遇した超自然の存在') || getSec('遭遇した神話生物');
    d.growth = getSec('新たに得た知識・経験');
    d.scenarios = getSec('通過したシナリオ名') || getSec('通過シナリオ');

    if (d.scenarios) {
        const titles = d.scenarios.match(/\[(.*?)\]/g);
        if(titles) {
            d.scenarioDetailsText = titles.map(t => `${t}\n(詳細未記入)`).join('\n\n');
        } else {
            d.scenarioDetailsText = d.scenarios;
        }
        const entries = d.scenarios.split(/\n(?=\[)/g);
        d.scenarioList = entries.map(entry => {
            const match = entry.match(/^\[(.*?)\]([\s\S]*)$/);
            if (match) return { title: match[1].trim(), desc: match[2].trim() };
            return { title: entry.trim(), desc: '' };
        }).filter(e => e.title);
    }

    const skillStart = text.indexOf('【技能値】');
    const nextSec = text.match(/【(戦闘|所持品|メモ)/);
    const skillEnd = nextSec ? nextSec.index : text.length;
    if (skillStart !== -1) {
        d.skillList = text.substring(skillStart + 5, skillEnd).trim();
    }

    const wMatch = text.match(/【戦闘・武器・防具】([\s\S]*?)【/);
    if(wMatch) d.weapons = wMatch[1].trim();

    const itemSection = getSec('所持品');
    if(itemSection) {
        const lines = itemSection.split('\n');
        const items = [];
        lines.forEach(line => {
            if(!line.trim() || line.includes('名称') && line.includes('単価')) return;
            const parts = line.trim().split(/\s+/);
            if(parts.length > 0) {
                const name = parts[0];
                let desc = "";
                if(parts.length >= 5) desc = parts.slice(4).join(' ');
                else if(parts.length > 1) desc = parts.slice(1).join(' ');
                items.push(desc ? `${name} : ${desc}` : name);
                d.items.push({name: name, desc: desc});
            }
        });
        d.itemsStr = items.join('\n');
    }

    return d;
}

/**
 * 編集画面用: フォームのデータを収集して保存用オブジェクトを作成する
 */
export function collectFormData(currentData = {}, overwriteEmpty = false) {
    const newData = { ...currentData };
    newData.stats = { ...(currentData.stats || {}) };
    newData.vitals = { ...(currentData.vitals || {}) };

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null; 
    };

    FIELD_MAPPING.forEach(field => {
        const inputVal = getVal(field.id);
        if (inputVal === null) return;

        if (inputVal !== "") {
            newData[field.key] = inputVal;
        } else {
            if (overwriteEmpty) {
                newData[field.key] = "";
            } else {
                if (newData[field.key] === undefined) {
                    newData[field.key] = "";
                }
            }
        }
    });

    const updateNum = (mapping, targetObj) => {
        mapping.forEach(field => {
            const val = getVal(field.id);
            if (val !== null && val !== "") {
                targetObj[field.key] = parseInt(val) || 0;
            }
        });
    };
    updateNum(STATS_MAPPING, newData.stats);
    updateNum(VITALS_MAPPING, newData.vitals);

    const secs = [];
    const getMemo = (id) => getVal(id);
    const add = (t, val) => { if(val) secs.push(`[${t}]\n${val}`); };
    
    add('経歴', getMemo('txtBackground')); 
    add('性格', getMemo('txtPersonality'));
    add('人間関係', getMemo('txtRelations')); 
    add('外見的特徴', getMemo('txtAppearance'));
    add('RP補足', getMemo('txtRoleplay')); 
    add('技能詳細', getMemo('txtSkillDetails'));
    add('メモ', getMemo('txtMemo'));
    
    const newMemo = secs.join('\n\n');
    if (newMemo || overwriteEmpty) {
        newData.memo = newMemo;
    }

    const itemText = getVal('txtItems');
    if (itemText !== null && (itemText !== "" || overwriteEmpty)) {
         const itemLines = itemText.split('\n');
         newData.items = itemLines.filter(l=>l.trim()).map(line => {
            const parts = line.split(/[:：]/);
            if(parts.length > 1) return { name: parts[0].trim(), desc: parts.slice(1).join(':').trim() };
            return { name: line.trim(), desc: '' };
        });
    }

    const scnText = getVal('txtScenarioDetails');
    if (scnText !== null && (scnText !== "" || overwriteEmpty)) {
        const entries = scnText.split(/\n(?=\[)/g);
        newData.scenarioList = entries.map(entry => {
            const match = entry.match(/^\[(.*?)\]([\s\S]*)$/);
            if (match) {
                return { title: match[1].trim(), desc: match[2].trim() };
            }
            const trimmed = entry.trim();
            return trimmed ? { title: trimmed, desc: "" } : null;
        }).filter(e => e);
    }

    return newData;
}