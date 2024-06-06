from dash import html
from dash import dcc
from dash.dependencies import Input, Output
# from app import app

layout = html.Div([
    html.H1('contact Page'),
	html.H6('University of Alabama SAIL lab'),
	html.H6('tech:scao7atcrimson.ua.edu'),
    dcc.Link('Go to About Page', href='/about'),
])
