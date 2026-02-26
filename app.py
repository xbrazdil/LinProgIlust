from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    # main page; all computation is done client-side by JavaScript
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
