
import dash_bootstrap_components as dbc
from dash import Input, Output, html
import dash

def create_searchpage():
    serachbar = html.Div(
        [
            dbc.Input(id="serachbar_input", placeholder="Type serach...", type="text"),
            html.Br(),
            html.P(id="output"),
            dbc.Button("Search", id="search")
        ]
    )

    @dash.callback(Output("output", "children"), [Input("serachbar_input", "value")])
    def output_text(value):

        
        return value
    
    return serachbar