/**
 * 柄（パターン）管理ライブラリ
 * Update: 全体的に柄を大きく、間隔を広く調整
 */

(function() {
    // ■■■ 1. 柄の設定データ ■■■
    // ここに新しい柄のデータを追加します
    const config = [
        // 1. 大きな水玉
        { 
            id: 1, 
            canvas: { type: 'dot', color: '#ffffff', size: 12, spacing: 60, opacity: 0.9 }, 
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
        // 6. 大きなハート
        {
            id: 6,
            canvas: { type: 'heart', color: 'rgba(255,255,255,0.7)', size: 50, spacing: 110 },
            thumbUrl: ''
        },
        // 7. ポップな星
        {
            id: 7,
            canvas: { type: 'star', color: 'rgba(255,255,255,0.8)', size: 40, spacing: 100 },
            thumbUrl: ''
        },
        // 8. 太い斜めストライプ
        {
            id: 8,
            canvas: { type: 'diagonal', color: 'rgba(255,255,255,0.4)', width: 50 },
            thumbUrl: ''
        }
    ];

    // ■■■ 2. 描画ロジック（共通関数） ■■■
    // ここに新しい柄の「描き方」を追加します
    function draw(ctx, w, h, p) {
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d');
        if (p.opacity) tCtx.globalAlpha = p.opacity;

        if (p.type === 'dot') {
            tempCanvas.width = p.spacing; tempCanvas.height = p.spacing;
            tCtx.fillStyle = p.color; tCtx.beginPath(); tCtx.arc(p.spacing/2, p.spacing/2, p.size, 0, Math.PI*2); tCtx.fill();
        } else if (p.type === 'ichimatsu') {
            tempCanvas.width = p.size * 2; tempCanvas.height = p.size * 2;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, p.size, p.size); tCtx.fillRect(p.size, p.size, p.size, p.size);
        } else if (p.type === 'stripe') {
            const size = p.width * 2;
            tempCanvas.width = size; tempCanvas.height = size;
            tCtx.fillStyle = p.color;
            tCtx.beginPath();
            tCtx.moveTo(0, size); tCtx.lineTo(size, 0); tCtx.lineTo(size + p.width, 0); tCtx.lineTo(p.width, size); tCtx.fill();
            tCtx.beginPath(); tCtx.moveTo(0, 0); tCtx.lineTo(p.width, 0); tCtx.lineTo(0, p.width); tCtx.fill();
        } else if (p.type === 'check') {
            tempCanvas.width = p.size; tempCanvas.height = p.size;
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, p.size, p.size/2);
            tCtx.globalCompositeOperation = 'source-over'; 
            tCtx.fillStyle = p.color; tCtx.fillRect(0, 0, p.size/2, p.size);
        } else if (p.type === 'argyle') {
            tempCanvas.width = p.size; tempCanvas.height = p.size;
            tCtx.fillStyle = p.color;
            tCtx.beginPath(); tCtx.moveTo(p.size/2, 0); tCtx.lineTo(p.size, p.size/2); tCtx.lineTo(p.size/2, p.size); tCtx.lineTo(0, p.size/2); tCtx.fill();
            tCtx.strokeStyle = "rgba(255,255,255,0.6)"; tCtx.lineWidth = 1;
            tCtx.beginPath(); tCtx.moveTo(0,0); tCtx.lineTo(p.size, p.size); tCtx.moveTo(p.size,0); tCtx.lineTo(0, p.size); tCtx.stroke();
        } else if (p.type === 'heart') {
            const s = p.spacing;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            const hs = p.size; const hx = s/2; const hy = s/2;
            tCtx.beginPath();
            tCtx.moveTo(hx, hy + hs/2);
            tCtx.bezierCurveTo(hx - hs, hy - hs/2, hx - hs, hy - hs, hx, hy - hs/2);
            tCtx.bezierCurveTo(hx + hs, hy - hs, hx + hs, hy - hs/2, hx, hy + hs/2);
            tCtx.fill();
        } else if (p.type === 'star') {
            const s = p.spacing;
            tempCanvas.width = s; tempCanvas.height = s;
            tCtx.fillStyle = p.color;
            const cx = s/2; const cy = s/2;
            const spikes = 5; const outerRadius = p.size; const innerRadius = p.size/2;
            let rot = Math.PI / 2 * 3; let x = cx; let y = cy; const step = Math.PI / spikes;
            tCtx.beginPath(); tCtx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius; y = cy + Math.sin(rot) * outerRadius; tCtx.lineTo(x, y); rot += step;
                x = cx + Math.cos(rot) * innerRadius; y = cy + Math.sin(rot) * innerRadius; tCtx.lineTo(x, y); rot += step;
            }
            tCtx.lineTo(cx, cy - outerRadius); tCtx.fill();
        } else if (p.type === 'diagonal') {
            const w = p.width; const size = w * 2;
            tempCanvas.width = size; tempCanvas.height = size;
            tCtx.strokeStyle = p.color; tCtx.lineWidth = w/2; tCtx.lineCap = 'butt';
            tCtx.beginPath(); tCtx.moveTo(-w, size); tCtx.lineTo(size, -w); tCtx.stroke();
            tCtx.beginPath(); tCtx.moveTo(0, size + w); tCtx.lineTo(size + w, 0); tCtx.stroke();
        }

        const pattern = ctx.createPattern(tempCanvas, 'repeat');
        ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h);
    }

    window.ChartPatternLibrary = { config: config, draw: draw };
})();