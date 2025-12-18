// data/parser_ia.js

/**
 * いあキャラ形式のテキストを解析して共通データオブジェクトを作る
 */
export function parseIaChara(text) {
    const d = { 
        id: crypto.randomUUID(), 
        stats:{}, vitals:{}, memo:{}, 
        skills: {combat:[], explore:[], action:[], negotiate:[], knowledge:[], original:[]},
        items: [], scenarioList: [],
        color: '#d9333f', colorHair: '', colorEye: '', colorSkin: ''
    };

    // 正規表現ヘルパー
    const m = (regex) => {
        const match = text.match(regex);
        return match && match[1] ? match[1].trim() : '';
    };

    // 行末までの値を取得 (改行は含まない)
    const getLineVal = (label) => {
        const regex = new RegExp(`^.*${label}[:：][ \\t]*([^\\n]*)`, 'm');
        return m(regex);
    };

    // プロフィール値を取得 (スラッシュ / または 改行 \n まで)
    const getProfileVal = (label) => {
        const regex = new RegExp(`${label}[:：][ \\t]*([^/\\n]*)`);
        return m(regex);
    };

    // ■ 基本情報のパース
    const nameLine = getLineVal('名前');
    const nameMatch = nameLine.match(/^(.+?)[\s　]*[(（](.+?)[)）]/);
    if(nameMatch) { 
        d.name = nameMatch[1].trim(); 
        d.kana = nameMatch[2].trim(); 
    } else { 
        d.name = nameLine; 
    }

    d.tags = getLineVal('タグ');
    d.job = getProfileVal('職業');

    d.age = getProfileVal('年齢'); 
    d.gender = getProfileVal('性別');
    d.height = parseInt(getProfileVal('身長')) || '';
    d.weight = parseInt(getProfileVal('体重')) || '';
    
    // 誕生日
    const rawBirthday = getLineVal('誕生日');
    if(rawBirthday.includes(' / ')) {
        d.birthday = rawBirthday.split(' / ')[0].trim();
    } else {
        d.birthday = rawBirthday;
    }

    d.origin = getProfileVal('出身'); 
    d.birthplace = d.origin; 

    d.colorHair = getProfileVal('髪の色');
    d.colorEye = getProfileVal('瞳の色');
    d.colorSkin = getProfileVal('肌の色');
    
    d.image = m(/画像URL[:：]\s*(\S+)/) || m(/【画像】\n:(\S+)/) || m(/【立ち絵】\n:(\S+)/);
    d.icon = m(/アイコンURL[:：]\s*(\S+)/) || m(/【アイコン】\n:(\S+)/);
    
    d.money = getLineVal('所持金');
    d.debt = getLineVal('借金');

    // ■ ステータス
    const getStat = (name) => {
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

    // ■ 技能解析
    const descMap = {};
    const detailSec = text.split('[技能詳細]')[1];
    if(detailSec) {
        detailSec.split('\n').forEach(l => {
            const match = l.match(/^([^\s…]+)[…\s]+(.+)/);
            if(match) descMap[match[1].trim()] = match[2].trim();
        });
    }

    const lines = text.split('\n');
    let currentCat = null;

    const catMap = {
        '戦闘技能': 'combat',
        '探索技能': 'explore',
        '行動技能': 'action',
        '交渉技能': 'negotiate',
        '知識技能': 'knowledge'
    };

    lines.forEach(l => {
        const line = l.trim();
        if(!line) return;

        // カテゴリヘッダー検出
        const catMatch = line.match(/[『\[【](.*?)[』\]】]/);
        if(catMatch) {
            const catName = catMatch[1];
            if(catMap[catName]) {
                currentCat = catMap[catName];
                return;
            }
        }
        
        // セクション終了判定
        if(line.startsWith('【') && !line.includes('技能')) {
            currentCat = null;
            return;
        }

        // ★修正: 技能行の解析ロジック（空白区切りで後ろから数字をカウントする方式）
        // これにより正規表現の不一致による取りこぼしを防ぎます
        const parts = line.split(/[ \t　]+/); // スペース、タブ、全角スペースで分割
        
        // 後ろから連続する数字の数を数える
        let numCount = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
            if (/^\d+$/.test(parts[i])) {
                numCount++;
            } else {
                break; // 数字以外が来たらストップ
            }
        }

        // 数字が5個以上並んでいれば技能行とみなす
        // (合計, 初期, 職業, 興味, 成長) + (その他)
        if (numCount >= 5) {
            // 数字部分と名前部分を分離
            const nums = parts.slice(parts.length - numCount).map(n => parseInt(n));
            const nameParts = parts.slice(0, parts.length - numCount);
            const name = nameParts.join(' ').trim();

            // ヘッダー行や区切り線を除外
            if (name === '技能名' || name.match(/^-+$/) || !name) return;

            // 数字の割り当て (標準形式: Total, Init, Job, Interest, Growth, Other)
            let total = nums[0];
            let init = nums[1];
            let job = nums[2];
            let interest = nums[3];
            let growth = nums[4];
            let other = nums[5] || 0; // 6列目がなければ0

            const sData = {
                name: name,
                total: total,
                init: init,
                job: job,
                interest: interest,
                growth: growth,
                desc: descMap[name] || '',
                // カテゴリが不明なら original に入れる
                category: currentCat || 'original'
            };
            d.skills[sData.category].push(sData);
        }
    });

    // ■ メモ・リスト系
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