function addConstraint() {
    const container = document.getElementById('constraints');
    const row = document.createElement('div');
    row.className = 'constraint-row';
    row.innerHTML = `
        <input type="number" step="any" placeholder="a" class="coef-a" required> x +
        <input type="number" step="any" placeholder="b" class="coef-b" required> y ≤
        <input type="number" step="any" placeholder="c" class="coef-c" required>
    `;
    container.appendChild(row);
}

function removeConstraint() {
    const container = document.getElementById('constraints');
    if (container.lastChild) container.removeChild(container.lastChild);
}

async function drawRegion() {
    const rows = document.querySelectorAll('.constraint-row');
    const constraints = [];
    rows.forEach(r => {
        const a = parseFloat(r.querySelector('.coef-a').value);
        const b = parseFloat(r.querySelector('.coef-b').value);
        const c = parseFloat(r.querySelector('.coef-c').value);
        if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
            constraints.push({a,b,c});
        }
    });
    const objA = parseFloat(document.getElementById('obj-a').value);
    const objB = parseFloat(document.getElementById('obj-b').value);
    const maximize = document.querySelector('input[name="opt-type"]:checked').value === 'max';

    const payload = {constraints};
    if (!isNaN(objA) && !isNaN(objB)) {
        payload.objective = {a:objA,b:objB};
        payload.maximize = maximize;
    }

    const res = await fetch('/compute', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const result = await res.json();

    Plotly.newPlot('plot', result.data, result.layout);

    // render tableaus
    const tbl = document.getElementById('tableaus');
    tbl.innerHTML = '';
    if (result.tableaus) {
        result.tableaus.forEach((st, idx) => {
            const div = document.createElement('div');
            div.innerHTML = `<h3>Step ${idx}</h3>`;
            const table = document.createElement('table');
            table.border = 1;
            st.tableau.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(val => {
                    const td = document.createElement('td');
                    td.textContent = (Math.round(val*1000)/1000).toString();
                    tr.appendChild(td);
                });
                table.appendChild(tr);
            });
            div.appendChild(table);
            div.appendChild(document.createTextNode('Basic vars: ' + st.basis.join(', ')));
            div.appendChild(document.createElement('br'));
            div.appendChild(document.createTextNode('Solution (x,y): ('+st.sol.x.toFixed(3)+','+st.sol.y.toFixed(3)+')'));
            tbl.appendChild(div);
        });
    }
}

// initialize defaults on load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('obj-a').value = 1;
    document.getElementById('obj-b').value = 1;
    const defaults = [
        {a:1,b:1,c:5},
        {a:-1,b:2,c:5},
        {a:-1,b:0,c:0},
        {a:0,b:-1,c:0}
    ];
    defaults.forEach(d => {
        addConstraint();
        const rows = document.querySelectorAll('.constraint-row');
        const r = rows[rows.length-1];
        r.querySelector('.coef-a').value = d.a;
        r.querySelector('.coef-b').value = d.b;
        r.querySelector('.coef-c').value = d.c;
    });
});
