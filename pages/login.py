import dash_bootstrap_components as dbc
from dash import dcc, html

def create_login():
    return html.Div(
        [
            dcc.Location(id="url_login", refresh=True),
            html.Div(
                [
                    dbc.Row(
                        dbc.Col(
                            html.H3("Login to CAST Story Board"),
                            className="text-center mb-4",
                        ),
                        justify="center",
                    ),
                    dbc.Row(
                        dbc.Col(
                            dbc.Card(
                                dbc.CardBody(
                                    [
                                        dbc.Row(
                                            [
                                                dbc.Col(
                                                    dbc.Label("Username", html_for="uname-box"),
                                                    width=12
                                                ),
                                                dbc.Col(
                                                    dbc.Input(
                                                        placeholder="Enter your username",
                                                        type="text",
                                                        id="uname-box",
                                                        className="mb-3",
                                                        style={'border-radius': '5px'}
                                                    ),
                                                    width=12
                                                )
                                            ]
                                        ),
                                        dbc.Row(
                                            [
                                                dbc.Col(
                                                    dbc.Label("Password", html_for="pwd-box"),
                                                    width=12
                                                ),
                                                dbc.Col(
                                                    dbc.Input(
                                                        placeholder="Enter your password",
                                                        type="password",
                                                        id="pwd-box",
                                                        className="mb-3",
                                                        style={'border-radius': '5px'}
                                                    ),
                                                    width=12
                                                )
                                            ]
                                        ),
                                        dbc.Row(
                                            dbc.Col(
                                                dbc.Button(
                                                    "Login", 
                                                    id="login-button", 
                                                    color="primary", 
                                                    className="btn-block mt-3",
                                                    style={'width': '100%'}
                                                ),
                                                width=12
                                            ),
                                        ),
                                        dbc.Row(
                                            dbc.Col(
                                                html.Div(id='output-state', className="text-danger mt-3"),
                                                width=12
                                            )
                                        )
                                    ]
                                ),
                                className="shadow p-4",
                                style={"max-width": "100%"}
                            ),
                            width=12, md=6, lg=4, className="mx-auto"
                        ),
                        justify="center"
                    )
                ],
                style={"marginTop": "100px", "text-align": "center"}
            )
        ],
        className="container-fluid"
    )
