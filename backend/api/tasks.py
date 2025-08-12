# backend/images/tasks.py

from celery import shared_task
from .models import ImageData
import os
import base64
from openai import OpenAI
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@shared_task
def generate_description_task(image_id):
  try:
  
    image = ImageData.objects.get(id=image_id)
    image_path = os.path.join(os.getenv('DATA_PATH'), image.user.username, "workspace", "cache", image.filepath)
    
    with open(image_path, "rb") as image_file:
      base64_image = base64.b64encode(image_file.read()).decode("utf-8")
      
    response = client.chat.completions.create(
      model="gpt-4o",
      temperature=0.1,
      messages=[
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "generate the description into the paragraph(s) based on this image",
            },
            {
              "type": "image_url",
              "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
            },
          ],
        }
      ],
    )
    result = response.choices[0].message.content
    
    image.long_desc = result
    image.long_desc_generating = False
    image.save()
    
    return f"Successfully generated description for image {image_id}"
  except Exception as e:
    return f"Error generating description for image {image_id}: {e}"