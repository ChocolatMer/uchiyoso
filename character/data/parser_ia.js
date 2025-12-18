// data/parser_ia.js

/**
 * いあキャラ形式のテキストを解析して共通データオブジェクトを作る
 * アプローチ: 全文正規化（全角→半角変換）を行ってから解析する
 */
export function parseIaChara(rawText) {
    const d = { 
        id: crypto.randomUUID(), 
        stats:{}, vitals:{}, memo:{}, 
        skills: {combat:[], explore:[], action:[], negotiate:[], knowledge:[], original:[]},
        items: [], scenarioList: [],
        color: '#d9333f', colorHair: '', colorEye: '', colorSkin: ''
    };

    if (!rawText) return d;

    // ■ STEP 1: テキストの正規化 (ここが今回のアプローチの肝)
    // 1. 全角英数字・記号・スペースを半角に変換
    // 2. 制御文字や変な空白を標準スペースに統一
    const text = rawText
        .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英数記号→半角
        .replace(/　/g, ' ') // 全角スペース→半角スペース
        .replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // 改行コード統一

    // ■ ヘルパー関数
    // 指定したキーワードがある行を探し、その後の値を返す
    const getVal = (keyword) => {
        // 行頭または行中にキーワードがあり、コロン等で区切られている箇所を探す
        // エスケープが必要な文字を考慮して動的Regex生成は避ける
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes(keyword)) {
                // キーワード以降を取得
                const parts = line.split(keyword);
                if (parts.length > 1) {
                    // コロンやスペースを除去して先頭の値を取得
                    let val = parts[1].replace(/^[:：\s]+/, '').trim();
                    // 他の項目が同じ行にある場合（" / "区切りなど）、そこでカット
                    if (val.includes('/')) val = val.split('/')[0].trim();
                    return val;
                }
            }
        }
        return '';
    };

    // 画像URL抽出 (URLは :http... の形式が多い)
    const getUrl = () => {
        const match = text.match(/(https?:\/\/[^\s\n]+)/);
        return match ? match[1] : '';
    };

    // ■ 基本情報の抽出
    const nameLine = getVal('名前');
    // 名前 (カナ) の分離
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
    d.origin = getVal('出身') || getVal('出身地');
    d.birthplace = d.origin;

    d.colorHair = getVal('髪の色');
    d.colorEye = getVal('瞳の色');
    d.colorSkin = getVal('肌の色');

    d.money = getVal('所持金');
    d.debt = getVal('借金');

    // 画像 (正規化されているので単純検索)
    const url = getUrl();
    if (url) {
        // アイコンか立ち絵か判定不能な場合が多いが、とりあえず立ち絵にいれる
        d.image = url; 
        // アイコン用にも同じものを入れておく(ユーザーが後で修正)
        d.icon = url;
    }

    // ■ ステータス (STR 13 などの形式)
    const getStat = (key) => {
        const regex = new RegExp(`${key}[\\s:]+(\\d+)`);
        const m = text.match(regex);
        return m ? parseInt(m[1]) : 0;
    };
    
    d.stats.STR = getStat('STR'); d.stats.CON = getStat('CON');
    d.stats.POW = getStat('POW'); d.stats.DEX = getStat('DEX');
    d.stats.APP = getStat('APP'); d.stats.SIZ = getStat('SIZ');
    d.stats.INT = getStat('INT'); d.stats.EDU = getStat('EDU');
    d.vitals.hp = getStat('HP'); d.vitals.mp = getStat('MP');
    // SANは現在値を取得したい (SAN 70 / 99 みたいな形式)
    const sanMatch = text.match(/SAN[\s:]+(\d+)/);
    d.vitals.san = sanMatch ? parseInt(sanMatch[1]) : getStat('SAN');
    
    const dbMatch = text.match(/DB[\s:]+([+\-][\w\d]+)/);
    d.db = dbMatch ? dbMatch[1] : '';

    // ■ 技能解析 (行ベース処理)
    const lines = text.split('\n');
    let currentCat = 'original'; // デフォルトはその他
    
    const catKeywords = {
        '戦闘技能': 'combat',
        '探索技能': 'explore',
        '行動技能': 'action',
        '交渉技能': 'negotiate',
        '知識技能': 'knowledge'
    };

    // 技能詳細のテキストを取得しておく
    const descMap = {};
    const skillDetailPart = text.split('[技能詳細]')[1];
    if(skillDetailPart) {
        skillDetailPart.split('\n').forEach(l => {
            // "技能名…説明" の形式
            const m = l.match(/^([^\s…]+)[…\s]+(.+)/);
            if(m) descMap[m[1].trim()] = m[2].trim();
        });
    }

    lines.forEach(line => {
        const l = line.trim();
        if(!l) return;

        // カテゴリ判定 (『』や【】で囲まれたキーワード)
        for (const [key, val] of Object.entries(catKeywords)) {
            if (l.includes(key)) {
                currentCat = val;
                return;
            }
        }
        // セクションリセット
        if (l.startsWith('【') && !l.includes('技能')) {
            currentCat = 'original';
            return;
        }

        // 技能行判定: 行末が数字の羅列であること
        // スペースで分割
        const parts = l.split(/\s+/);
        if (parts.length < 2) return;

        // 後ろから数字かどうかチェック
        let numCount = 0;
        // 最大でも後ろから6つまでチェックすれば十分
        for (let i = parts.length - 1; i >= Math.max(0, parts.length - 7); i--) {
            // 数値、あるいは "20%" "+10" のような数値っぽい文字列
            if (/^[\d+\-%]+$/.test(parts[i])) {
                numCount++;
            } else {
                // 数字以外が来たらそこで数字列は終わり
                break; 
            }
        }

        // 数字が5個以上連続していれば技能行とみなす (合計, 初期, 職業, 興味, 成長)
        if (numCount >= 5) {
            const numsPart = parts.slice(parts.length - numCount);
            const namePart = parts.slice(0, parts.length - numCount).join(' ');

            // ヘッダー行や区切り線を除外
            if (namePart === '技能名' || /[-=]+/.test(namePart)) return;

            // 数値のパース (安全策)
            const nums = numsPart.map(n => parseInt(n) || 0);

            // データ構築
            // いあキャラ配列: 合計(0), 初期(1), 職業(2), 興味(3), 成長(4), その他(5)
            d.skills[currentCat].push({
                name: namePart,
                total: nums[0],
                init: nums[1],
                job: nums[2],
                interest: nums[3],
                growth: nums[4],
                desc: descMap[namePart] || '',
                category: currentCat
            });
        }
    });

    // ■ メモ・リスト系 (Regexでブロック抽出)
    // 正規化済みなので [ ] ( ) などは半角になっている前提
    const getSection = (header) => {
        // [header] ... [next] までの範囲を取得
        // 正規化しているので、ヘッダーのカッコも半角の可能性が高いが、念のため両対応
        // ただし text変数は replace で変換済み
        // ヘッダーを探す
        const startIdx = text.indexOf(`【${header}`);
        if (startIdx === -1) return '';
        
        const sub = text.substring(startIdx + header.length + 2); // 【header】の後ろ
        // 次の【を探す
        const endIdx = sub.indexOf('【');
        return (endIdx === -1 ? sub : sub.substring(0, endIdx)).trim();
    };

    // 特定のタグ記法 [ ] の中身を取得 (いあキャラのメモ欄など)
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

    d.spells = getSection('魔術') || getSection('呪文') || text.match(/〈魔導書、呪文、アーティファクト〉([\s\S]*?)〈/)?.[1] || '';
    d.encountered = getSection('遭遇') || text.match(/〈遭遇した超自然の存在〉([\s\S]*?)〈/)?.[1] || '';
    
    // シナリオ一覧
    const scenSec = getSection('通過シナリオ') || text.match(/〈通過したシナリオ名〉([\s\S]*?)($|【)/)?.[1] || '';
    if(scenSec) {
        d.scenarioDetailsText = scenSec.trim();
    }

    // アイテム (所持品セクション)
    const itemSec = getSection('所持品');
    if(itemSec) {
        itemSec.split('\n').forEach(l => {
            l = l.trim();
            if(!l || l.includes('名称') && l.includes('単価')) return;
            const parts = l.split(/\s+/);
            if(parts.length > 0) {
                // 名前を取得 (所持金などは除外)
                const iName = parts[0];
                if (iName.includes('所持金') || iName.includes('借金')) return;
                
                // 残りを説明とする
                const iDesc = parts.slice(1).join(' ');
                d.items.push({ name: iName, desc: iDesc });
            }
        });
    }

    // 武器
    const weapSec = getSection('戦闘・武器・防具');
    // ※武器は複雑なので、テキストエリアにそのまま突っ込むか、簡易パースするか
    // 今回は簡易パースはせず、edit.html側でリスト追加してもらう形をとるが、
    // 構造体には入れておく
    if(weapSec) {
        weapSec.split('\n').forEach(l => {
            l = l.trim();
            if(!l || l.includes('成功率')) return;
            const parts = l.split(/\s+/);
            if(parts.length > 5) { // ある程度列があるものだけ
                d.weapons = d.weapons || []; // edit.html側で対応していれば
                // 簡易的に名前だけ抽出、あとは手動修正を期待
                // ここはデータ構造が複雑なので無理にパースしないほうが安全かも
            }
        });
    }

    return d;
}