import fs from 'fs';
import https from 'https';
import path from 'path';

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const dir = './public/models';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

files.forEach(file => {
  const dest = path.join(dir, file);
  https.get(baseUrl + file, (res) => {
    const stream = fs.createWriteStream(dest);
    res.pipe(stream);
    stream.on('finish', () => {
      stream.close();
      console.log(`Downloaded: ${file}`);
    });
  });
});