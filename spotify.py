import urllib.parse
import requests

class Spotify():
    def __init__(self, client_id, client_secret):
        self._client_id = client_id
        self.__client_secret = client_secret

    def login(self, redirect_uri):
        auth_url = 'https://accounts.spotify.com/authorize'
        params = {
            'client_id': self._client_id,
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'scope': 'user-read-currently-playing',
            'show_dialog': True
        }

        url_args = urllib.parse.urlencode(params)
        return f'{auth_url}?{url_args}'

    def callback(self, code, redirect_uri):
        token_url = 'https://accounts.spotify.com/api/token'
        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': redirect_uri,
            'client_id': self._client_id,
            'client_secret': self.__client_secret
        }

        response = requests.post(token_url, data=token_data)
        token_info = response.json()

        print("Tokens::", token_info)

        if 'access_token' not in token_info:
            print("Fehler beim Token holen")
            return None, None

        access_token = token_info.get('access_token')
        refresh_token = token_info.get('refresh_token')

        return access_token, refresh_token


