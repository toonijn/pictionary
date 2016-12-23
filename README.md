# Pictionary

### Instal and run the server

```
git clone https://github.com/toonijn/pictionary.git
cd pictionary
npm install
node index.js
```

### Install dependecies and run the python client

```
apt-get install python-pygame
pip install -U socketIO-client
```
Choose the appropriate videodriver http://sdl.beuc.net/sdl.wiki/SDL_envvars
```
export SDL_VIDEODRIVER fbcon
python client.py
```