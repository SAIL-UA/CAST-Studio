from dash import html
from dash import dcc
from dash.dependencies import Input, Output
import dash_bootstrap_components as dbc
# from app import app

# layout = html.Div([
#     html.H1('about Page'),
#     dcc.Link('Go to home Page', href='/')
# ])


# Sample data for the table
data = [
    {"Datasets": "Example Dataset", "info": 30, "Datasource": "https://www.samhsa.gov/data/data-we-collect/n-ssats-national-survey-substance-abuse-treatment-services"},
	
]

# Create table rows
table_header = [
    html.Thead(html.Tr([html.Th(col) for col in data[0].keys()]))
]

table_body = [
    html.Tbody([
        html.Tr([html.Td(row[col],style={'border': '1px solid black'}) for col in row.keys()]) for row in data
    ])
]

# Layout of the Dash app
layout = html.Div([
	
    html.Table(table_header + table_body, style={'width': '100%', 'margin': 'auto', 'border': '1px solid black'})
])
