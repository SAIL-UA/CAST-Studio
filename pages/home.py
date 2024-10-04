
import dash
import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, html
from openai import OpenAI
from textwrap import dedent
import plotly.graph_objs as go
import networkx as nx
import os
from dash.dependencies import Input, Output, State, ClientsideFunction
from loadcache import get_cards_layout


data_bin = {}
story_bin= {}

placehold =  html.Div(
                "Placeholder",
                style={
                    'width': '150px',
                    'height': '100px',
                    'lineHeight': '100px',
                    'textAlign': 'center',
                    'border': '2px dashed gray',
                    'borderRadius': '10px'
                }
            )

def create_home():
    def Header(name, app):
        title = html.H3(name, className= "h3")
        logo = html.Img(
            src=app.get_asset_url("UALogo.jpg"), style={"float": "right", "height": 60}
        )
        return dbc.Row([dbc.Col(title), dbc.Col(logo)])
    # Load images
    IMAGES = {"OKN": dash.get_asset_url("UALogo.jpg")}

    home = html.Div(
		[
			dbc.Row(
                dbc.Col([
                    html.H5("Data Story Bin"),
                    html.Hr(),
                    dbc.Row(id='drag_container',children=
                        get_cards_layout(),
                    ),
                ],
                # style={'padding': '20px'},
                )
				
			),
            dbc.Row(
                dbc.Col([
                    html.H5("Data Storyboard"),
                    html.Hr(),
                    dbc.Row(id='drag_container2',
                            children=get_cards_layout(),
                    ),
                ],
                # style={'padding': '20px'},
                )
				
			)

        ]
	)

    dash.clientside_callback(
        ClientsideFunction(namespace="clientside", function_name="make_draggable"),
        Output("drag_container", "data-drag"),
        Output("drag_container2","data-drag"),
        [Input("drag_container", "id"),Input("drag_container2", "id")],
    )
  
  
    return home
    