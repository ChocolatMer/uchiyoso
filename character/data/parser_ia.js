// data/parser_ia.js

/**
 * いあキャラ形式のテキストを解析して共通データオブジェクトを作る
 */
export function parseIaChara(text) {
    const d = { 
        id: crypto.randomUUID(), 
        stats:{}, vitals:{}, memo:{}, 
        skills: {combat:[], explore:[], action:[], negotiate:[], knowledge:[]},
        items: [], scenarioList: [],
        color: '#d9333f', colorHair: '', colorEye: '', colorSkin: ''
    };

    // ヘルパー: 正規表現でマッチした最初のグループを返す
    // ★修正: 正規表現がnullの場合の処理を安全に
    const m = (regex) => {
        const match = text.match(regex);
        return match && match[1] ? match[1].trim() : '';
    };

    // 基本情報のパース (行単位で処理を強化)
    
    // 名前: カッコ内のカナを取得する正規表現
    const nameLine = m(/名前[:：]\s*([^\n]+)/) || '';
    const nameMatch = nameLine.match(/^(.+?)[\s　]*[(（](.+?)[)）]/);
    if(nameMatch) { 
        d.name = nameMatch[1].trim(); 
        d.kana = nameMatch[2].trim(); 
    } else { 
        d.name = nameLine; 
    }

    // ★修正: タグの取得。改行を含まない [ \t]* を使用し、行末までを取得する
    // これにより次の行の「職業:」などを吸い込むのを防ぎます
    d.tags = m(/タグ[:：][ \t]*([^\n]*)/);

    // プロフィール項目の取得ヘルパー (スラッシュ区切りや行末を意識)
    const getProfileVal = (label) => {
        // ラベルの後ろ、スラッシュか改行が来るまでの文字列を取得
        const regex = new RegExp(`${label}[:：]\\s*([^/\\n]*)`);
        return m(regex);
    };

    d.job = getProfileVal('職業');
    
    // 数値項目
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
    
    // 画像URL
    d.image = m(/画像URL[:：]\s*(\S+)/) || m(/【画像】\n:(\S+)/) || m(/【立ち絵】\n:(\S+)/);
    d.icon = m(/アイコンURL[:：]\s*(\S+)/) || m(/【アイコン】\n:(\S+)/);
    
    // 所持金と借金
    d.money = m(/(?:現在の)?所持金[:：]\s*([^()\n]*)/);
    d.debt = m(/^.*借金[:：]\s*([^()\n]*)$/m);

    // ステータス取得
    const getStat = (name) => {
        // STR 13 のような形式。全角スペースなどにも対応
        const reg = new RegExp(`${name}[\\s　:：]+(\\d+)`);
        const val = parseInt(m(reg));
        return isNaN(val) ? 0 : val;
    };
    d.stats.STR = getStat('STR'); d.stats.CON = getStat('CON');
    d.stats.POW = getStat('POW'); d.stats.DEX = getStat('DEX');
    d.stats.APP = getStat('APP'); d.stats.SIZ = getStat('SIZ');
    d.stats.INT = getStat('INT'); d.stats.EDU = getStat('EDU');
    d.vitals.hp = getStat('HP'); d.vitals.mp = getStat('MP');
    d.vitals.san = parseInt(m(/SAN[:：\s]+(\d+)/)) || getStat('SAN');
    d.db = m(/DB[:：\s]+([+-]\S+)/);

    // 技能詳細のマップ作成
    const descMap = {};
    const detailSec = text.split('[技能詳細]')[1];
    if(detailSec) {
        detailSec.split('\n').forEach(l => {
            const match = l.match(/^([^\s…]+)[…\s]+(.+)/);
            if(match) descMap[match[1].trim()] = match[2].trim();
        });
    }

    // 技能リストの解析
    const lines = text.split('\n');
    let cat = null;
    lines.forEach(l => {
        l = l.trim();
        // カテゴリ判定
        if(l.includes('『戦闘技能』')) cat='combat';
        else if(l.includes('『探索技能』')) cat='explore';
        else if(l.includes('『行動技能』')) cat='action';
        else if(l.includes('『交渉技能』')) cat='negotiate';
        else if(l.includes('『知識技能』')) cat='knowledge';
        else if(l.startsWith('【')) cat=null;

        if(cat) {
            // ★修正: 技能のパース正規表現
            // 技能名にはスペースが含まれる可能性があるため(例: 運転(自動車))、
            // 行末から数字をマッチさせる方式に変更して精度を向上
            // 構成: [技能名] [合計] [初期] [職業] [興味] [成長] [その他]
            const match = l.match(/^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+).*$/);
            
            if(match && match[1].trim() !== '技能名') {
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

    // セクション取得ヘルパー
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
                
                if (name.includes('所持金') || name.includes('借金')) return;

                items.push(desc ? `${name} : ${desc}` : name);
                d.items.push({name: name, desc: desc});
            }
        });
        d.itemsStr = items.join('\n');
    }

    return d;
}