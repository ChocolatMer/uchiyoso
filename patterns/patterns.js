/**
 * 柄（パターン）管理ライブラリ
 * Update: 透明度とサイズを調整し、デザイン崩れと白浮きを修正
 */

(function() {
    // ■■■ 1. 柄の設定データ ■■■
    const config = [
        // 1. 斜めドット (サイズ調整 & 透明度を下げて馴染ませる)
        { 
            id: 1, 
            canvas: { type: 'dot-skew', color: '#ffffff', size: 6, spacing: 30, opacity: 0.5 }, 
            thumbUrl: '' 
        },
        // 2. 太いボーダー (透明度を下げてふんわりさせる)
        { 
            id: 2, 
            canvas: { type: 'stripe', color: '#ffffff', width: 30, opacity: 0.3 }, 
            thumbUrl: '' 
        },
        // 3. ギンガムチェック (サイズを戻し、崩れを修正)
        { 
            id: 3, 
            canvas: { type: 'check', color: '#ffffff', size: 40, opacity: 0.25 }, 
            thumbUrl: '' 
        },
        // 4. 市松模様 (サイズ調整)
        { 
            id: 4, 
            canvas: { type: 'ichimatsu', color: '#ffffff', size: 40, opacity: 0.3 }, 
            thumbUrl: '' 
        },
        // 5. アーガイル (サイズ調整)
        { 
            id: 5, 
            canvas: { type: 'argyle', color: '#ffffff', size: 60, opacity: 0.3 }, 
            thumbUrl: '' 
        },
        // 6. ドット色違い (2色)
        {
            id: 6,
            canvas: { 
                type: 'dot-mix', 
                color: '#b4f3ea', 
                color2: '#ffbcbc', 
                size: 8, 
                spacing: 40,
                opacity: 0.8
            },
            thumbUrl: ''
        },
        // 7. ドットサイズ違い
        {
            id: 7,
            canvas: { 
                type: 'dot-size', 
                color: '#ffffff', 
                size: 6, 
                size2: 12, 
                spacing: 50,
                opacity: 0.5
            },
            thumbUrl: ''
        }
    ];

    // ■■■ 2. 描画ロジック ■■■
    function draw(ctx, w, h, p, scale = 1.0) {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        
        // 透明度を一括適用
        if (p.opacity) tCtx.globalAlpha = p.opacity;

        const s = Math.floor(p.spacing * scale); // ズレ防止のため整数化

        // ▼ 1. 斜めドット
        if (p.type === 'dot-skew') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            
            // 真ん中
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz, 0, Math.PI*2); tCtx.fill();
            // 四隅
            tCtx.beginPath(); tCtx.arc(0, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz, 0, Math.PI*2); tCtx.fill();
        } 
        // ▼ 6. ドット色違い
        else if (p.type === 'dot-mix') {
            const sz = p.size * scale;
            tempCanvas.width = s; tempCanvas.height = s;
            // 色1
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.arc(s/2, s/2, sz, 0, Math.PI*2); tCtx.fill();
            // 色2
            tCtx.fillStyle = p.color2 || p.color;
            tCtx.beginPath(); tCtx.arc(0, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, 0, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(0, s, sz, 0, Math.PI*2); tCtx.fill();
            tCtx.beginPath(); tCtx.arc(s, s, sz, 0, Math.PI*2); tCtx.fill();
        }
        // ▼ 7. ドットサイズ違い
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
            const sz = Math.floor(p.size * scale);
            tempCanvas.width = sz * 2; tempCanvas.height = sz * 2;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, sz, sz); tCtx.fillRect(sz, sz, sz, sz);
        } 
        else if (p.type === 'stripe') {
            const width = Math.floor(p.width * scale);
            const size = width * 2;
            tempCanvas.width = size; tempCanvas.height = size;
            tCtx.fillStyle = p.color;
            tCtx.beginPath();
            tCtx.moveTo(0, size); tCtx.lineTo(size, 0); tCtx.lineTo(size + width, 0); tCtx.lineTo(width, size); tCtx.fill();
            tCtx.beginPath(); tCtx.moveTo(0, 0); tCtx.lineTo(width, 0); tCtx.lineTo(0, width); tCtx.fill();
        } 
        // ▼ 3. ギンガムチェック (修正: 重なりをきれいに表現)
        else if (p.type === 'check') {
            const sz = Math.floor(p.size * scale);
            tempCanvas.width = sz; tempCanvas.height = sz;
            
            // 縦ライン
            tCtx.fillStyle = p.color; 
            tCtx.fillRect(0, 0, sz/2, sz);
            
            // 横ライン (重ね塗りすることで交差部分が濃くなる)
            tCtx.fillRect(0, 0, sz, sz/2);
        } 
        else if (p.type === 'argyle') {
            const sz = Math.floor(p.size * scale);
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