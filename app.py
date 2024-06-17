"""
This app creates a collapsible, responsive sidebar layout with
dash-bootstrap-components and some custom css with media queries.

When the screen is small, the sidebar moved to the top of the page, and the
links get hidden in a collapse element. We use a callback to toggle the
collapse when on a small screen, and the custom CSS to hide the toggle, and
force the collapse to stay open when the screen is large.

dcc.Location is used to track the current location, a callback uses the current
location to render the appropriate page content. The active prop of each
NavLink is set automatically according to the current pathname. To use this
feature you must install dash-bootstrap-components >= 0.11.0.

For more details on building multi-page Dash applications, check out the Dash
documentation: https://dash.plot.ly/urls
"""

import dash
import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, html
from pages import about,contact,resources,search
from openai import OpenAI
from textwrap import dedent
from sidebar import create_sidebar
from pages.home import create_home
from pages.search import create_searchpage


app = dash.Dash(
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    # these meta_tags ensure content is scaled correctly on different devices
    # see: https://www.w3schools.com/css/css_rwd_viewport.asp for more
    meta_tags=[
        {"name": "viewport", "content": "width=device-width, initial-scale=1"}
    ],
    external_scripts=["https://cdnjs.cloudflare.com/ajax/libs/dragula/3.7.2/dragula.min.js"],
    suppress_callback_exceptions=True
)

sidebar = create_sidebar()
home_page = create_home()
search_page = create_searchpage()
title_banner = html.Div(dbc.Row(dbc.Col(html.H1("CAST Story Board",className = "h5",style={'background-color': '#8B0000', 'padding': '20px', 'color': 'white'}))))

# home = create_home()
content = html.Div(id="page-content")

app.layout = html.Div([dcc.Location(id="url"), sidebar,content])
@app.callback(Output("page-content", "children"), [Input("url", "pathname")])
def render_page_content(pathname):
    if pathname == "/":
        return html.Div([title_banner,home_page])
    elif pathname == "/about":
        return html.Div([title_banner,about.layout])
    elif pathname == "/resources":
        return html.Div([title_banner,resources.layout])
    elif pathname == "/search":
        return html.Div([title_banner,search_page])
    elif pathname == "/contact":
        return html.Div([title_banner,contact.layout])
    # If the user tries to reach a different page, return a 404 message
    return html.Div(
        [
            html.H1("404: Not found", className="text-danger"),
            html.Hr(),
            html.P(f"The pathname {pathname} was not recognised..."),
        ],
        className="p-3 bg-light rounded-3",
    )

@app.callback(
    Output("sidebar", "className"),
    [Input("sidebar-toggle", "n_clicks")],
    [State("sidebar", "className")],
)
def toggle_classname(n, classname):
    if n and classname == "":
        return "collapsed"
    return ""


@app.callback(
    Output("collapse", "is_open"),
    [Input("navbar-toggle", "n_clicks")],
    [State("collapse", "is_open")],
)
def toggle_collapse(n, is_open):
    if n:
        return not is_open
    return is_open




if __name__ == "__main__":
    app.run_server(debug=True)