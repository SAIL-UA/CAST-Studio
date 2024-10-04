# import dash
import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, html

def create_sidebar(is_hidden=False, is_collapsed=False):
    # Determine the sidebar class based on its state
    if is_hidden:
        sidebar_class = "hidden"
    elif is_collapsed:
        sidebar_class = "collapsed"
    else:
        sidebar_class = "expanded"
    
    sidebar_header = dbc.Row(
        [
            dbc.Col(html.H2("CAST-UA\n", className="h2")),
            dbc.Col(
                [
                    html.Button(
                        # use the Bootstrap navbar-toggler classes to style
                        html.Span(className="navbar-toggler-icon"),
                        className="navbar-toggler",
                        # the navbar-toggler classes don't set color
                        style={
                            "color": "rgba(0,0,0,.5)",
                            "border-color": "rgba(0,0,0,.1)",
                        },
                        id="navbar-toggle",
                    ),
                    html.Button(
                        # use the Bootstrap navbar-toggler classes to style
                        html.Span(className="navbar-toggler-icon"),
                        className="navbar-toggler",
                        # the navbar-toggler classes don't set color
                        style={
                            "color": "rgba(0,0,0,.5)",
                            "border-color": "rgba(0,0,0,.1)",
                        },
                        id="sidebar-toggle",
                    ),
                ],
                width="auto",
                align="center",
            ),
        ]
    )

    sidebar = html.Div(
        [
            sidebar_header,
            html.Div(
                [
                    html.Hr(),
                    html.P(
                        "Story Studio: Coaching Data Storytelling ",
                        className="lead",
                    ),
                ],
                id="blurb",
            ),
            dbc.Collapse(
                dbc.Nav(
                    [
                        dbc.NavLink("Home", href="/home", active="exact"),
                        dbc.NavLink("About the Data", href="/about", active="exact"),
                        dbc.NavLink("Resources", href="/resources", active="exact"),
                        dbc.NavLink("Search", href="/search", active="exact"),
                        dbc.NavLink("Contact Us", href="/contact", active="exact"),
                        dbc.NavLink("Logout", href="/login", id="logout-link", active="exact"),
                        html.Div(
                            html.Img(src="assets/UAENGLog.png", 
                                     className="logo-img", 
                                     style={'position': 'absolute', 'bottom': '5%', 'left': '5%', 'width': '10rem'}
                                     ),
                        ),
                    ],
                    vertical=True,
                    pills=True,
                ),
                id="collapse",
            ),
        ],
        id="sidebar",
        className=sidebar_class  # Assign the class dynamically
    )
    return sidebar
