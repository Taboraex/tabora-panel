(() => {
'use strict';

/* Minimal QR encoder (byte mode, EC level L, versions 1–10, mask 0). */
const QR = (() => {
    const EC = { 1:[26,19],2:[44,34],3:[70,55],4:[100,80],5:[134,108],
                 6:[172,136],7:[196,156],8:[242,194],9:[292,232],10:[346,274] };
    const CAP = { 1:17,2:32,3:53,4:78,5:106,6:134,7:154,8:192,9:230,10:271 };
    const ALIGN = { 1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],
                    7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50] };

    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const mul = (a, b) => (!a || !b) ? 0 : EXP[LOG[a] + LOG[b]];

    function gen(deg) {
        let p = [1];
        for (let i = 0; i < deg; i++) {
            const n = new Array(p.length + 1).fill(0);
            for (let j = 0; j < p.length; j++) { n[j] ^= p[j]; n[j + 1] ^= mul(p[j], EXP[i]); }
            p = n;
        }
        return p;
    }

    function ecc(data, len) {
        const g = gen(len), r = new Array(len).fill(0);
        for (const b of data) {
            const f = b ^ r[0];
            r.shift(); r.push(0);
            for (let i = 0; i < len; i++) r[i] ^= mul(g[i + 1], f);
        }
        return r;
    }

    return (text) => {
        const bytes = new TextEncoder().encode(text);
        let v = 0;
        for (let i = 1; i <= 10; i++) if (bytes.length <= CAP[i]) { v = i; break; }
        if (!v) return null;

        const [total, dataLen] = EC[v];
        const size = v * 4 + 17;

        const bits = [];
        const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
        push(4, 4);
        push(bytes.length, v < 10 ? 8 : 16);
        for (const b of bytes) push(b, 8);
        for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
        while (bits.length % 8) bits.push(0);

        const data = [];
        for (let i = 0; i < bits.length; i += 8) {
            data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
        }
        const PAD = [0xec, 0x11];
        while (data.length < dataLen) data.push(PAD[data.length % 2]);

        const cw = [...data, ...ecc(data, total - dataLen)];
        const m = Array.from({ length: size }, () => new Array(size).fill(null));

        const finder = (r, c) => {
            for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
                const y = r + i, xx = c + j;
                if (y < 0 || y >= size || xx < 0 || xx >= size) continue;
                const edge = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                             (j >= 0 && j <= 6 && (i === 0 || i === 6));
                m[y][xx] = edge || (i >= 2 && i <= 4 && j >= 2 && j <= 4) ? 1 : 0;
            }
        };
        finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

        for (const r of ALIGN[v]) for (const c of ALIGN[v]) {
            if (m[r][c] !== null) continue;
            for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
                m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0;
            }
        }

        for (let i = 8; i < size - 8; i++) {
            if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
            if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
        }
        m[size - 8][8] = 1;

        for (let i = 0; i < 9; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
        }
        for (let i = size - 8; i < size; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
        }

        let bi = 0;
        const next = () => {
            const byte = cw[bi >> 3];
            const bit = byte === undefined ? 0 : (byte >> (7 - (bi & 7))) & 1;
            bi++;
            return bit;
        };

        let up = true;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            for (let i = 0; i < size; i++) {
                const row = up ? size - 1 - i : i;
                for (const c of [col, col - 1]) {
                    if (m[row][c] !== null) continue;
                    m[row][c] = next() ^ ((row + c) % 2 === 0 ? 1 : 0);
                }
            }
            up = !up;
        }

        const FORMAT = 0x77c4;
        for (let i = 0; i < 15; i++) {
            const bit = (FORMAT >> i) & 1;
            if (i < 6) m[8][i] = bit;
            else if (i < 8) m[8][i + 1] = bit;
            else if (i === 8) m[7][8] = bit;
            else m[14 - i][8] = bit;
            if (i < 8) m[size - 1 - i][8] = bit;
            else m[8][size - 15 + i] = bit;
        }

        return m.map((row) => row.map((c) => c || 0));
    };
})();

function drawQR(canvas, text) {
    const matrix = QR(text);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!matrix) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Link too long — copy instead', canvas.width / 2, canvas.height / 2);
        return;
    }

    const size = matrix.length;
    const scale = Math.floor(canvas.width / (size + 2));
    const offset = Math.floor((canvas.width - size * scale) / 2);

    ctx.fillStyle = '#000';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c]) ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
        }
    }
}

/* ── page wiring ───────────────────────────────────────────────────────── */

const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
}

document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-copy]');
    if (!btn) return;

    const text = btn.dataset.copy;
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
    showToast('Copied to clipboard');
});

// Status colour + over-quota bar tint.
const status = document.getElementById('status');
status.className = `pill ${status.textContent.trim()}`;

const bar = document.getElementById('bar');
if (parseFloat(bar.style.width) >= 100) bar.parentElement.classList.add('over');

const primary = document.querySelector('.link')?.dataset.url;
if (primary) drawQR(document.getElementById('qr'), primary);

})();
