import json
import base64

# Load the notebook JSON file
notebook_path = r'D:\CAST\inertia-sail\FLOW3_Stats.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    notebook = json.load(f)

# Extract images and related code
images_and_code = []

for cell in notebook['cells']:
    if cell['cell_type'] == 'code':
        code = ''.join(cell['source'])
        for output in cell.get('outputs', []):
            if output['output_type'] == 'display_data':
                image_data = output['data'].get('image/png', None)
                if image_data:
                    images_and_code.append((code, image_data))

# Save images and print related code
for idx, (code, image_data) in enumerate(images_and_code):
    image_bytes = base64.b64decode(image_data)
    image_path = f'cache/image_{idx}.png'
    txt_path = f'cache/image_{idx}.txt'
    with open(image_path, 'wb') as img_file:
        img_file.write(image_bytes)
    print(f"Image {idx} saved as {image_path}")
    print("Related code:")
    
    with open(txt_path, 'w') as txt_file:
        txt_file.write(code)
    print(code)
    print("\n" + "="*40 + "\n")
