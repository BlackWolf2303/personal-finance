const SLIDER_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];
const TRACK_EMPTY = '#ddd7ce';

function formatVND(n) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
}

function shortVND(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
    if (n >= 1e6) return Math.round(n / 1e6) + 'tr';
    return Math.round(n / 1000) + 'k';
}

function calcFV(pmt, annualRate, years) {
    const r = annualRate / 12;
    const n = years * 12;
    return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

function getRawIncome() {
    return document.getElementById('income-input')._raw || 0;
}

function getPcts() {
    return [1, 2, 3, 4].map(i => {
        const v = parseInt(document.getElementById('pct-' + i).value);
        return isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
    });
}

function updateSliderBg(index, pct) {
    const slider = document.getElementById('slider-' + index);
    const color = SLIDER_COLORS[index - 1];
    slider.style.background = `linear-gradient(to right, ${color} ${pct}%, ${TRACK_EMPTY} ${pct}%)`;
}

function updateHook() {
    const income = getRawIncome();
    const pct1 = parseInt(document.getElementById('pct-1').value) || 0;
    const pmt = income > 0 ? income * pct1 / 100 : 1000000;
    const isExample = income === 0;

    const fv = calcFV(pmt, 0.16, 10);
    const principal = pmt * 120;
    const gain = fv - principal;
    const principalPct = (principal / fv * 100).toFixed(1);
    const gainPct = (gain / fv * 100).toFixed(1);

    document.getElementById('hook-monthly').textContent = formatVND(pmt);
    document.getElementById('hook-result').textContent = formatVND(Math.round(fv));
    document.getElementById('hook-from-jar').textContent = isExample
        ? 'ví dụ minh hoạ'
        : 'từ Hũ 1 của bạn (' + pct1 + '%)';
    document.getElementById('hook-principal').textContent = shortVND(principal);
    document.getElementById('hook-gain').textContent = '+' + shortVND(gain);
    document.getElementById('hook-bar-principal').style.width = principalPct + '%';
    document.getElementById('hook-bar-gain').style.width = gainPct + '%';
}

function updateCalc() {
    const income = getRawIncome();
    const pcts = getPcts();
    const total = pcts.reduce((a, b) => a + b, 0);

    pcts.forEach((pct, idx) => {
        document.getElementById('amount-' + (idx + 1)).textContent = income > 0
            ? formatVND(income * pct / 100)
            : 'Nhập thu nhập để tính';
    });

    const barTotal = total > 0 ? total : 100;
    pcts.forEach((pct, idx) => {
        document.getElementById('bar-' + (idx + 1)).style.width = ((pct / barTotal) * 100) + '%';
    });

    pcts.forEach((pct, idx) => updateSliderBg(idx + 1, pct));
    updateHook();

    const badge = document.getElementById('total-badge');
    const unallocRow = document.getElementById('unalloc-row');
    const unallocText = document.getElementById('unalloc-text');

    badge.textContent = total + '%';

    if (total === 100) {
        badge.className = 'text-sm font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 transition-all';
        unallocRow.className = 'hidden';
    } else if (total < 100) {
        badge.className = 'text-sm font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 transition-all';
        unallocRow.className = 'text-sm text-center py-2 px-4 rounded-xl bg-amber-50 text-amber-700 font-medium';
        const rem = 100 - total;
        unallocText.textContent = 'Còn ' + rem + '% chưa phân bổ'
            + (income > 0 ? ' (' + formatVND(income * rem / 100) + ')' : '');
    } else {
        badge.className = 'text-sm font-bold px-3 py-1 rounded-full bg-red-100 text-red-600 transition-all';
        unallocRow.className = 'text-sm text-center py-2 px-4 rounded-xl bg-red-50 text-red-600 font-medium';
        unallocText.textContent = 'Vượt ' + (total - 100) + '% — tổng không thể quá 100%';
    }
}

function sumOthers(skipIndex) {
    return [1, 2, 3, 4].filter(j => j !== skipIndex)
        .reduce((a, j) => a + (parseInt(document.getElementById('pct-' + j).value) || 0), 0);
}

function triggerMaxWarn(index) {
    const warn = document.getElementById('warn-' + index);
    const slider = document.getElementById('slider-' + index);
    warn.style.display = 'block';
    warn.style.animation = 'none';
    slider.classList.remove('slider-maxed');
    void warn.offsetWidth;
    warn.style.animation = '';
    slider.classList.add('slider-maxed');
    clearTimeout(warn._t);
    warn._t = setTimeout(() => {
        warn.style.display = 'none';
        slider.classList.remove('slider-maxed');
    }, 1600);
}

function init() {
    const incomeInput = document.getElementById('income-input');
    incomeInput._raw = 0;

    incomeInput.addEventListener('focus', function () {
        if (this._raw > 0) this.value = String(this._raw);
    });
    incomeInput.addEventListener('input', function () {
        const digits = this.value.replace(/[^0-9]/g, '');
        this._raw = parseInt(digits) || 0;
        updateCalc();
    });
    incomeInput.addEventListener('blur', function () {
        if (this._raw > 0) {
            this.value = new Intl.NumberFormat('vi-VN').format(this._raw);
        }
    });

    [1, 2, 3, 4].forEach(function (i) {
        const slider = document.getElementById('slider-' + i);
        const pctInput = document.getElementById('pct-' + i);

        slider.addEventListener('input', function () {
            const max = Math.max(0, 100 - sumOthers(i));
            const raw = parseInt(this.value);
            const v = Math.min(raw, max);
            if (raw > max) triggerMaxWarn(i);
            this.value = v;
            pctInput.value = v;
            updateCalc();
        });
        pctInput.addEventListener('input', function () {
            let v = parseInt(this.value);
            if (isNaN(v)) v = 0;
            v = Math.max(0, Math.min(100, v));
            slider.value = v;
            updateCalc();
        });
        pctInput.addEventListener('blur', function () {
            let v = parseInt(this.value);
            if (isNaN(v) || this.value === '') v = 0;
            const max = Math.max(0, 100 - sumOthers(i));
            v = Math.max(0, Math.min(v, max));
            this.value = v;
            slider.value = v;
            updateCalc();
        });
    });

    updateCalc();
}

document.addEventListener('DOMContentLoaded', init);
