/**
 * 柄（パターン）管理ライブラリ
 * Update: 円描画のバグ修正（パスの干渉による崩れを解消）
 */

(function() {
    // ■■■ 1. 柄の設定データ ■■■
    const config = [
        // 1. 斜めドット
        { 
            id: 1, 
            canvas: { type: 'dot-skew', color: '#ffffff', size: 10, spacing: 60, opacity: 0.9 }, 
            thumbUrl: '' 
        },
        // 2. 太いボーダー
        { 
            id: 2, 
            canvas: { type: 'stripe', color: 'rgba(255,255,255,0.5)', width: 60 }, 
            thumbUrl: '' 
        },
        // 3. 大きなチェック
        { 
            id: 3, 
            canvas: { type: 'check', color: 'rgba(255,255,255,0.3)', size: 80 }, 
            thumbUrl: '' 
        },
        // 4. 大きな市松模様
        { 
            id: 4, 
            canvas: { type: 'ichimatsu', color: 'rgba(255,255,255,0.4)', size: 80 }, 
            thumbUrl: '' 
        },
        // 5. ビッグアーガイル
        { 
            id: 5, 
            canvas: { type: 'argyle', color: 'rgba(255,255,255,0.3)', size: 120 }, 
            thumbUrl: '' 
        },
        // 6. ドット色違い
        {
            id: 6,
            canvas: { 
                type: 'dot-mix', 
                color: 'rgba(180, 243, 234, 0.8)', // 色1
                color2: 'rgba(255, 188, 188, 0.8)', // 色2
                size: 15, 
                spacing: 60 
            },
            thumbUrl: ''
        },
        // 7. ドットサイズ違い
        {
            id: 7,
            canvas: { 
                type: 'dot-size', 
                color: 'rgba(255, 255, 255, 0.8)', 
                size: 10, // 小
                size2: 25, // 大
                spacing: 70 
            },
            thumbUrl: ''
        }
    ];

    // ■■■ 2. 描画ロジック ■■■
    function draw(ctx, w, h, p, scale = 1.0) {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        if (p.opacity) tCtx.globalAlpha = p.opacity;

        const s = p.spacing * scale;

        // ▼ 1. 斜めドット (修正：円ごとにパスをリセット)
        if (p.type === 'dot-skew') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            
            // 真ん中
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz, 0, Math.PI*2); tCtx.fill();
            
            // 四隅 (ひとつずつ描画)
            tCtx.beginPath(); tCtx.arc(0, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz, 0, Math.PI*2); tCtx.fill();
        } 
        // ▼ 6. ドット色違い (修正：円ごとにパスをリセット)
        else if (p.type === 'dot-mix') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;

            // 色1
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz, 0, Math.PI*2); tCtx.fill();

            // 色2
            tCtx.fillStyle = p.color2;
            tCtx.beginPath(); tCtx.arc(0, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz, 0, Math.PI*2); tCtx.fill();
        }
        // ▼ 7. ドットサイズ違い (修正：円ごとにパスをリセット)
        else if (p.type === 'dot-size') {
            const sz1 = p.size * scale;
            const sz2 = p.size2 * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;

            // サイズ1
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz1, 0, Math.PI*2); tCtx.fill();

            // サイズ2
            tCtx.beginPath(); tCtx.arc(0, 0, sz2, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz2, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz2, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz2, 0, Math.PI*2); tCtx.fill();
        }
        // --- 既存の柄 ---
        else if (p.type === 'ichimatsu') {
            const sz = p.size * scale;
            tempCanvas.width = sz * 2; tempCanvas.height = sz * 2;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz, sz); tCtx.fillRect(sz, sz, sz, sz);
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