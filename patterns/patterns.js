/**
 * 柄（パターン）管理ライブラリ
 * Update: 新規柄の追加（画像のデザインに忠実に再現）、および色変更機能の強化
 */

(function() {
    // ■■■ 0. 色操作用ヘルパー ■■■
    const ColorUtil = {
        // Hex/RGB文字列をRGB配列に変換
        toRgb: (color) => {
            if (!color) return [0, 0, 0];
            if (color.startsWith('rgb')) {
                const m = color.match(/[\d.]+/g);
                return m ? [parseFloat(m[0]), parseFloat(m[1]), parseFloat(m[2])] : [0, 0, 0];
            }
            if (color.startsWith('#')) {
                let hex = color.slice(1);
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                const bigInt = parseInt(hex, 16);
                return [(bigInt >> 16) & 255, (bigInt >> 8) & 255, bigInt & 255];
            }
            return [0, 0, 0];
        },
        // 色の明るさを変更 (amt: -1.0(黒) ~ 1.0(白))
        shade: (color, amt) => {
            const rgb = ColorUtil.toRgb(color);
            const t = amt < 0 ? 0 : 255;
            const p = amt < 0 ? amt * -1 : amt;
            const r = Math.round((t - rgb[0]) * p) + rgb[0];
            const g = Math.round((t - rgb[1]) * p) + rgb[1];
            const b = Math.round((t - rgb[2]) * p) + rgb[2];
            return `rgb(${r},${g},${b})`;
        },
        // 透明度を適用
        alpha: (color, opacity) => {
            const rgb = ColorUtil.toRgb(color);
            return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity})`;
        }
    };

    // ■■■ 1. 柄の設定データ ■■■
    const config = [
        // --- 既存の柄 (ID: 1~7) ---
        { id: 1, canvas: { type: 'dot-skew', color: '#ffffff', size: 10, spacing: 60, opacity: 0.9 }, thumbUrl: '' },
        { id: 2, canvas: { type: 'stripe', color: 'rgba(255,255,255,0.5)', width: 60 }, thumbUrl: '' },
        { id: 3, canvas: { type: 'check', color: 'rgba(255,255,255,0.3)', size: 80 }, thumbUrl: '' },
        { id: 4, canvas: { type: 'ichimatsu', color: 'rgba(255,255,255,0.4)', size: 80 }, thumbUrl: '' },
        { id: 5, canvas: { type: 'argyle', color: 'rgba(255,255,255,0.3)', size: 120 }, thumbUrl: '' },
        { id: 6, canvas: { type: 'dot-mix', color: 'rgba(180, 243, 234, 0.8)', color2: 'rgba(255, 188, 188, 0.8)', size: 15, spacing: 60 }, thumbUrl: '' },
        { id: 7, canvas: { type: 'dot-size', color: 'rgba(255, 255, 255, 0.8)', size: 10, size2: 25, spacing: 70 }, thumbUrl: '' },

        // --- ▼ 追加の柄 (画像のデザインを再現) ▼ ---
        
        // 8. チョコレート
        // 特徴: 板チョコのような立体感。基本色を変更すると全体のトーンが変わるように設計。
        {
            id: 8,
            canvas: {
                type: 'chocolate',
                color: '#693319', // ベースのチョコ色
                size: 40
            },
            thumbUrl: ''
        },
        // 9. クッション (アーガイル/キルティング風)
        // 特徴: ボタン留めされたようなふっくらしたデザイン。
        {
            id: 9,
            canvas: {
                type: 'cushion',
                color: '#6e2c12', // ベース色（濃い茶色）
                color2: '#9e4624', // 明るい部分
                size: 80
            },
            thumbUrl: ''
        },
        // 10. お花柄 (レトロ)
        // 特徴: 4枚花びらのレトロな花。
        {
            id: 10,
            canvas: {
                type: 'flower',
                color: '#003583', // 花びら (紺)
                color2: '#f6f0e2', // 背景 (クリーム)
                color3: '#f69524', // 花芯 (オレンジ)
                size: 60
            },
            thumbUrl: ''
        },
        // 11. パズル柄
        // 特徴: ピースが噛み合ったデザイン。基本色から濃淡を自動生成。
        {
            id: 11,
            canvas: {
                type: 'puzzle',
                color: '#4b2889', // メインの紫 (濃い色)
                color2: '#673ab7', // サブの紫 (明るい色)
                size: 50
            },
            thumbUrl: ''
        },
        // 12. ミステリー (扇形サークル)
        // 特徴: 黒背景に4色の扇形で作られた円。
        {
            id: 12,
            canvas: {
                type: 'mystery',
                color: '#1a2030', // 背景色 (黒に近い紺)
                colors: ['#0f9177', '#fdebad', '#d34434', '#b5d999'], // 扇形の色 (緑, 黄, 赤, 薄緑)
                size: 100
            },
            thumbUrl: ''
        }
    ];

    // ■■■ 2. 描画ロジック ■■■
    function draw(ctx, w, h, p, scale = 1.0) {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        if (p.opacity) tCtx.globalAlpha = p.opacity;

        const s = (p.spacing || p.size) * scale;

        // --- 共通ヘルパー: 描画用 ---
        const fillRect = (c, x, y, w, h) => { tCtx.fillStyle = c; tCtx.fillRect(x, y, w, h); };
        const fillCircle = (c, x, y, r) => { tCtx.fillStyle = c; tCtx.beginPath(); tCtx.arc(x, y, r, 0, Math.PI*2); tCtx.fill(); };

        // ▼ 8. チョコレート (立体ブロック)
        if (p.type === 'chocolate') {
            const sz = p.size * scale;
            const blockW = sz * 2; 
            const blockH = sz * 1.4;
            tempCanvas.width = blockW; tempCanvas.height = blockH;

            const baseColor = p.color;
            const highlight = ColorUtil.alpha('#ffffff', 0.2);
            const shadow = ColorUtil.alpha('#000000', 0.2);
            const darkShadow = ColorUtil.alpha('#000000', 0.4);

            // 全体ベース
            fillRect(baseColor, 0, 0, blockW, blockH);

            // ブロックの立体表現
            const pad = sz * 0.1;
            const innerW = blockW - pad * 2;
            const innerH = blockH - pad * 2;

            // 溝（暗い色）
            tCtx.fillStyle = darkShadow;
            tCtx.fillRect(0, 0, blockW, blockH);
            
            // ブロック本体（ベース色）
            tCtx.fillStyle = baseColor;
            tCtx.fillRect(pad, pad, innerW, innerH);

            // ハイライト（左と上）
            tCtx.fillStyle = highlight;
            tCtx.beginPath();
            tCtx.moveTo(pad, pad + innerH); tCtx.lineTo(pad, pad); tCtx.lineTo(pad + innerW, pad);
            tCtx.lineTo(pad + innerW - pad, pad + pad); tCtx.lineTo(pad + pad, pad + pad); tCtx.lineTo(pad + pad, pad + innerH - pad);
            tCtx.fill();

            // シャドウ（右と下）
            tCtx.fillStyle = shadow;
            tCtx.beginPath();
            tCtx.moveTo(pad + innerW, pad); tCtx.lineTo(pad + innerW, pad + innerH); tCtx.lineTo(pad, pad + innerH);
            tCtx.lineTo(pad + pad, pad + innerH - pad); tCtx.lineTo(pad + innerW - pad, pad + innerH - pad); tCtx.lineTo(pad + innerW - pad, pad + pad);
            tCtx.fill();
            
            // トップ面
            const topPad = pad * 2;
            tCtx.fillStyle = ColorUtil.shade(baseColor, 0.05); // 少し明るく
            tCtx.fillRect(topPad, topPad, blockW - topPad * 2, blockH - topPad * 2);
        }

        // ▼ 9. クッション (アーガイル/キルティング)
        else if (p.type === 'cushion') {
            const sz = p.size * scale;
            tempCanvas.width = sz; tempCanvas.height = sz;

            const c1 = p.color; // 濃い色 (背景)
            const c2 = p.color2 || ColorUtil.shade(c1, 0.4); // 明るい色 (中央)
            const cShadow = ColorUtil.alpha('#000000', 0.3);

            // 背景
            fillRect(c1, 0, 0, sz, sz);

            // 菱形グラデーションの模倣
            const grad = tCtx.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/1.5);
            grad.addColorStop(0, c2);
            grad.addColorStop(0.6, c1);
            grad.addColorStop(1, c1);
            tCtx.fillStyle = grad;
            
            // 菱形クリップして描画
            tCtx.beginPath();
            tCtx.moveTo(sz/2, 0); tCtx.lineTo(sz, sz/2); tCtx.lineTo(sz/2, sz); tCtx.lineTo(0, sz/2);
            tCtx.fill();

            // ボタン（四隅と中央）
            const btnR = sz * 0.06;
            const drawBtn = (x, y) => {
                // 影
                fillCircle(cShadow, x + 1, y + 1, btnR);
                // ボタン本体 (さらに濃い色)
                fillCircle(ColorUtil.shade(c1, -0.2), x, y, btnR);
            };

            drawBtn(sz/2, sz/2);
            drawBtn(0, 0); drawBtn(sz, 0); drawBtn(0, sz); drawBtn(sz, sz);
        }

        // ▼ 10. お花柄
        else if (p.type === 'flower') {
            const sz = p.size * scale;
            tempCanvas.width = sz; tempCanvas.height = sz;

            const petalColor = p.color;
            const bgColor = p.color2 || '#fff';
            const centerColor = p.color3 || '#fa0';

            // 背景
            fillRect(bgColor, 0, 0, sz, sz);

            // 花びら (4枚)
            const cx = sz/2, cy = sz/2;
            const r = sz * 0.28;
            
            tCtx.fillStyle = petalColor;
            tCtx.beginPath();
            tCtx.arc(cx - r, cy, r, 0, Math.PI*2); // 左
            tCtx.arc(cx + r, cy, r, 0, Math.PI*2); // 右
            tCtx.arc(cx, cy - r, r, 0, Math.PI*2); // 上
            tCtx.arc(cx, cy + r, r, 0, Math.PI*2); // 下
            tCtx.fill();

            // 花の中心
            fillCircle(centerColor, cx, cy, r * 0.7);
        }

        // ▼ 11. パズル柄
        else if (p.type === 'puzzle') {
            const sz = p.size * scale;
            const unit = sz; 
            tempCanvas.width = unit * 2; tempCanvas.height = unit * 2;

            // 色設定: color2がなければ color から自動生成
            const cDark = p.color; 
            const cLight = p.color2 || ColorUtil.shade(cDark, 0.2);

            const r = unit * 0.25; // 凸凹の半径

            // --- 市松模様ベース ---
            fillRect(cDark, 0, 0, unit, unit);       // 左上
            fillRect(cLight, unit, 0, unit, unit);   // 右上
            fillRect(cLight, 0, unit, unit, unit);   // 左下
            fillRect(cDark, unit, unit, unit, unit); // 右下

            // --- 凸凹 (円で表現) ---
            // 1. 左上(Dark)から右へ凸 (Dark円)
            fillCircle(cDark, unit, unit/2, r);

            // 2. 左上(Dark)の下側は凹 -> つまり左下(Light)が上に凸 (Light円)
            fillCircle(cLight, unit/2, unit, r);

            // 3. 右上(Light)の下側へ凸 (Light円)
            fillCircle(cLight, unit + unit/2, unit, r);

            // 4. 右下(Dark)から左へ凸 (Dark円) -> 左下(Light)に食い込む
            fillCircle(cDark, unit, unit + unit/2, r);

            // 注: 円の重なり順序によってパズルの噛み合わせが変わる
            // ここでは簡易的に実装しているが、視覚的にはパズルに見える
        }

        // ▼ 12. ミステリー (扇形サークル)
        else if (p.type === 'mystery') {
            const sz = p.size * scale;
            const hSz = sz / 2;
            tempCanvas.width = sz; tempCanvas.height = sz;

            const bg = p.color; // 背景色
            
            // 扇形の色: colors配列がなければ color をベースに生成
            let fans = p.colors;
            if (!fans || fans.length < 4) {
                // colorを基準に色相をずらしたり明度を変えたりして4色作る
                fans = [
                    ColorUtil.shade(p.color, 0.4),  // 明るい
                    ColorUtil.shade(p.color, 0.2), 
                    ColorUtil.shade(p.color, -0.1), 
                    ColorUtil.shade(p.color, -0.3)  // 暗い
                ];
            }

            // 背景塗りつぶし
            fillRect(bg, 0, 0, sz, sz);

            // 扇形を描く関数
            const drawPie = (x, y, radius, startAngle, endAngle, color) => {
                tCtx.beginPath();
                tCtx.moveTo(x, y);
                tCtx.arc(x, y, radius, startAngle, endAngle);
                tCtx.closePath();
                tCtx.fillStyle = color;
                tCtx.fill();
            };

            // 円（4色の扇形）を描画
            // 画像(右下)は千鳥配置ではなく整列配置に見えるが、
            // CSSの background-position: ... calc(s/2) から千鳥配置の可能性もある。
            // ここでは中央と四隅に配置してパターン化する（千鳥配置）
            
            const r = sz * 0.35; // 円の半径
            
            // 描画セット (x, y)
            const points = [
                {x: 0, y: 0}, 
                {x: sz, y: 0}, 
                {x: 0, y: sz}, 
                {x: sz, y: sz}, 
                {x: sz/2, y: sz/2}
            ];

            points.forEach(pt => {
                // 4つの扇形 (TopRight, BottomRight, BottomLeft, TopLeft)
                // 0rad = 3時方向
                drawPie(pt.x, pt.y, r, Math.PI*1.5, Math.PI*2, fans[0]); // 右上
                drawPie(pt.x, pt.y, r, 0, Math.PI*0.5, fans[1]);         // 右下
                drawPie(pt.x, pt.y, r, Math.PI*0.5, Math.PI, fans[2]);   // 左下
                drawPie(pt.x, pt.y, r, Math.PI, Math.PI*1.5, fans[3]);   // 左上
            });
        }

        // --- 既存の柄 (変更なし) ---
        else if (p.type === 'dot-skew') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            fillCircle(p.color, s/2, s/2, sz);
            fillCircle(p.color, 0, 0, sz); fillCircle(p.color, s, 0, sz);
            fillCircle(p.color, 0, s, sz); fillCircle(p.color, s, s, sz);
        } 
        else if (p.type === 'dot-mix') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            fillCircle(p.color, s/2, s/2, sz);
            fillCircle(p.color2, 0, 0, sz); fillCircle(p.color2, s, 0, sz);
            fillCircle(p.color2, 0, s, sz); fillCircle(p.color2, s, s, sz);
        }
        else if (p.type === 'dot-size') {
            const sz1 = p.size * scale;
            const sz2 = p.size2 * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            fillCircle(p.color, s/2, s/2, sz1);
            fillCircle(p.color, 0, 0, sz2); fillCircle(p.color, s, 0, sz2);
            fillCircle(p.color, 0, s, sz2); fillCircle(p.color, s, s, sz2);
        }
        else if (p.type === 'ichimatsu') {
            const sz = p.size * scale;
            tempCanvas.width = sz * 2; tempCanvas.height = sz * 2;
            fillRect(p.color, 0, 0, sz, sz); fillRect(p.color, sz, sz, sz, sz);
        } 
        else if (p.type === 'stripe') {
            const width = p.width * scale;
            const size = width * 2;
            tempCanvas.width = size; tempCanvas.height = size;
            tCtx.fillStyle = p.color;
            tCtx.beginPath();
            tCtx.moveTo(0, size); tCtx.lineTo(size, 0); tCtx.lineTo(size + width, 0); tCtx.lineTo(width, size); tCtx.fill();
            tCtx.beginPath(); tCtx.moveTo(0, 0); tCtx.lineTo(width, 0); tCtx.lineTo(0, width); tCtx.fill();
        } 
        else if (p.type === 'check') {
            const sz = p.size * scale;
            tempCanvas.width = sz; tempCanvas.height = sz;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz, sz/2);
            tCtx.globalCompositeOperation = 'source-over'; 
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz/2, sz);
        } 
        else if (p.type === 'argyle') {
            const sz = p.size * scale;
            tempCanvas.width = sz; tempCanvas.height = sz;
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.moveTo(sz/2, 0); tCtx.lineTo(sz, sz/2); tCtx.lineTo(sz/2, sz); tCtx.lineTo(0, sz/2); tCtx.fill();
            tCtx.strokeStyle = "rgba(255,255,255,0.6)"; tCtx.lineWidth = 1 * scale;
            tCtx.beginPath(); tCtx.moveTo(0,0); tCtx.lineTo(sz, sz); tCtx.moveTo(sz,0); tCtx.lineTo(0, sz); tCtx.stroke();
        } 

        const pattern = ctx.createPattern(tempCanvas, 'repeat');
        ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h);
    }

    window.ChartPatternLibrary = { config: config, draw: draw };
})();