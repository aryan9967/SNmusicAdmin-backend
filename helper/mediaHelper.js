import express from 'express';
import dotenv from 'dotenv';
// import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createData, deleteData, matchData, readAllData, readSingleData, updateData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

dotenv.config();

//rest object
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

export const uploadFile = (file, type, folderPath) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, `${process.env.storagePath}/${folderPath}`);
    const metadata = { contentType: file.mimetype };
    const uploadTask = uploadBytesResumable(storageRef, file.buffer, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        console.log('Upload state:', snapshot.state);
        console.log('Bytes transferred:', snapshot.bytesTransferred);
        console.log('Total bytes:', snapshot.totalBytes);
      },
      (error) => {
        console.error('Upload error:', error);
        reject({ message: 'Upload error', error: error.message });
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Error getting download URL:', error);
          reject({ message: 'Error getting download URL', error: error.message });
        }
      }
    );
  });
};


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