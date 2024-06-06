
import dash
import dash_bootstrap_components as dbc
from dash import Input, Output, State, dcc, html
def create_sidebar():
    # we use the Row and Col components to construct the sidebar header
    # it consists of a title, and a toggle, the latter is hidden on large screens
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
                # the column containing the toggle will be only as wide as the
                # toggle, resulting in the toggle being right aligned
                width="auto",
                # vertically align the toggle in the center
                align="center",
            ),
        ]
    )

    sidebar = html.Div(
        [
            sidebar_header,
            # we wrap the horizontal rule and short blurb in a div that can be
            # hidden on a small screen
            html.Div(
                [
                    html.Hr(),
                    html.P(
                        "Story Sudio: Coaching Data Storytelling ",
                        className="lead",
                    ),
                ],
                id="blurb",
            ),
            # use the Collapse component to animate hiding / revealing links
            dbc.Collapse(
                dbc.Nav(
                    [
                        dbc.NavLink("Home", href="/", active="exact"),
                        dbc.NavLink("About the Data", href="/about", active="exact"),
                        dbc.NavLink("Resources", href="/resources", active="exact"),
                        dbc.NavLink("Search", href="/search", active="exact"),
                        dbc.NavLink("Contact Us", href="/contact", active="exact"),
                        dbc.Col(
                html.Img(src="assets/UAENGLog.png",className="display-4",style={'position': 'absolute', 'bottom': '10%', 'left': '10%', 'width': '60%'}),
                # html.Img(src='/assets/your_image.jpg', style={'position': 'absolute', 'bottom': '0', 'left': '0', 'width': '100%'}),
                # width={"size": 0, "o  rder": "last", "offset": 1},
                
            )
                    ],
                    
                    vertical=True,
                    pills=True,
                ),
                
                id="collapse",
                
            ),

        
        ],
        id="sidebar",
        
    )
    return sidebar