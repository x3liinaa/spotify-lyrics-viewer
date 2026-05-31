import os
from dotenv import load_dotenv
from flask import Flask, render_template, session, redirect, request, url_for
from datetime import date
import random
from spotify import Spotify
from werkzeug.middleware.proxy_fix import ProxyFix

load_dotenv()
app = Flask(__name__)
app.wsgi_app = ProxyFix(
    app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
)
app.secret_key = os.getenv('FLASK_SECRET_KEY')

spotify = Spotify(os.getenv('CLIENT_ID'), os.getenv('CLIENT_SECRET'))

@app.route('/login')
def login():
    login_url = spotify.login(request.url_root + 'callback')
    return redirect(login_url)

@app.route('/callback')
def callback():
    if 'error' in request.args:
        return 'Fehler beim Anmelden'

    code = request.args.get('code')
    tokens = spotify.callback(code, request.url_root + 'callback')

    if tokens[0] is None:
        return "Fehler beim Token Austausch"

    session['access_token'] = tokens[0]
    session['refresh_token'] = tokens[1]

    return redirect(url_for('home'))

@app.route('/')
def home():
    if 'access_token' not in session:
        return redirect('/login')

    return render_template('index.html', access_token=session['access_token'])

if __name__ == '__main__':
    app.run(debug=True)