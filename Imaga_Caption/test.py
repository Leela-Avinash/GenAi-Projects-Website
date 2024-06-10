import tensorflow as tf
from PIL import Image
import requests
import numpy as np
import json
import pandas as pd
import sys

def load_image_from_path(img_path):
    img = tf.io.read_file(img_path)
    img = tf.io.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, (299, 299))
    img = tf.cast(img, tf.float32) / 255.0
    return img

MAX_LENGTH = 40
VOCABULARY_SIZE = 10000
BATCH_SIZE = 32
BUFFER_SIZE = 1000
EMBEDDING_DIM = 512
UNITS = 512

captions = pd.read_csv(f'data/captions.txt')
captions['image'] = captions['image'].apply(
    lambda x: f'data/Images/{x}' if not x.startswith(f'data/Images/')
    else x)

tokenizer = tf.keras.layers.TextVectorization(
    max_tokens=VOCABULARY_SIZE,
    standardize=None,
    output_sequence_length=MAX_LENGTH)

tokenizer.adapt(captions['caption'])

idx2word = tf.keras.layers.StringLookup(
    mask_token="",
    vocabulary=tokenizer.get_vocabulary(),
    invert=True)

with open("model_architecture.json", "r") as json_file:
    architecture_json = json_file.read()

caption_model = tf.keras.models.model_from_json(architecture_json)

caption_model.load_weights('ImageCaptioningModel.h5')

def generate_caption(img_path):
    img = load_image_from_path(img_path)
    img = tf.expand_dims(img, axis=0)
    img_embed = caption_model.cnn_model(img)
    img_encoded = caption_model.encoder(img_embed, training=False)

    y_input = '[start]'
    for i in range(MAX_LENGTH-1):
        tokenized = tokenizer([y_input])[:, :-1]
        mask = tf.cast(tokenized != 0, tf.int32)
        pred = caption_model.decoder(
            tokenized, img_encoded, training=False, mask=mask)
        
        pred_idx = np.argmax(pred[0, i, :])
        pred_word = idx2word(pred_idx).numpy().decode('utf-8')
        if pred_word == '[end]':
            break
        
        y_input += ' ' + pred_word
    
    y_input = y_input.replace('[start] ', '')
    return y_input

def gen_caption(file_paths):
    captions = []
    for path in file_paths:
        image_path = f'public/' + path
        caption = generate_caption(image_path)
        captions.append(caption)

    print(json.dumps(captions))

if __name__ == "__main__":
    file_paths = sys.argv[1:]
    gen_caption(file_paths)