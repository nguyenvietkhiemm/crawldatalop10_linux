import pytesseract
from PIL import Image
import base64
from io import BytesIO
from PIL import ImageEnhance, ImageOps
import sys

if len(sys.argv) < 2:
    print("Usage: python decode.py <input>")

base64_image = sys.argv[1]

image_data = base64.b64decode(base64_image)
image = Image.open(BytesIO(image_data))

new_image = Image.new('RGB', image.size, (255, 255, 255))
new_image.paste(image, (0, 0), image)
new_image = new_image.resize((int(image.size[0] / 2), image.size[1]))


gray_image = ImageOps.grayscale(new_image)

enhancer = ImageEnhance.Contrast(gray_image)
enhanced_image = enhancer.enhance(10) 

result = pytesseract.image_to_string(enhanced_image)

print(result.upper())