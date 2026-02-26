# Linear Programming Visualizer

This simple web application allows you to specify a linear program with two variables (x and y) and an arbitrary number of linear constraints of the form `a x + b y ≤ c`.

All linear‑programming computations (feasible vertices, simplex tableaus, contour lines, etc.) are performed on the Python server; the browser merely renders the JSON response using Plotly.js.

## Running

1. Create a Python virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   python app.py
   ```
3. Open your browser at `http://127.0.0.1:5000/`.

## Usage

- Add or remove constraints with the buttons.
- Specify an objective function by entering coefficients `c₁` (for x) and `c₂` (for y) and choose maximize or minimize. The form is pre-filled with `1 x + 1 y` and example constraints for convenience.
- Enter coefficients `a`, `b`, and `c` for each constraint.
- Click *Plot Region* to update the visualization.

The feasible polygon is shown along with dashed lines representing each constraint. When an objective is provided the app runs a simple two-variable simplex algorithm, shows each tableau and highlights the sequence of basic feasible solutions on the plot. A family of parallel contour lines is now drawn illustrating different objective levels; the optimal line is highlighted in green. The simplex solver's **starting basic feasible solution** is marked with a blue dot on the plot, and subsequent pivots are connected by a red path.



---

This project was scaffolded with Copilot instructions.