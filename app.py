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
from dash import callback_context as ctx
from pages import about, contact, resources, search
from openai import OpenAI
from textwrap import dedent
from sidebar import create_sidebar
from pages.home import create_home
from pages.search import create_searchpage
from pages.login import create_login
from generate_narrative import generate_story
from flask import request, session
import pam
import time
import os

last_click_time = 0
external_stylesheets = [
    dbc.themes.BOOTSTRAP,
    "https://use.fontawesome.com/releases/v5.15.1/css/all.css",
]


app = dash.Dash(
    external_stylesheets=external_stylesheets,
    # these meta_tags ensure content is scaled correctly on different devices
    # see: https://www.w3schools.com/css/css_rwd_viewport.asp for more
    meta_tags=[
        {"name": "viewport", "content": "width=device-width, initial-scale=1"}
    ],
    external_scripts=[
        "https://cdnjs.cloudflare.com/ajax/libs/dragula/3.7.2/dragula.min.js"],
    suppress_callback_exceptions=True
)

app.server.secret_key = "Hmu9m43V58EJZXLBkSNsQdI2"

# sidebar = create_sidebar()
# home_page = create_home()
search_page = create_searchpage()
login_page = create_login()
title_banner = html.Div(dbc.Row(dbc.Col(html.H1("CAST Story Board", className="h5", style={
                        'backgroundColor': '#8B0000', 'padding': '20px', 'color': 'white'}))))

# home = create_home()
# content = html.Div(id="page-content")

app.layout = html.Div([
    dcc.Location(id="url"),
    html.Div(id="sidebar-wrapper", children=[create_sidebar()]),
    html.Div(id="page-content"),
    dcc.Store(id='click-data'),
    html.Button(id='dummy-input', style={'display': 'none'}),  # Hidden button
    html.Div(id='dummy-output', style={'display': 'none'})      # Hidden div for output
])


pam_auth = pam.pam()


def authenticate_user(username, password):
    return pam_auth.authenticate(username, password, service='login')

@app.callback(
    [Output('pwd-box', 'type'),
     Output('password-toggle-icon', 'className')],
    [Input('password-toggle-icon', 'n_clicks')],
    [State('pwd-box', 'type')],
    prevent_initial_call=True
)
def toggle_password_visibility(n_clicks, current_type):
    if n_clicks:
        if current_type == 'password':
            # Change input type to 'text' to show the password and update icon
            return 'text', 'fas fa-eye'
        else:
            # Change input type back to 'password' to hide it
            return 'password', 'fas fa-eye-slash'
    return current_type, 'fas fa-eye-slash'


@app.callback(
    [Output('output-state', 'children'),
     Output('url', 'pathname')],
    [Input('login-button', 'n_clicks'),
     Input('uname-box', 'n_submit'),
     Input('pwd-box', 'n_submit')],
    [State('uname-box', 'value'),
     State('pwd-box', 'value')],
    prevent_initial_call=True
)
def debug_login(n_clicks, uname_n_submit, pwd_n_submit, username, password):
    # Check if any login attempt has been made
    if not (n_clicks or uname_n_submit or pwd_n_submit):
        raise dash.exceptions.PreventUpdate

    # Determine which input triggered the callback
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]

    if triggered_id in ['login-button', 'uname-box', 'pwd-box']:
        if not username or not password:
            return "Please enter both username and password.", dash.no_update

        try:
            if authenticate_user(username, password):
                session['authenticated'] = True
                session['username'] = username
                return None, "/home"  # Redirect to the home page on success
            else:
                return "Invalid credentials, please try again.", dash.no_update
        except Exception as e:
            return "An error occurred during authentication, please try again.", dash.no_update

    return dash.no_update, dash.no_update

    # If authentication is successful (you can replace this with actual authentication logic)

# Callback to handle logout action


@app.callback(
    [Input('logout-link', 'n_clicks')]
)
def logout_user(n_clicks):
    if n_clicks:
        session.pop('authenticated', None)  # Clear the session
        session.pop('username', None)
    return


@app.callback(
    Output("page-content", "children"),
    [Input("url", "pathname")]
)
def render_page_content(pathname):
    if 'authenticated' not in session or not session['authenticated']:
        return login_page
    if not pathname or pathname == "/login" or pathname == "/" or pathname == "":
        return login_page
    elif pathname == "/home":
        return html.Div([title_banner, create_home()])
    elif pathname == "/about":
        return html.Div([title_banner, about.layout])
    elif pathname == "/resources":
        return html.Div([title_banner, resources.layout])
    elif pathname == "/search":
        return html.Div([title_banner, search_page])
    elif pathname == "/contact":
        return html.Div([title_banner, contact.layout])
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
    [Output("sidebar-wrapper", "className"),
     Output("sidebar",  "className")],
    [Input("sidebar-toggle", "n_clicks"),
     Input("navbar-toggle", "n_clicks"),
     Input('url', 'pathname')],
    [State("sidebar-wrapper", "className")],
)
def toggle_classname(n_clicks1, n_clicks2, pathname, classname):

    if not ctx.triggered:
        return dash.no_update, dash.no_update

    # Get the ID of the input that triggered the callback
    triggered_id = ctx.triggered[0]['prop_id'].split('.')[0]

    if triggered_id == 'url':
        if pathname == '/login' or pathname == '/' or pathname == '':
            return 'hidden', 'hidden'
        else:
            return dash.no_update, dash.no_update
    elif triggered_id == 'sidebar-toggle' or triggered_id == "navbar-toggle":
        if classname is None:
            return "collapsed", "collapsed"
        elif "collapsed" in classname:
            return "expanded", "expanded"
        elif "expanded" in classname:
            return "collapsed", "collapsed"
        else:
            return dash.no_update, dash.no_update
    else:
        return dash.no_update, dash.no_update


@app.callback(
    Output("collapse", "is_open"),
    [Input("navbar-toggle", "n_clicks")],
    [State("collapse", "is_open")],
)
def toggle_collapse(n, is_open):
    if n:
        return not is_open
    return is_open

# Clientside callback to capture click data
app.clientside_callback(
    """
    function(n_clicks) {
        if (window.latestClickData) {
            var data = window.latestClickData;
            window.latestClickData = null; // Reset after reading
            return data;
        } else {
            return null;
        }
    }
    """,
    Output('click-data', 'data'),
    [Input('dummy-input', 'n_clicks')],
    prevent_initial_call=True
)

@app.callback(
    Output('dummy-output', 'children'),
    [Input('click-data', 'data')],
    prevent_initial_call=True
)
def process_clickstream(click_data):
    # Check if the user is authenticated
    if 'username' in session:
        username = session['username']
    else:
        return ""

    # Define the directory and file path
    base_dir = '/data/CAST_ext/logs/'
    user_dir = os.path.join(base_dir, username)

    # Create the user directory if it doesn't exist
    if not os.path.exists(user_dir):
        os.makedirs(user_dir)

    log_file_path = os.path.join(user_dir, 'clickstream_log.txt')

    # Write the click data to the file
    if click_data:
        # Create the click_info string
        click_info = f"Clicked on: {click_data['target']}, " \
                     f"Time: {click_data['timestamp']}, " \
                     f"Mouse Down Position: {click_data['down_position']}, " \
                     f"Mouse Up Position: {click_data['up_position']}\n"

        # Append the click_info to the log file
        with open(log_file_path, 'a') as log_file:
            log_file.write(click_info)

    return ""

@app.callback(
    Output('narrative-text', 'children'),
    Input('generate-narrative-button', 'n_clicks'),
    prevent_initial_call=True
)
def update_narrative(n_clicks):
    if n_clicks:
        username = session['username']
        narrative = generate_story(username)
        return narrative  # Return the narrative to be displayed
    return ''



if __name__ == "__main__":
    app.run_server(host='0.0.0.0', port=8050, debug=False)
