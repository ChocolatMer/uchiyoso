// data/parser_ia.js

export function parseIaChara(text) {
    const data = {
        name: '', kana: '', job: '', age: '', gender: '',
        height: '', weight: '', birthplace: '',
        colorHair: '', colorEye: '', colorSkin: '',
        stats: {}, vitals: {},
        skills: { combat: [], explore: [], action: [], negotiate: [], knowledge: [], original: [] },
        items: [], weapons: [], memo: {},
        image: '', icon: ''
    };

    const lines = text.split('\n');
    let currentSection = '';

    // セクション判定用の正規表現
    const patterns = {
        basicInfo: /【基本情報】/,
        icon: /【アイコン】/,
        stats: /【能力値】/,
        skills: /【技能値】/,
        weapons: /【戦闘・武器・防具】/,
        items: /【所持品】/,
        memo: /【メモ】/
    };

    const skillCatMap = {
        '『戦闘技能』': 'combat',
        '『探索技能』': 'explore',
        '『行動技能』': 'action',
        '『交渉技能』': 'negotiate',
        '『知識技能』': 'knowledge'
    };
    let currentSkillCat = 'original';

    // 技能行の解析（名前、合計、初期、職業、興味、成長、その他）
    // 例: 回避 67 34 0 30 3 0
    const skillRegex = /^([^\d]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/;

    lines.forEach(line => {
        const t = line.trim();
        if (!t) return;

        // セクション切り替え
        if (patterns.basicInfo.test(t)) { currentSection = 'basic'; return; }
        if (patterns.icon.test(t)) { currentSection = 'icon'; return; }
        if (patterns.stats.test(t)) { currentSection = 'stats'; return; }
        if (patterns.skills.test(t)) { currentSection = 'skills'; return; }
        if (patterns.weapons.test(t)) { currentSection = 'weapons'; return; }
        if (patterns.items.test(t)) { currentSection = 'items'; return; }
        if (patterns.memo.test(t)) { currentSection = 'memo'; return; }

        if (currentSection === 'basic') {
            if (t.startsWith('名前:')) data.name = t.replace('名前:', '').trim().split('(')[0].trim();
            if (t.startsWith('職業:')) data.job = t.replace('職業:', '').trim();
            if (t.includes('年齢:')) {
                const parts = t.split('/');
                parts.forEach(p => {
                    if (p.includes('年齢:')) data.age = p.replace('年齢:', '').trim();
                    if (p.includes('性別:')) data.gender = p.replace('性別:', '').trim();
                    if (p.includes('身長:')) data.height = p.replace('身長:', '').replace('cm', '').trim();
                    if (p.includes('体重:')) data.weight = p.replace('体重:', '').replace('kg', '').trim();
                    if (p.includes('出身:')) data.birthplace = p.replace('出身:', '').trim();
                });
            }
            if (t.includes('髪の色:')) {
                 const parts = t.split('/');
                 parts.forEach(p => {
                    if (p.includes('髪の色:')) data.colorHair = p.replace('髪の色:', '').trim();
                    if (p.includes('瞳の色:')) data.colorEye = p.replace('瞳の色:', '').trim();
                    if (p.includes('肌の色:')) data.colorSkin = p.replace('肌の色:', '').trim();
                 });
            }
        }

        if (currentSection === 'icon') {
            if (t.startsWith(':http')) {
                // いあきゃら形式 :https://...
                const url = t.substring(1).trim();
                if(!data.image) data.image = url; // 立ち絵とアイコンが兼用のことが多い
                data.icon = url;
            }
        }

        if (currentSection === 'stats') {
            const parts = t.split(/\s+/);
            if (parts.length >= 2) {
                const key = parts[0];
                const val = parseInt(parts[1]);
                if (['STR','CON','POW','DEX','APP','SIZ','INT','EDU'].includes(key)) {
                    data.stats[key] = val;
                }
                if (key === 'HP') data.vitals.hp = val;
                if (key === 'MP') data.vitals.mp = val;
                if (key === 'SAN') data.vitals.san = val; // 最大値ではなく現在値を優先したい場合調整
            }
            if (t.includes('現在SAN値')) {
                const m = t.match(/現在SAN値\s+(\d+)/);
                if (m) data.vitals.san = parseInt(m[1]);
            }
            if (t.includes('DB')) {
                data.vitals.db = t.replace('DB', '').trim();
            }
        }

        if (currentSection === 'skills') {
            if (skillCatMap[t]) {
                currentSkillCat = skillCatMap[t];
                return;
            }
            // ヘッダー行はスキップ
            if (t.startsWith('技能名')) return;

            const match = t.match(skillRegex);
            if (match) {
                const name = match[1].trim();
                // 数値データの取得
                const total = parseInt(match[2]) || 0;
                const init = parseInt(match[3]) || 0;
                const job = parseInt(match[4]) || 0;
                const interest = parseInt(match[5]) || 0;
                const growth = parseInt(match[6]) || 0;
                const other = parseInt(match[7]) || 0; // ★これが「その他」

                data.skills[currentSkillCat].push({
                    name: name,
                    total: total,
                    init: init,
                    job: job,
                    interest: interest,
                    growth: growth,
                    other: other, // 保存対象に追加
                    desc: ''
                });
            }
        }

        if (currentSection === 'items') {
            if (!t.startsWith('名称') && !t.startsWith('現在の所持金') && !t.startsWith('借金')) {
                // 簡易解析: 名前と価格等がスペース区切りの場合
                const parts = t.split(/\s{2,}/); // 2つ以上のスペースで区切る
                if (parts.length > 0 && parts[0]) {
                    data.items.push({ name: parts[0], desc: parts.slice(1).join(' ') });
                }
            }
            if (t.startsWith('現在の所持金:')) data.money = t.replace('現在の所持金:', '').trim();
            if (t.startsWith('借金:')) data.debt = t.replace('借金:', '').trim();
        }

        if (currentSection === 'memo') {
            // メモは単純結合するか、タグごとに分ける
            // ここでは単純に文字列として返す（edit.html側で正規表現抽出しているため）
            if (!data.memo.full) data.memo.full = '';
            data.memo.full += line + '\n';
        }
    });
    
    // メモをオブジェクトに格納（edit.htmlの期待する形式へ）
    data.memo = {
        background: extractMemo(data.memo.full, '経歴'),
        personality: extractMemo(data.memo.full, '性格'),
        relations: extractMemo(data.memo.full, '人間関係'),
        appearance: extractMemo(data.memo.full, '外見'),
        roleplay: extractMemo(data.memo.full, 'RP用補足メモ') || extractMemo(data.memo.full, 'RP補足'),
        memo: data.memo.full // 全文も渡しておく
    };

    return data;
}

function extractMemo(fullText, tag) {
    if (!fullText) return '';
    const regex = new RegExp(`【${tag}】\\n([\\s\\S]*?)(\\n【|$)`);
    const m = fullText.match(regex);
    return m ? m[1].trim() : '';
}