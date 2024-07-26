import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import multer from 'multer';
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { uploadVideo } from "../DB/storage.js";
import cache from "memory-cache"
import { createData, deleteData, matchData, readAllData, readAllLimitData, readFieldData, readSingleData, updateData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addTextWatermarkToImage, addTextWatermarkToVideo, uploadFile, uploadWaterMarkFile } from "../helper/mediaHelper.js";

dotenv.config()

const CACHE_DURATION = 24 * 60 * 60 * 1000; //24 hours

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket()

//function to create Wind Instruments details
/* 
    request url = http://localhost:8080/api/v1/instrument/create-instrument
    method = POST
    FormData: 
    fields: {
      "title": "North Indian Bansuri" 
    }
    file: { //req.file
      "image": "image file"
      "video": "video file",
    }
    response: {
        "success": true,
        "message": "Instrument created successfully",
        "instrument": {
            "instrumentId": "5886b16b-a223-4e30-a58b-21e6e10e6f5c",
            "title": "North Indian Bansuri",
            "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fimages%2Finstrument1.jpg?alt=media&token=ca83de52-70f0-4258-a50b-434dd98f9835",
            "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fvideos%2FvidInstrument2.mp4?alt=media&token=7a6af880-03f9-4713-808b-796778ab25d9",
            "timestamp": "2024-07-19T07:56:31.942Z"
        }
    }
}
*/

// Create Instrument with Image and Video
export const createInstrument = async (req, res) => {
    try {
        const { title } = req.body;
        console.log(title);
        const files = req.files; // Assuming files are passed as an object with keys 'image' and 'video'
        const instrumentId = uuidv4();
        console.log(files);

        if (!title || !files || !files.image || !files.video) {
            return res.status(400).send({ message: 'Title, description, image, and video are required' });
        }

        const validateData = await matchData(process.env.instrumentCollection, 'title', title);
        if (!validateData.empty) {
            return res.status(400).send({ message: 'Instrument already exists' });
        }

        // const fileExtension = file.originalname.split('.').pop().toLowerCase();
        // const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension);
        // const isVideo = ['mp4', 'avi', 'mkv', 'mov'].includes(fileExtension);

        var imgWatermarkUrl, vidWatermarkUrl, vidWatermark;

        if (files.video && files.video.length > 0) {
            const videoFile = files.video[0];
            vidWatermark = await addTextWatermarkToVideo(videoFile.buffer, 'SN MUSIC')
            vidWatermarkUrl = await uploadWaterMarkFile(vidWatermark, 'videos', `instrument/${instrumentId}/watermark/${videoFile.originalname}`);
        }

        if (files.image && files.image.length > 0) {
            const imageFile = files.image[0];
            const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
            imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `instrument/${instrumentId}/image/${watermarkedFrameBuffer.originalname}`);
        }

        const instrumentJson = {
            instrumentId: instrumentId,
            title: title,
            imageUrl: imgWatermarkUrl,
            videoUrl: vidWatermarkUrl,
            timestamp: new Date(),
        };

        await createData(process.env.instrumentCollection, instrumentId, instrumentJson);

        cache.del('instrument');

        res.status(201).send({
            success: true,
            message: 'Instrument created successfully',
            instrument: instrumentJson,
        });
    } catch (error) {
        console.error('Error in instrument creation:', error);
        res.status(500).send({
            success: false,
            message: 'Error in instrument creation',
            error: error.message,
        });
    }
};

//function to read all our Instrument details
/* 
    request url = http://localhost:8080/api/v1/instrument/read-all-instrument
    method = GET
    response : {
        "success": true,
        "message": "instruments read successfully",
        "instrument": [
            {
            "instrumentId": "5886b16b-a223-4e30-a58b-21e6e10e6f5c",
            "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fimages%2Finstrument1.jpg?alt=media&token=ca83de52-70f0-4258-a50b-434dd98f9835",
            "title": "North Indian Bansuri",
            },
            {
            "instrumentId": "73f62850-b6a3-4f0d-862c-3916dc4c8a6f",
            "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F73f62850-b6a3-4f0d-862c-3916dc4c8a6f%2Fimages%2Finstrument3.png?alt=media&token=f4b8418d-2423-4eb4-8400-a29f049e957a",
            "title": "Western flute (Key or metal flute)",
            }
        ]
    }
*/

export const readAllInstrument = async (req, res) => {
    try {
        var key = "instrument"
        var instrument = await readAllLimitData(process.env.instrumentCollection, ['instrumentId', 'imageUrl', 'title']);
        console.log('success');

        var response = {
            success: true,
            message: 'instruments read successfully',
            instrument: instrument
        }
        cache.put(key, response, CACHE_DURATION)

        return res.status(201).send({
            success: true,
            message: 'instruments read successfully',
            instrument: instrument
        });
    } catch (error) {
        console.error('Error in reading all instruments:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading all instruments',
            error: error.message,
        });
    }
};

//function to read single videoUrl of our instrument details
/* 
    request url = http://localhost:8080/api/v1/instrument/read-instrument-video
    method = POST
    {
      "instrumentId": "jjhjhjsagsa" //your doc id
    }
    response: {
      "success": true,
      "message": "instrument video read successfully",
      "instrument": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/event%2Fa7c59a85-9090-43d5-b974-36f38ce23197%2Fwatermark%2FvidInstrument2.mp4?alt=media&token=365595af-367a-4fa7-91f5-047044c3c453"
    }
*/
export const readInstrumentVideo = async (req, res) => {
    try {
        const { instrumentId } = req.body;
        if (!instrumentId) {
            return res.status(400).send({ message: 'instrument id is required' });
        }
        // var event = await readAllData(process.env.eventsCollection);
        var instrument = await readFieldData(process.env.instrumentCollection, instrumentId, 'videoUrl');

        return res.status(201).send({
            success: true,
            message: 'instrument video read successfully',
            instrument: instrument
        });
    } catch (error) {
        console.error('Error in reading all instrument:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading all instrument',
            error: error.message,
        });
    }
};

//function to read single document of our Instruments details
/* 
    request url = http://localhost:8080/api/v1/instrument/read-instrument
    method = POST
    {
      "instrumentId": "jjhjhjsagsa" //your doc id
    }
    response: {
        "success": true,
        "message": "instrument read successfully",
        "instrument": {
            "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fvideos%2FvidInstrument2.mp4?alt=media&token=7a6af880-03f9-4713-808b-796778ab25d9",
            "instrumentId": "5886b16b-a223-4e30-a58b-21e6e10e6f5c",
            "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fimages%2Finstrument1.jpg?alt=media&token=ca83de52-70f0-4258-a50b-434dd98f9835",
            "title": "North Indian Bansuri",
            "timestamp": {
            "_seconds": 1721375791,
            "_nanoseconds": 942000000
            }
        }
    }
*/
export const readSingleInstrument = async (req, res) => {
    try {
        const { instrumentId } = req.body;
        if (!instrumentId) {
            return res.status(400).send({ message: 'Could not find such instrument' });
        }
        var instrumentData = await readSingleData(process.env.instrumentCollection, instrumentId);
        console.log('success');

        return res.status(201).send({
            success: true,
            message: 'instrument read successfully',
            instrument: instrumentData
        });
    } catch (error) {
        console.error('Error in reading instrument:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading instrument',
            error: error.message,
        });
    }
};

//function to update single our Instrument details
/* 
    request url = http://localhost:8080/api/v1/instrument/update-instrument
    method = POST
    FormData: 
    fields: {
      "instrumentId": "studentId"
      "title": "title1"
    }
    files: { //req.file
      "video": "video file",
      "imag1e": "image file"
    }
    response: {
        "success": true,
        "message": "Instrument updated successfully",
        "instrument": {
            "instrumentId": "5886b16b-a223-4e30-a58b-21e6e10e6f5c",
            "timestamp": {
            "_seconds": 1721375791,
            "_nanoseconds": 942000000
            },
            "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fvideos%2FvidInstrument2.mp4?alt=media&token=15ab045d-f3d6-4ca1-adc2-d0cf5933568e",
            "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/instruments%2F5886b16b-a223-4e30-a58b-21e6e10e6f5c%2Fimages%2Finstrument1.jpg?alt=media&token=971c5d03-a071-409a-80d1-581857e3c57e",
            "title": "North Indian Bansuri"
        }
    }
*/export const updateInstrument = async (req, res) => {
    try {
        const { instrumentId, title } = req.body;
        const files = req.files; // Assuming files are passed as an object with keys 'image' and 'video'
        const updates = {};
        let imageUrl, videoUrl;

        if (!instrumentId) {
            return res.status(400).send({ message: 'Could not find such instrument' });
        }

        if (!title && !files) {
            return res.status(400).send({ message: 'Title, image, or video is required' });
        }

        const validateData = await readSingleData(process.env.instrumentCollection, instrumentId);

        if (!validateData) {
            return res.status(404).send({ message: 'Instrument not found' });
        }

        if (title) updates.title = title;

        var imgWatermarkUrl, vidWatermarkUrl, vidWatermark;

        if (files.video && files.video.length > 0) {
            const videoFile = files.video[0];
            console.log(videoFile);
            // videoUrl = await uploadFile(videoFile, 'videos', `event/${eventId}/video/${videoFile.originalname}`);
            vidWatermark = await addTextWatermarkToVideo(videoFile.buffer, 'SN MUSIC')
            vidWatermarkUrl = await uploadWaterMarkFile(vidWatermark, 'videos', `instrument/${instrumentId}/watermark/${videoFile.originalname}`);
            updates.videoUrl = vidWatermarkUrl;
        }

        if (files.image && files.image.length > 0) {
            const imageFile = files.image[0];
            console.log(imageFile);
            const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
            imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `instrument/${instrumentId}/image/${watermarkedFrameBuffer.originalname}`);
            updates.imageUrl = imgWatermarkUrl;
        }

        await updateData(process.env.instrumentCollection, instrumentId, updates);

        cache.del('instrument');

        res.status(200).send({
            success: true,
            message: 'Instrument updated successfully',
            instrument: {
                ...validateData,
                ...updates,
            },
        });
    } catch (error) {
        console.error('Error in updating instrument:', error);
        res.status(500).send({
            success: false,
            message: 'Error in updating instrument',
            error: error.message,
        });
    }
};

//function to delete single our Instrument details
/* 
    request url = http://localhost:8080/api/v1/instrument/delete-instrument
    method = POST
    req.body: 
    {
      "instrumentId": "instrumentId"
    }
    response: {
      "success": true,
      "message": "instrument deleted successfully",
      "album": {
        "_writeTime": {
          "_seconds": 1721311989,
          "_nanoseconds": 294702000
        }
      }
    }
*/
export const deleteInstrument = async (req, res) => {
    try {
        let { instrumentId } = req.body;

        if (instrumentId) {
            const validateData = await readSingleData(process.env.instrumentCollection, instrumentId)
            if (validateData) {
                var instrumentData = await deleteData(process.env.instrumentCollection, instrumentId);
                console.log('success');

                cache.del('instrument');

                return res.status(201).send({
                    success: true,
                    message: 'student deleted successfully',
                    instrument: instrumentData
                });
            }
        } else {
            cache.del('instrument');
            return res.send({ message: "Error while finding instrument" })
        }

    } catch (error) {
        console.error('Error in instrument deletion:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in instrument deletion',
            error: error.message,
        });
    }
};