import dash
from dash import Input, Output, State, dcc, html

# Create the Dash app
app = dash.Dash(__name__)

# Simple layout with a button and some text output
app.layout = html.Div([
    dcc.Input(placeholder='Enter your username', type='text', id='uname-box'),
    dcc.Input(placeholder='Enter your password', type='password', id='pwd-box'),
    html.Button('Login', id='login-button'),
    html.Div(id='output-state')  # To display results
])

# Define the callback to detect the button click
@app.callback(
    Output('output-state', 'children'),
    [Input('login-button', 'n_clicks')],
    [State('uname-box', 'value'), State('pwd-box', 'value')]
)
def successful_login(n_clicks, username, password):
    if n_clicks is None:
        return "Click the login button to proceed."
    
    # Print to see if n_clicks is triggered
    print(f"Login button clicked {n_clicks} times")
    
    if not username or not password:
        return "Please provide both username and password."

    return f"Username: {username}, Password: {password}"

# Run the server
if __name__ == "__main__":
    app.run_server(host='0.0.0.0', port=8050, debug=True)
