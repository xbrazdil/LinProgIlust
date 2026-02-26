// store constraint DOM rows
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

// compute intersection points of all pairs of constraint lines
function computeFeasibleVertices(constraints) {
    let pts = [];
    // compute all intersections
    for (let i = 0; i < constraints.length; i++) {
        for (let j = i + 1; j < constraints.length; j++) {
            const c1 = constraints[i];
            const c2 = constraints[j];
            // solve a1 x + b1 y = c1 and a2 x + b2 y = c2
            const det = c1.a * c2.b - c2.a * c1.b;
            if (Math.abs(det) < 1e-9) continue; // parallel
            const x = (c2.b * c1.c - c1.b * c2.c) / det;
            const y = (c1.a * c2.c - c2.a * c1.c) / det;
            pts.push({x, y});
        }
    }
    // also add intersections with axes if desired? not necessary.
    // filter by all constraints
    pts = pts.filter(pt => {
        return constraints.every(c => c.a * pt.x + c.b * pt.y <= c.c + 1e-9);
    });
    // remove duplicates
    pts = pts.filter((p, idx) => {
        return !pts.some((q, j) => j < idx && Math.hypot(p.x-q.x,p.y-q.y) < 1e-6);
    });
    return pts;
}

function sortVertices(pts) {
    if (pts.length === 0) return pts;
    // compute centroid
    let cx = 0, cy = 0;
    pts.forEach(p => {cx += p.x; cy += p.y;});
    cx /= pts.length; cy /= pts.length;
    pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
    return pts;
}

// convert LP data into simplex tableau steps
function simplex(constraints, obj, maximize) {
    // standard form: each constraint a x + b y <= c, add slack
    const m = constraints.length;
    const n = 2; // x,y
    // tableau dimensions: (m+1) x (n+m+1) including RHS
    let tableau = [];
    // initial basis: slack variables indices n..n+m-1
    let basis = [];
    for (let i = 0; i < m; i++) {
        let row = [];
        row.push(constraints[i].a);
        row.push(constraints[i].b);
        for (let j = 0; j < m; j++) row.push(i === j ? 1 : 0);
        row.push(constraints[i].c);
        tableau.push(row);
        basis.push(n + i);
    }
    // objective row
    let objRow = [];
    const sign = maximize ? -1 : 1; // maximize -> subtract c
    objRow.push(sign * obj.a);
    objRow.push(sign * obj.b);
    for (let j = 0; j < m; j++) objRow.push(0);
    objRow.push(0);
    tableau.push(objRow);

    const steps = [];
    function recordStep() {
        // compute current solution values for x,y
        let sol = {x:0,y:0};
        for (let i = 0; i < m; i++) {
            if (basis[i] === 0) sol.x = tableau[i][n+m];
            if (basis[i] === 1) sol.y = tableau[i][n+m];
        }
        steps.push({tableau: tableau.map(r=>r.slice()), basis: basis.slice(), sol});
    }
    recordStep();

    // pivot loop
    while (true) {
        // find entering column (most negative in objective row for max, most positive for min)
        const last = tableau.length - 1;
        let enter = -1;
        let extreme = maximize ? 0 : 0;
        for (let j = 0; j < n + m; j++) {
            const val = tableau[last][j];
            if ((maximize && val < extreme) || (!maximize && val > extreme)) {
                extreme = val;
                enter = j;
            }
        }
        if (enter === -1) break; // optimal

        // ratio test
        let minRatio = Infinity;
        let leave = -1;
        for (let i = 0; i < m; i++) {
            const aij = tableau[i][enter];
            if (aij > 1e-9) {
                const ratio = tableau[i][n+m] / aij;
                if (ratio < minRatio) {
                    minRatio = ratio;
                    leave = i;
                }
            }
        }
        if (leave === -1) break; // unbounded

        // pivot on (leave, enter)
        const pivot = tableau[leave][enter];
        // normalize pivot row
        for (let j = 0; j <= n+m; j++) tableau[leave][j] /= pivot;
        // eliminate other rows
        for (let i = 0; i <= m; i++) {
            if (i === leave) continue;
            const factor = tableau[i][enter];
            for (let j = 0; j <= n+m; j++) {
                tableau[i][j] -= factor * tableau[leave][j];
            }
        }
        basis[leave] = enter;
        recordStep();
    }

    return steps;
}

function renderTableaus(steps) {
    const container = document.getElementById('tableaus');
    container.innerHTML = '';
    steps.forEach((st, idx) => {
        const div = document.createElement('div');
        div.innerHTML = `<h3>Step ${idx}</h3>`;
        const table = document.createElement('table');
        table.border = 1;
        st.tableau.forEach((row, i) => {
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
        container.appendChild(div);
    });
}

function drawRegion() {
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

    const pts = computeFeasibleVertices(constraints);
    const sorted = sortVertices(pts);
    const x = sorted.map(p=>p.x);
    const y = sorted.map(p=>p.y);

    const data = [];
    if (sorted.length > 0) {
        data.push({
            x: [...x, x[0]],
            y: [...y, y[0]],
            mode: 'lines+markers',
            fill: 'toself',
            name: 'Feasible Region'
        });
    }

    constraints.forEach((c,i) => {
        const linePts = [];
        for (let xi=-10; xi<=10; xi+=0.5) {
            if (Math.abs(c.b) > 1e-9) {
                linePts.push({x: xi, y: (c.c - c.a*xi)/c.b});
            }
        }
        data.push({x: linePts.map(p=>p.x), y: linePts.map(p=>p.y), mode:'lines', line:{dash:'dash'}, name:`${c.a}x+${c.b}y≤${c.c}`});
    });

    let optimal;
    if (!isNaN(objA) && !isNaN(objB) && constraints.length>0) {
        const steps = simplex(constraints, {a:objA,b:objB}, maximize);
        renderTableaus(steps);
        // plot path of basic solutions
        const pathX = steps.map(s=>s.sol.x);
        const pathY = steps.map(s=>s.sol.y);
        if (pathX.length>0) {
            // mark path; differentiate start
            data.push({x:pathX, y:pathY, mode:'lines+markers', name:'Simplex path', line:{color:'red'}});
            data.push({x:[pathX[0]], y:[pathY[0]], mode:'markers', marker:{color:'blue', size:12}, name:'Start'});
            const last = steps[steps.length-1];
            optimal = objA*last.sol.x + objB*last.sol.y;
        }
    }
    // draw objective contours and highlight optimal line
    if (optimal !== undefined) {
        // compute all objective values at vertices as well as min/max over region
        const values = sorted.map(p => objA*p.x + objB*p.y);
        if (values.length > 0) {
            const vmin = Math.min(...values);
            const vmax = Math.max(...values);
            const step = (vmax - vmin) / 5 || 1;
            for (let v = vmin; v <= vmax; v += step) {
                // skip optimal highlight for now
                if (Math.abs(v - optimal) < 1e-6) continue;
                if (Math.abs(objB) > 1e-9) {
                    const linePts = [];
                    for (let xi=-10; xi<=10; xi+=0.5) {
                        linePts.push({x:xi, y:(v - objA*xi)/objB});
                    }
                    data.push({x:linePts.map(p=>p.x), y:linePts.map(p=>p.y), mode:'lines', line:{color:'gray', dash:'dot'}, opacity:0.5, showlegend:false});
                } else if (Math.abs(objA) > 1e-9) {
                    const xval = v/objA;
                    data.push({x:[xval,xval], y:[-10,10], mode:'lines', line:{color:'gray', dash:'dot'}, opacity:0.5, showlegend:false});
                }
            }
            // now optimal line in green
            if (Math.abs(objB) > 1e-9) {
                const linePts = [];
                for (let xi=-10; xi<=10; xi+=0.5) {
                    linePts.push({x:xi, y:(optimal - objA*xi)/objB});
                }
                data.push({x:linePts.map(p=>p.x), y:linePts.map(p=>p.y), mode:'lines', line:{color:'green', width:2}, name:'Objective'});
            } else if (Math.abs(objA) > 1e-9) {
                const xval = optimal/objA;
                data.push({x:[xval,xval], y:[-10,10], mode:'lines', line:{color:'green', width:2}, name:'Objective'});
            }
        }
    }

    const layout = {xaxis:{range:[-1,10]},yaxis:{range:[-1,10]},width:600,height:600};
    Plotly.newPlot('plot', data, layout);
}

// initialize with default objective coefficients and constraints
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('obj-a').value = 1;
    document.getElementById('obj-b').value = 1;
    // add constraints and fill values
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
