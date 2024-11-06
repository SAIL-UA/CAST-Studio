
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
story_bin = {}

placehold = html.Div(
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
        title = html.H3(name, className="h3")
        logo = html.Img(
            src=app.get_asset_url("UALogo.jpg"), style={"float": "right", "height": 60}
        )
        return dbc.Row([dbc.Col(title), dbc.Col(logo)])
    # Load images
    IMAGES = {"OKN": dash.get_asset_url("UALogo.jpg")}

    drag_container_children = get_cards_layout()

    def get_container_style(children):
        if children:
            return {'height': '50vh'}
        else:
            return {}
    
    drag_container_style = get_container_style(drag_container_children)

    # For drag_container2, which starts empty
    drag_container2_children = []  
    drag_container2_style = get_container_style(drag_container2_children)

    home = html.Div(
        [
            html.Link(
                rel='stylesheet', href='https://cdnjs.cloudflare.com/ajax/libs/dragula/3.7.2/dragula.min.css'),
            html.Script(
                src='https://cdnjs.cloudflare.com/ajax/libs/dragula/3.7.2/dragula.min.js'),


           dbc.Row(
                dbc.Col([
                    html.H5("Data Story Bin"),
                    html.Hr(),
                    dbc.Row(
                        id='drag_container',
                        className='drag-container',
                        style=drag_container_style,  # Apply the style here
                        children=drag_container_children,
                    ),
                ])
            ),
            dbc.Row(
                [
                    dbc.Col(html.H5("Data Storyboard"), width="auto"),
                    dbc.Col(
                        dbc.Button(
                            "Generate Narrative",
                            id="generate-narrative-button",
                            color="primary",
                        ),
                        width="auto",
                    )
                ],
                justify="between",
                className="w-100",
                align="center",
                style={'padding': '0 20px'}
            ),
            dbc.Row(
                dbc.Col([
                    html.Hr(),
                    dbc.Row(
                        id='drag_container2',
                        className='drag-container',
                        style=drag_container2_style,  # Apply the style here
                        children=drag_container2_children,
                    ),
                ])
            ),
            # Add the text block here
            dbc.Row(
                dbc.Col([
                    html.H5("Generated Story"),
                    html.Hr(),
                ]
                )
             ),
            dbc.Container(
                [
                    dcc.Loading(
                        id="loading-spinner",
                        type="circle",
                        children=[
                            dcc.Markdown(
                                id='narrative-text',
                                style={
                                    'whiteSpace': 'pre-wrap',
                                    'textAlign': 'justify',
                                    'padding': '20px',
                                    'backgroundColor': '#f9f9f9',
                                    'border': '1px solid #ddd',
                                    'borderRadius': '5px',
                                    'minHeight': '200px',
                                    'overflowY': 'auto',
                                    #'marginTop': '20px',
                                }
                            )
                        ]
                    )
                ],
                fluid=True,
            ),
        ]
    )

    # dash.clientside_callback(
    #     ClientsideFunction(namespace="clientside",
    #                        function_name="make_draggable"),
    #     Output("drag_container", "children"),
    #     Output("drag_container2", "children"),
    #     [Input("drag_container", "children"), Input("drag_container2", "children")],
    # )

    return home
