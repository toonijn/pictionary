import pygame
import sys
import time
import os
import thread
import math
import threading
from socketIO_client import SocketIO, LoggingNamespace
from math import pi

pygame.init()

game_name = "sandbox"
server = ""
port = 80

if len(sys.argv) > 1:
	server = sys.argv[1]
else:
	sys.exit("Geef het adres van de server op")

if len(sys.argv) > 2:
	port = sys.argv[2]
else:
	sys.exit("Met een poort vb. 80")

if len(sys.argv) > 3:
	game_name = sys.argv[3]

done = False
drawing = []

WHITE   = (255,255,255)
BLACK   = (  0,  0,  0)
RED     = (204,  0,  0)
GREEN   = (  0,153,  0)
BLUE    = (  0,  0,204)
PRIMARY = (  3,169,244)
PRIMARY_DARK = (2, 136, 209)

colors = [BLACK, RED, GREEN, BLUE]

# Set the height and width of the screen
width, height = (pygame.display.Info().current_w, pygame.display.Info().current_h)
screen = pygame.display.set_mode((width, height))
pygame.mouse.set_visible(False)
pygame.display.set_caption("Pictionary")

size = min(width, height)
offset = (max(0,(width-size)/2),max(0,(height-size)/2))

font = pygame.font.SysFont("monospace", 60)

info = {}

def sign(x):
	return bool(x > 0) - bool(x < 0)

class Timer:
		
	def __init__(self):
		self.t = 0
		self.max = 30
		self.running = False
	
	def set_time(self, time):
		self.t = time
	
	def size(self):
		return width-140, height-140, 100, 5
	
	def draw_clock(self):
		x, y, r, p = self.size()
		pi2 = math.pi*2
		def point(t):
			a = pi2*t
			s = math.sin(a)
			c = math.cos(a)
			m = max(abs(s), abs(c))
			return (x+r*s/m, y-r*c/m)
		t = self.t/self.max
		if t >= 1:
			return
		points = [(x,y)]
		points.append(point(t))
		s = .125
		while s < t:
			s += .25
		while s < 1:
			points.append(point(s))
			s += .25
		points.append(point(1))
		
		pygame.draw.rect(screen, PRIMARY, (x-r-p,y-r-p,2*(r+p),2*(r+p)))
		pygame.draw.rect(screen, WHITE, (x-r,y-r,2*r,2*r))
		pygame.draw.polygon(screen, PRIMARY, points)
		pygame.display.update()
	
	def hide_clock(self):
		x, y, r, p = self.size()
		pygame.draw.rect(screen, WHITE, (x-r-p,y-r-p,2*(r+p),2*(r+p)))
		pygame.display.update()
	
	def start(self):
		if(self.running):
			return
		self.t = self.max
		
		def setTimeout(f, t):
			timer = threading.Timer(t, f)
			timer.setDaemon(True)
			timer.start()
			
		def step():
			if self.t >= 0:
				setTimeout(step, .1)
				self.draw_clock()
				self.t -= .1
			else:
				self.running = False
				self.hide_clock()
		
		self.running = True
		step()
	
	def stop(self):
		self.t = -1;

timer = Timer()

def convert_point(point):
	return [
		int(point["x"]*size+offset[0]/2),
		int(point["y"]*size+offset[1]/2)
	]
	
def convert_drawing(_drawing):
	global drawing
	drawing = []
	def add_path(path, color_index):
		drawing.append({
			"path": path,
			"color": colors[color_index]
		})
	path = []
	color_index = 0
	for point in _drawing:
		if "start" in point and point["start"]:
			if len(path) > 0:
				add_path(path, color_index)
			path = [convert_point(point)]
			color_index = point["color"]
		else:
			path.append(convert_point(point))
	if len(path) > 0:
		add_path(path, color_index)

def draw_section(section):
	path = section["path"]
	color = section["color"]
	if len(path) == 1:
		pygame.draw.circle(screen, color, path[0], 4)
	else:
		pygame.draw.lines(screen, color, False, path, 4)

def draw_point(point):
	if "start" in point and point["start"]:
		if(len(drawing) > 0 and len(drawing[-1]["path"]) == 1):
			draw_section(drawing[-1])
		drawing.append({"path":[], "color": colors[point["color"]]})
	drawing[-1]["path"].append(convert_point(point))
	
	if(len(drawing[-1]["path"]) > 1):
		draw_section(drawing[-1])
	
	pygame.display.update()
	
def new_drawing(_drawing):
	convert_drawing(_drawing)
	screen.fill(WHITE)
	
	for section in drawing:
		draw_section(section);
		
	pygame.display.update()
	game_progress(info)
	
def int_to_str(i):
	if(i < 10):
		return "  "+str(i)
	if(i < 100):
		return " "+str(i)
	return str(i)
	
def game_settings(_game):
	global game
	game = _game
	if(game["type"] == "OneVsOne"):
		timer.max = game["maxTime"]
	else:
		timer.hide_clock()
	
def game_progress(_info):
	global info
	info = _info
	
	if not _info:
		return
	
	if(game["type"] == "OneVsOne"):
		if info["status"] == "drawing":
			timer.start()
		else:
			timer.stop()

	padding = 5
	
	teams = []
	h = 0
	w = 0
	for score in info["scores"]:
		size = font.size(score[0]+" "+int_to_str(score[1]))
		h += size[1]+2*padding
		w = max(w, size[0])
		
	offset = (width-w-80, 40)
	
	pygame.draw.rect(screen, PRIMARY, (offset[0]-5, offset[1]-5, w+50,h+30))
	pygame.draw.rect(screen, WHITE, offset+(w+40,h+20))
	
	x = offset[0]+20
	y = offset[1]+10+padding
	for score in sorted(info["scores"]):
		text = score[0]+" "+int_to_str(score[1])
		size = font.size(text)
		screen.blit(font.render(
				text,1,
				PRIMARY if score[0] == info["drawer"]
				or score[0] == info["guesser"] else BLACK),
			(x+w-size[0], y))
		y += size[1]+2*padding
		
	pygame.display.update()
	
def on_time(time):
	timer.t = time
	
def listeningToSocket():
	socket = SocketIO(server, port)
	socket.on("drawing", new_drawing)
	socket.on("draw", draw_point)
	socket.on("gameSettings", game_settings)
	socket.on("gameProgress", game_progress)
	socket.on("time", on_time)
	socket.emit("joinGame", game_name)
	socket.wait()
		
thread.start_new_thread(listeningToSocket, ())

#Loop until the user clicks the close button.
done = False
clock = pygame.time.Clock()
screen.fill(WHITE)

while not done:
	clock.tick(30)
	 
	for event in pygame.event.get(): # User did something
		if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE: # If user clicked close
			done=True # Flag that we are done so we exit this loop

pygame.quit()