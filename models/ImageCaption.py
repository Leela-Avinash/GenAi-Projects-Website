from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import sys
import json

def generate_caption(file_paths):
    captions = []
    for path in file_paths:
        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

        image = Image.open(f'public/{path}')

        inputs = processor(image, return_tensors="pt")

        outputs = model.generate(**inputs, max_new_tokens=50)
        caption = processor.decode(outputs[0],skip_special_tokens=True)
 
        captions.append(caption)

    print(json.dumps(captions))

if __name__ == "__main__":
    file_paths = sys.argv[1:]
    generate_caption(file_paths)