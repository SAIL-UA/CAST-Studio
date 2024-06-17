import os
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import dash
from dash import dcc, html
import dash_bootstrap_components as dbc

# Set the path to the cache directory
cache_dir = 'cache'

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
            'text': text
        })


# Define the layout of the app
cards_layout =    [
                dbc.Col(
                    dbc.Card(
                        [
                            dbc.CardImg(src='data:image/png;base64,{}'.format(card['image']), top=True),
                            dbc.CardBody(
                                html.P(card['text'], className="card-text")
                            ),
                        ],
                        style={"width": "10rem"}
                    ),
                    # width=4
                ) for card in cards
            ]

# card = html.Div([
#     dbc.Container(
#         dbc.Row(
#             [
#                 dbc.Col(
#                     dbc.Card(
#                         [
#                             dbc.CardImg(src='data:image/png;base64,{}'.format(card['image']), top=True),
#                             dbc.CardBody(
#                                 html.P(card['text'], className="card-text")
#                             ),
#                         ],
#                         style={"width": "18rem", "margin": "10px"}
#                     ),
#                     width=4
#                 ) for card in cards
#             ],
#             justify="center"
#         ),
#         fluid=True
#     )
# ])

# Run the app
if __name__ == '__main__':
    app.run_server(debug=True)
