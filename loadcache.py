import os
import base64
import dash_bootstrap_components as dbc
from dash import html
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import json
from flask import session


def get_cache_dir():
    if 'username' in session:
        username = session['username']
    else:
        raise Exception("No username found in session.")

    base_cache_dir = '/data/CAST_ext/users/'

    cache_dir = os.path.join(base_cache_dir, username, "workspace/cache")

    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)

    return cache_dir


def load_cards():
    cache_dir = get_cache_dir()  # Now this will be called only when needed

    # Read all .png and .txt files from the cache directory
    png_files = [f for f in os.listdir(cache_dir) if f.endswith(('.png', '.jpg'))]
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

    return cards


def get_cards_layout():
    cache_dir = get_cache_dir()
    image_files = [f for f in os.listdir(cache_dir) if f.endswith(('.png', '.jpg'))]
    cards = load_cards()  # Load cards inside a function where session is available

    return [
        dbc.Col(
            dbc.Card(
                [
                    dbc.CardImg(
                        src='data:image/png;base64,{}'.format(card['image']),
                        top=True,
                        id=f'card-img-{os.path.splitext(image_file)[0]}',  # Use image file name as the ID for the image
                        className='card-img-top fixed-image'
                    ),
                    dbc.CardBody(
                        html.P(card['text'], className="card-text responsive-text", id=f'card-text-{os.path.splitext(image_file)[0]}')  # Use image file name for text
                    ),
                ],
                id=f'card-{os.path.splitext(image_file)[0]}',  # Use image file name as the ID for the card
                className='card-box'
            ),
            id=f'col-card-{os.path.splitext(image_file)[0]}'  # Use image file name as the ID for the column container
        )
        for image_file, card in zip(image_files, cards)
    ]

