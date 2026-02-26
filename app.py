from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    # main page; computations will be performed on the server
    return render_template('index.html')

# helper routines for LP

def compute_feasible_vertices(constraints):
    pts = []
    m = len(constraints)
    for i in range(m):
        for j in range(i+1, m):
            c1 = constraints[i]
            c2 = constraints[j]
            det = c1['a'] * c2['b'] - c2['a'] * c1['b']
            if abs(det) < 1e-9:
                continue
            x = (c2['b'] * c1['c'] - c1['b'] * c2['c']) / det
            y = (c1['a'] * c2['c'] - c2['a'] * c1['c']) / det
            pts.append({'x': x, 'y': y})
    # filter
    def valid(pt):
        return all(c['a']*pt['x'] + c['b']*pt['y'] <= c['c'] + 1e-9 for c in constraints)
    pts = [p for p in pts if valid(p)]
    # unique
    uniq = []
    for p in pts:
        if not any((p['x']-q['x'])**2+(p['y']-q['y'])**2 < 1e-12 for q in uniq):
            uniq.append(p)
    return uniq


def sort_vertices(pts):
    if not pts:
        return pts
    cx = sum(p['x'] for p in pts)/len(pts)
    cy = sum(p['y'] for p in pts)/len(pts)
    pts.sort(key=lambda p: (math.atan2(p['y']-cy, p['x']-cx)))
    return pts

import math

def simplex(constraints, obj, maximize):
    m = len(constraints)
    n = 2
    tableau = []
    basis = []
    for i in range(m):
        row = [constraints[i]['a'], constraints[i]['b']]
        for j in range(m):
            row.append(1.0 if i==j else 0.0)
        row.append(constraints[i]['c'])
        tableau.append(row)
        basis.append(n + i)
    sign = -1 if maximize else 1
    objrow = [sign * obj['a'], sign * obj['b']] + [0.0]*m + [0.0]
    tableau.append(objrow)

    steps = []
    def record_step():
        sol = {'x':0.0,'y':0.0}
        for i in range(m):
            if basis[i]==0:
                sol['x'] = tableau[i][n+m]
            if basis[i]==1:
                sol['y'] = tableau[i][n+m]
        steps.append({'tableau':[r[:] for r in tableau],'basis':basis[:],'sol':sol})
    record_step()

    while True:
        last = len(tableau)-1
        enter = -1
        extreme = 0.0
        for j in range(n+m):
            val = tableau[last][j]
            if (maximize and val < extreme) or (not maximize and val > extreme):
                extreme = val
                enter = j
        if enter == -1:
            break
        minratio = float('inf')
        leave = -1
        for i in range(m):
            aij = tableau[i][enter]
            if aij > 1e-9:
                ratio = tableau[i][n+m] / aij
                if ratio < minratio:
                    minratio = ratio
                    leave = i
        if leave == -1:
            break
        pivot = tableau[leave][enter]
        for j in range(n+m+1):
            tableau[leave][j] /= pivot
        for i in range(m+1):
            if i == leave: continue
            factor = tableau[i][enter]
            for j in range(n+m+1):
                tableau[i][j] -= factor * tableau[leave][j]
        basis[leave] = enter
        record_step()
    return steps

@app.route('/compute', methods=['POST'])
def compute():
    data = request.get_json()
    objA = data.get('objA')
    objB = data.get('objB')
    maximize = data.get('maximize', True)
    constraints = data.get('constraints', [])
    pts = compute_feasible_vertices(constraints)
    sorted_pts = sort_vertices(pts[:])
    response = {}
    # build data list for plotly
    data_list = []
    if sorted_pts:
        xs = [p['x'] for p in sorted_pts] + [sorted_pts[0]['x']]
        ys = [p['y'] for p in sorted_pts] + [sorted_pts[0]['y']]
        data_list.append({'x': xs, 'y': ys, 'mode': 'lines+markers', 'fill': 'toself', 'name':'Feasible Region'})
    # constraint lines
    for c in constraints:
        line_x=[]
        line_y=[]
        for xi in [i*0.5 for i in range(-20,21)]:
            if abs(c['b'])>1e-9:
                line_x.append(xi)
                line_y.append((c['c'] - c['a']*xi)/c['b'])
        data_list.append({'x':line_x,'y':line_y,'mode':'lines','line':{'dash':'dash'},'name':f"{c['a']}x+{c['b']}y≤{c['c']}"})
    optimal = None
    if objA is not None and objB is not None and constraints:
        steps = simplex(constraints, {'a':objA,'b':objB}, maximize)
        response['tableaus'] = steps
        path_x = [s['sol']['x'] for s in steps]
        path_y = [s['sol']['y'] for s in steps]
        if path_x:
            data_list.append({'x':path_x,'y':path_y,'mode':'lines+markers','name':'Simplex path','line':{'color':'red'}})
            # mark start in a separate plotly trace?
            data_list.append({'x':[path_x[0]],'y':[path_y[0]],'mode':'markers','marker':{'color':'blue','size':12},'name':'Start'})
            last = steps[-1]
            optimal = objA*last['sol']['x'] + objB*last['sol']['y']
    # contours
    if optimal is not None and sorted_pts:
        values = [objA*p['x'] + objB*p['y'] for p in sorted_pts]
        vmin = min(values)
        vmax = max(values)
        step = (vmax - vmin) / 5 if vmax != vmin else 1
        v = vmin
        while v <= vmax+1e-9:
            if abs(v - optimal) > 1e-6:
                if abs(objB) > 1e-9:
                    line_x=[]; line_y=[]
                    for xi in [i*0.5 for i in range(-20,21)]:
                        line_x.append(xi)
                        line_y.append((v - objA*xi)/objB)
                    data_list.append({'x':line_x,'y':line_y,'mode':'lines','line':{'color':'gray','dash':'dot'},'opacity':0.5,'showlegend':False})
                elif abs(objA) > 1e-9:
                    xval = v/objA
                    data_list.append({'x':[xval,xval],'y':[-10,10],'mode':'lines','line':{'color':'gray','dash':'dot'},'opacity':0.5,'showlegend':False})
            v += step
        # optimal line
        if abs(objB) > 1e-9:
            line_x=[]; line_y=[]
            for xi in [i*0.5 for i in range(-20,21)]:
                line_x.append(xi)
                line_y.append((optimal - objA*xi)/objB)
            data_list.append({'x':line_x,'y':line_y,'mode':'lines','line':{'color':'green','width':2},'name':'Objective'})
        elif abs(objA) > 1e-9:
            xval = optimal/objA
            data_list.append({'x':[xval,xval],'y':[-10,10],'mode':'lines','line':{'color':'green','width':2},'name':'Objective'})
    response['data'] = data_list
    response['layout'] = {'xaxis':{'range':[-1,10]},'yaxis':{'range':[-1,10]},'width':600,'height':600}
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)
