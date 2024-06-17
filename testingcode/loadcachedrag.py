import os
import base64
import json
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import dash
from dash import dcc, html
import dash_bootstrap_components as dbc
from dash.dependencies import Input, Output

# Set the path to the cache directory
cache_dir = '../cache'

# Read all .png and .txt files from the cache directory
png_files = [f for f in os.listdir(cache_dir) if f.endswith('.png')]
txt_files = [f for f in os.listdir(cache_dir) if f.endswith('.txt')]

# Combine each pair into a card
cards = []

for png_file in png_files:
    base_name = os.path.splitext(png_file)[0]
    txt_file = base_name + '.txt'
    
    if txt_file in txt_files:
        # Read the image
        img_path = os.path.join(cache_dir, png_file)
        image = Image.open(img_path)
        
        # Read the text
        txt_path = os.path.join(cache_dir, txt_file)
        with open(txt_path, 'r') as file:
            text = file.read()
        
        # Create a blank canvas for the card
        card_width = max(image.width, 500)
        card_height = image.height + 100  # Extra space for text
        card = Image.new('RGB', (card_width, card_height), (255, 255, 255))
        
        # Paste the image onto the card
        card.paste(image, (0, 0))
        
        # Draw the text onto the card
        draw = ImageDraw.Draw(card)
        font = ImageFont.load_default()
        text_position = (10, image.height + 10)
        draw.text(text_position, text, fill=(0, 0, 0), font=font)
        
        # Save the card to an in-memory bytes buffer
        buffered = BytesIO()
        card.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        cards.append({
            'image': img_str,
            'text': text,
            'id': base_name
        })

# Initialize the Dash app
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

# Define the layout of the app
app.layout = html.Div([
    html.H1("Draggable Image and Text Cards", style={'textAlign': 'center'}),
    dcc.Store(id='card-order', data=[card['id'] for card in cards]),  # Store the order of the cards
    html.Div(
        id='card-container',
        children=[
            dbc.Card(
                [
                    dbc.CardImg(src='data:image/png;base64,{}'.format(card['image']), top=True),
                    dbc.CardBody(
                        html.P(card['text'], className="card-text")
                    ),
                ],
                id=card['id'],
                className='draggable',
                style={"width": "18rem", "margin": "10px", "display": "inline-block"}
            )
            for card in cards
        ]
    ),
    html.Div(id='drag-output', style={'display': 'none'})
])

# Custom JavaScript for drag-and-drop functionality
app.index_string = '''
<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>{%title%}</title>
        {%favicon%}
        {%css%}
        <style>
            .draggable {
                cursor: move;
            }
        </style>
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                let dragged;
                let container = document.getElementById('card-container');
                let dragOutput = document.getElementById('drag-output');

                container.addEventListener('dragstart', function(event) {
                    if (event.target.className.includes('draggable')) {
                        dragged = event.target;
                        event.target.style.opacity = 0.5;
                    }
                });

                container.addEventListener('dragend', function(event) {
                    if (event.target.className.includes('draggable')) {
                        event.target.style.opacity = "";
                    }
                });

                container.addEventListener('dragover', function(event) {
                    event.preventDefault();
                });

                container.addEventListener('dragenter', function(event) {
                    if (event.target.className.includes('draggable')) {
                        event.target.style.border = "2px dashed #000";
                    }
                });

                container.addEventListener('dragleave', function(event) {
                    if (event.target.className.includes('draggable')) {
                        event.target.style.border = "";
                    }
                });

                container.addEventListener('drop', function(event) {
                    event.preventDefault();
                    if (event.target.className.includes('draggable')) {
                        event.target.style.border = "";
                        if (dragged !== event.target) {
                            let nodes = Array.prototype.slice.call(container.children);
                            let draggedIndex = nodes.indexOf(dragged);
                            let targetIndex = nodes.indexOf(event.target);

                            if (draggedIndex > targetIndex) {
                                container.insertBefore(dragged, event.target);
                            } else {
                                container.insertBefore(dragged, event.target.nextSibling);
                            }

                            // Update order in hidden div
                            let order = [];
                            container.childNodes.forEach(function(card) {
                                order.push(card.id);
                            });
                            dragOutput.innerText = JSON.stringify(order);
                            dragOutput.dispatchEvent(new Event('change'));
                        }
                    }
                });
            });
        </script>
    </body>
</html>
'''

@app.callback(
    Output('card-order', 'data'),
    Input('drag-output', 'innerText')
)
def update_order(drag_output_value):
    if drag_output_value:
        return json.loads(drag_output_value)
    return dash.no_update

@app.callback(
    Output('card-container', 'children'),
    Input('card-order', 'data')
)
def reorder_cards(order):
    if not order:
        return dash.no_update

    ordered_cards = []
    for card_id in order:
        card = next(card for card in cards if card['id'] == card_id)
        ordered_cards.append(
            dbc.Card(
                [
                    dbc.CardImg(src='data:image/png;base64,{}'.format(card['image']), top=True),
                    dbc.CardBody(
                        html.P(card['text'], className="card-text")
                    ),
                ],
                id=card['id'],
                className='draggable',
                style={"width": "18rem", "margin": "10px", "display": "inline-block"}
            )
        )
    return ordered_cards

# Run the app
if __name__ == '__main__':
    app.run_server(debug=True)
