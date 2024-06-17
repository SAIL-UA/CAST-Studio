import dash
from dash import dcc, html
from dash.dependencies import Input, Output

app = dash.Dash(__name__)

app.layout = html.Div([
    html.Div([
        html.Div('Drag me', draggable=True, id='drag-item-1', className='drag-item'),
        html.Div('Drag me too', draggable=True, id='drag-item-2', className='drag-item')
    ], id='left-container', className='container'),

    html.Div([], id='right-container', className='container')
])


@app.callback(
    Output('right-container', 'children'),
    [Input('drag-item-1', 'dragData'),
     Input('drag-item-2', 'dragData')]
)
def update_right_container(drag_data1, drag_data2):
    if drag_data1 is not None:
        return [html.Div(drag_data1, className='drag-item')]
    elif drag_data2 is not None:
        return [html.Div(drag_data2, className='drag-item')]
    else:
        return []


if __name__ == '__main__':
    app.run_server(debug=True)
