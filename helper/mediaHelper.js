import express from 'express';
import dotenv from 'dotenv';
// import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';
import fs from 'fs';
import os from 'os';
import path from 'path';

dotenv.config();

//rest object
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


export const extractFrameFromVideo = (videoBuffer) => {
    return new Promise((resolve, reject) => {
      // Write the video buffer to a temporary file
      const tmpDir = os.tmpdir();
      const tmpVideoPath = path.join(tmpDir, 'tmp-video.mp4');
      fs.writeFileSync(tmpVideoPath, videoBuffer);
  
      const framePath = path.join(tmpDir, 'frame.jpg');
      ffmpeg(tmpVideoPath)
        .on('end', () => {
          // Read the frame back into a buffer
          fs.readFile(framePath, (err, data) => {
            if (err) {
              return reject(err);
            }
            resolve(data);
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .screenshots({
          count: 1,
          timemarks: ['0.5'], // Capture at the 0.5-second mark
          filename: 'frame.jpg',
          folder: tmpDir,
        });
    });
  };