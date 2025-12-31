// data/parser_ia.js

/**
 * いあキャラ形式のテキストを解析して共通データオブジェクトを作る
 * ユーザー提供の高機能版（正規化＆詳細抽出ロジック）をベースに、
 * schema.js / edit.html との互換性を確保したバージョン
 */
export function parseIaChara(rawText) {
    // 基本オブジェクトの初期化 (edit.htmlが期待する構造)
    const d = {
        name: '', kana: '', job: '', tags: '',
        age: '', gender: '',
        height: '', weight: '', 
        birthday: '', birthplace: '',
        colorHair: '', colorEye: '', colorSkin: '',
        money: '', debt: '',
        image: '', icon: '',
        
        stats: {}, vitals: {}, 
        skills: { combat:[], explore:[], action:[], negotiate:[], knowledge:[], original:[] },
        items: [], weapons: [], 
        memo: {}, // { background, personality, ... }
        
        // 追加要素
        spells: '', 
        encountered: '',
        scenarios: '' // 簡易テキストとして保持
    };

    if (!rawText) return d;

    // ■ STEP 1: テキストの正規化
    // 1. 全角英数字・記号・スペースを半角に変換
    // 2. 制御文字や変な空白を標準スペースに統一
    const text = rawText
        .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英数記号→半角
        .replace(/　/g, ' ') // 全角スペース→半角スペース
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // 改行コード統一

    // ■ ヘルパー関数
    // 指定したキーワードがある行を探し、その後の値を返す
    const getVal = (keyword) => {
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes(keyword)) {
                const parts = line.split(keyword);
                if (parts.length > 1) {
                    let val = parts[1].replace(/^[:：\s]+/, '').trim();
                    if (val.includes('/')) val = val.split('/')[0].trim(); // " / "区切りの場合
                    return val;
                }
            }
        }
        return '';
    };

    // 画像URL抽出
    const getUrl = () => {
        const match = text.match(/(https?:\/\/[^\s\n]+)/);
        return match ? match[1] : '';
    };

    // ■ 基本情報の抽出
    const nameLine = getVal('名前');
    const nameMatch = nameLine.match(/^(.+?)[\s]*[(（](.+?)[)）]/);
    if(nameMatch) { 
        d.name = nameMatch[1].trim(); 
        d.kana = nameMatch[2].trim(); 
    } else { 
        d.name = nameLine; 
    }

    d.job = getVal('職業');
    d.tags = getVal('タグ');
    d.age = getVal('年齢');
    d.gender = getVal('性別');
    d.height = parseInt(getVal('身長')) || '';
    d.weight = parseInt(getVal('体重')) || '';
    d.birthday = getVal('誕生日');
    d.birthplace = getVal('出身') || getVal('出身地'); // edit.htmlは 'birthplace' を使用

    d.colorHair = getVal('髪の色');
    d.colorEye = getVal('瞳の色');
    d.colorSkin = getVal('肌の色');

    d.money = getVal('所持金');
    d.debt = getVal('借金');

    const url = getUrl();
    if (url) {
        d.image = url; 
        d.icon = url;
    }

    // ■ ステータス
    const getStat = (key) => {
        const regex = new RegExp(`${key}[\\s:]+(\\d+)`);
        const m = text.match(regex);
        return m ? parseInt(m[1]) : 0;
    };
    
    d.stats.STR = getStat('STR'); d.stats.CON = getStat('CON');
    d.stats.POW = getStat('POW'); d.stats.DEX = getStat('DEX');
    d.stats.APP = getStat('APP'); d.stats.SIZ = getStat('SIZ');
    d.stats.INT = getStat('INT'); d.stats.EDU = getStat('EDU');
    
    d.vitals.hp = getStat('HP'); 
    d.vitals.mp = getStat('MP');
    
    // SANは現在値を優先 (SAN 70 / 99 形式)
    const sanMatch = text.match(/SAN[\s:]+(\d+)/);
    d.vitals.san = sanMatch ? parseInt(sanMatch[1]) : getStat('SAN');
    
    const dbMatch = text.match(/DB[\s:]+([+\-][\w\d]+)/);
    d.vitals.db = dbMatch ? dbMatch[1] : ''; // edit.htmlは vitals.db を使用

    // ■ 技能解析
    const lines = text.split('\n');
    let currentCat = 'original';
    
    const catKeywords = {
        '戦闘技能': 'combat',
        '探索技能': 'explore',
        '行動技能': 'action',
        '交渉技能': 'negotiate',
        '知識技能': 'knowledge'
    };

    // 技能詳細のテキストを取得
    const descMap = {};
    const skillDetailPart = text.split('[技能詳細]')[1];
    if(skillDetailPart) {
        skillDetailPart.split('\n').forEach(l => {
            const m = l.match(/^([^\s…]+)[…\s]+(.+)/);
            if(m) descMap[m[1].trim()] = m[2].trim();
        });
    }

    lines.forEach(line => {
        const l = line.trim();
        if(!l) return;

        // カテゴリ判定
        for (const [key, val] of Object.entries(catKeywords)) {
            if (l.includes(key)) {
                currentCat = val;
                return;
            }
        }
        if (l.startsWith('【') && !l.includes('技能')) {
            currentCat = 'original';
            return;
        }

        // 技能行判定
        const parts = l.split(/\s+/);
        if (parts.length < 2) return;

        let numCount = 0;
        for (let i = parts.length - 1; i >= Math.max(0, parts.length - 7); i--) {
            if (/^[\d+\-%]+$/.test(parts[i])) numCount++;
            else break; 
        }

        if (numCount >= 5) {
            const numsPart = parts.slice(parts.length - numCount);
            const namePart = parts.slice(0, parts.length - numCount).join(' ');

            if (namePart === '技能名' || /[-=]+/.test(namePart)) return;

            const nums = numsPart.map(n => parseInt(n) || 0);

            // いあキャラ配列: 合計(0), 初期(1), 職業(2), 興味(3), 成長(4), その他(5)
            // edit.html のデータ構造にプッシュ
            if(d.skills[currentCat]) {
                d.skills[currentCat].push({
                    name: namePart,
                    total: nums[0],
                    init: nums[1],
                    job: nums[2],
                    interest: nums[3],
                    growth: nums[4],
                    other: nums[5], // 追加
                    desc: descMap[namePart] || ''
                });
            }
        }
    });

    // ■ メモ・リスト系
    const getSection = (header) => {
        const startIdx = text.indexOf(`【${header}`);
        if (startIdx === -1) return '';
        const sub = text.substring(startIdx + header.length + 2); 
        const endIdx = sub.indexOf('【');
        return (endIdx === -1 ? sub : sub.substring(0, endIdx)).trim();
    };

    const getBracketSec = (header) => {
        const regex = new RegExp(`\\[${header}\\]\\n([\\s\\S]*?)(\\n\\[|$)`);
        const m = text.match(regex);
        return m ? m[1].trim() : '';
    };

    d.memo.background = getBracketSec('経歴') || getSection('経歴');
    d.memo.personality = getBracketSec('性格') || getSection('性格');
    d.memo.relations = getBracketSec('人間関係') || getSection('人間関係');
    d.memo.appearance = getBracketSec('外見') || getSection('外見') || getBracketSec('外見的特徴');
    d.memo.roleplay = getBracketSec('RP補足') || getBracketSec('RP用補足');
    d.memo.memo = getBracketSec('メモ') || getSection('メモ');

    d.spells = getSection('魔術') || getSection('呪文') || (text.match(/〈魔導書、呪文、アーティファクト〉([\s\S]*?)〈/)?.[1] || '').trim();
    d.encountered = getSection('遭遇') || (text.match(/〈遭遇した超自然の存在〉([\s\S]*?)〈/)?.[1] || '').trim();
    
    // シナリオ (簡易テキストとして保持)
    const scenSec = getSection('通過シナリオ') || (text.match(/〈通過したシナリオ名〉([\s\S]*?)($|【)/)?.[1] || '').trim();
    if(scenSec) {
        d.scenarios = scenSec; // edit.html で txtScenarios に入る
    }

    // アイテム
    const itemSec = getSection('所持品');
    if(itemSec) {
        itemSec.split('\n').forEach(l => {
            l = l.trim();
            if(!l || (l.includes('名称') && l.includes('単価'))) return;
            const parts = l.split(/\s+/);
            if(parts.length > 0) {
                const iName = parts[0];
                if (iName.includes('所持金') || iName.includes('借金')) return;
                const iDesc = parts.slice(1).join(' ');
                d.items.push({ name: iName, desc: iDesc });
            }
        });
    }

    // 武器
    const weapSec = getSection('戦闘・武器・防具');
    if(weapSec) {
        weapSec.split('\n').forEach(l => {
            l = l.trim();
            if(!l || l.includes('成功率')) return;
            const parts = l.split(/\s+/);
            // 簡易的に名前だけ抽出 (完全なパースは複雑なため)
            if(parts.length > 0) {
                 d.weapons.push({ name: parts[0], rate: '', damage: '', range: '', attacks: '', capacity: '', hp: '', malfunction: '' });
            }
        });
    }

    return d;
}