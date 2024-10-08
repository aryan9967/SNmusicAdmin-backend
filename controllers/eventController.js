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
import { createData, deleteData, fetchAndFilter, matchData, readAllData, readAllLimitData, readFieldData, readSingleData, updateData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addTextWatermarkToImage, addTextWatermarkToVideo, extractFrameFromVideo, uploadFile, uploadWaterMarkFile } from "../helper/mediaHelper.js";

dotenv.config()

const CACHE_DURATION = 24 * 60 * 60 * 1000; //24 hours

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket()

//function to create our Events details
/* 
    request url = http://localhost:8080/api/v1/event/create-event
    method = POST
    FormData: 
    fields: {
      "title": "title1",
      "description": "desc1"
    }
    files: { //req.file
      "video": "video file",
      "image": "image file for thumbnail"
    }
    response: {
      "success": true,
      "message": "Event created successfully",
      "event": {
        "eventId": "bb9ee1bc-f704-4aa0-a1cb-fbe255e9c5be",
        "title": "title9",
        "description": "desc9",
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/event%2Fbb9ee1bc-f704-4aa0-a1cb-fbe255e9c5be%2Fwatermark%2FvidInstrument2.mp4?alt=media&token=7f2bdbf5-22d5-4d04-8415-1c56ffe9e4e4",
        "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/event%2Fbb9ee1bc-f704-4aa0-a1cb-fbe255e9c5be%2Fimage%2Fundefined?alt=media&token=f12e8276-8070-4b82-96d0-fd3334c1abb6",
        "timestamp": "2024-07-22T16:27:20.343Z"
      }
    }
*/
export const createEvent = async (req, res) => {
  try {
    const { title, description } = req.body;
    const files = req.files;
    const eventId = uuidv4();

    if (!title || !description || !files || !files.video) {
      return res.status(400).send({ message: 'Title, description and video are required' });
    }

    const validateData = await matchData(process.env.eventsCollection, 'title', title);
    if (!validateData.empty) {
      return res.status(400).send({ message: 'Event already exists' });
    }

    let imageUrl = null;
    let videoUrl = null;
    var vidWatermark, vidWatermarkUrl, imgWatermarkUrl;

    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      vidWatermark = await addTextWatermarkToVideo(videoFile.buffer, 'SN MUSIC')
      vidWatermarkUrl = await uploadWaterMarkFile(vidWatermark, 'videos', `event/${eventId}/watermark/${videoFile.originalname}`);
      if (files.image && files.image.length > 0) {
        const imageFile = files.image[0];
        const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
        imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `event/${eventId}/image/${watermarkedFrameBuffer.originalname}`);
      } else {
        const frameBuffer = await extractFrameFromVideo(videoFile.buffer);
        const frameFile = {
          originalname: 'frame.jpg',
          mimetype: 'image/jpeg',
          buffer: frameBuffer,
        };
        const watermarkedFrameBuffer = await addTextWatermarkToImage(frameFile.buffer, 'SN MUSIC');
        imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `event/${eventId}/image/${watermarkedFrameBuffer.originalname}`);
      }
    } else {
      throw new Error('Video file is required.');
    }

    const eventJson = {
      eventId: eventId,
      title: title,
      description: description,
      videoUrl: vidWatermarkUrl,
      imageUrl: imgWatermarkUrl,
      timestamp: new Date(),
    };

    await createData(process.env.eventsCollection, eventId, eventJson);

    cache.del('all_events');

    res.status(201).send({
      success: true,
      message: 'Event created successfully',
      event: eventJson,
    });
  } catch (error) {
    console.error('Error in event creation:', error);
    res.status(500).send({
      success: false,
      message: 'Error in event creation',
      error: error.message,
    });
  }
};

//function to read all our Events details
/* 
    request url = http://localhost:8080/api/v1/event/read-all-event
    method = GET
    response: [
    {
      "eventId": "35e5869f-2e88-4880-8ae8-cff13d140ec9",
      "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/event%2F35e5869f-2e88-4880-8ae8-cff13d140ec9%2Fimage%2Fframe.jpg?alt=media&token=fcdcb285-db66-4a30-992e-3c2d80a9641b",
      "description": "desc5",
      "title": "title5"
    },
    {
      "eventId": "44588c1b-125b-44eb-9179-f6c59d9d7344",
      "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/event%2F44588c1b-125b-44eb-9179-f6c59d9d7344%2Fimage%2Fframe.jpg?alt=media&token=ac167b7e-0a3e-49fe-937a-490cd9cefafa",
      "description": "desc3",
      "title": "title3"
    }
  ]
*/

export const readAllEvent = async (req, res) => {
  try {
    var key = 'all_events'
    // var event = await readAllData(process.env.eventsCollection);
    var event = await readAllLimitData(process.env.eventsCollection, ['eventId', 'imageUrl', 'description', 'title']);

    console.log("setting data in cache")
    var response = {
      success: true,
      message: 'events read successfully',
      event: event
    }
    cache.put(key, response, CACHE_DURATION)

    return res.status(201).send({
      success: true,
      message: 'events read successfully',
      event: event
    });
  } catch (error) {
    console.error('Error in reading all event:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in reading all event',
      error: error.message,
    });
  }
};

//function to read single videoUrl of our Events details
/* 
    request url = http://localhost:8080/api/v1/event/read-event-video
    method = POST
    {
      "eventId": "jjhjhjsagsa" //your doc id
    }
    response: {
      "success": true,
      "message": "event video read successfully",
      "event": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/event%2Fa7c59a85-9090-43d5-b974-36f38ce23197%2Fwatermark%2FvidInstrument2.mp4?alt=media&token=365595af-367a-4fa7-91f5-047044c3c453"
    }
*/


//function to read single document of our Students details
/* 
    request url = http://localhost:8080/api/v1/event/read-event
    method = POST
    {
      "eventId": "jjhjhjsagsa" //your doc id
    }
      response: {
        "success": true,
        "message": "Event read successfully",
        "event": {
          "studentId": "0cfc8500-8ebd-44ac-b2f8-f46e712e24ed",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2Fviddemo1.mp4?alt=media&token=c1a87355-2d6e-49f5-b87c-8d67eaf0784b",
          "description": "gjygkjhjk",
          "title": "title2",
          "imageUrl": "hgjhghj.com"
        }
      }
*/
export const readKeywordEvent = async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).send({ message: 'Error finding event' });
    }

    var eventData = await fetchAndFilter(process.env.eventsCollection, keyword);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'event read successfully',
      event: eventData
    });
  } catch (error) {
    console.error('Error in reading event:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in reading event',
      error: error.message,
    });
  }
};

export const readEventVideo = async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).send({ message: 'Event id is required' });
    }
    // var event = await readAllData(process.env.eventsCollection);
    var event = await readFieldData(process.env.eventsCollection, eventId, 'videoUrl');

    return res.status(201).send({
      success: true,
      message: 'event video read successfully',
      event: event
    });
  } catch (error) {
    console.error('Error in reading all event:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in reading all event',
      error: error.message,
    });
  }
};


//function to read single document of our Students details
/* 
    request url = http://localhost:8080/api/v1/event/read-event
    method = POST
    {
      "eventId": "jjhjhjsagsa" //your doc id
    }
      response: {
        "success": true,
        "message": "Event read successfully",
        "event": {
          "studentId": "0cfc8500-8ebd-44ac-b2f8-f46e712e24ed",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2Fviddemo1.mp4?alt=media&token=c1a87355-2d6e-49f5-b87c-8d67eaf0784b",
          "description": "gjygkjhjk",
          "title": "title2",
          "imageUrl": "hgjhghj.com"
        }
      }
*/
export const readSingleEvent = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).send({ message: 'Error finding event' });
    }

    var eventData = await readSingleData(process.env.eventsCollection, eventId);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'event read successfully',
      event: eventData
    });
  } catch (error) {
    console.error('Error in reading event:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in reading event',
      error: error.message,
    });
  }
};

//function to update single our Events details
/* 
    request url = http://localhost:8080/api/v1/event/update-event
    method = POST
    FormData: 
    fields: {
      "eventId": "eventId"
      "title": "title1",
      "description": "desc1"
    }
    files: { //req.files
      "video": "video file",
      "image": "image file"
    }
    response: {
      "success": true,
      "message": "Student updated successfully",
      "event": {
        "description": "desc1_jhjhkhhkjhhkjjhjhkhkjkh",
        "imageUrl": "hgjhghj.com"
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/events%2F6638b142-4a0c-4eb8-8ed3-128ec3665e58%2Fviddemo4.mp4?alt=media&token=726d4053-bb5a-48a8-a1a9-b91764cdfb53"
      }
    }
*/
export const updateEvent = async (req, res) => {
  try {
    const { eventId, title, description } = req.body;
    const files = req.files;

    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    const watermarkPath = "../../SNmusicAdmin/admin/src/images/watermark2.png";

    if (!eventId) {
      return res.status(400).send({ message: 'Error finding student' });
    }

    if (!title && !description && !files) {
      return res.status(400).send({ message: 'Title, description, and video are required' });
    }

    const validateData = await readSingleData(process.env.eventsCollection, eventId);

    if (!validateData) {
      return res.status(404).send({ message: 'Event not found' });
    }

    let imageUrl = null;
    let videoUrl = null;
    var imgWatermarkUrl, vidWatermarkUrl, vidWatermark;

    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      console.log(videoFile);
      // videoUrl = await uploadFile(videoFile, 'videos', `event/${eventId}/video/${videoFile.originalname}`);
      vidWatermark = await addTextWatermarkToVideo(videoFile.buffer, 'SN MUSIC')
      vidWatermarkUrl = await uploadWaterMarkFile(vidWatermark, 'videos', `event/${eventId}/watermark/${videoFile.originalname}`);
      updates.videoUrl = vidWatermarkUrl;
    }

    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      console.log(imageFile);
      const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
      imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `event/${eventId}/image/${watermarkedFrameBuffer.originalname}`);
      updates.imageUrl = imgWatermarkUrl;
    }

    const student = await updateData(process.env.eventsCollection, eventId, updates)
    console.log('success');
    cache.del('all_events');

    res.status(201).send({
      success: true,
      message: 'Event updated successfully',
      event: updates,
    });
  } catch (error) {
    console.error('Error in updating event:', error);
    res.status(500).send({
      success: false,
      message: 'Error in updating event',
      error: error.message,
    });
  }
};

//function to delete single our Events details
/* 
    request url = http://localhost:8080/api/v1/event/delete-event
    method = POST
    req.body: 
    {
      "eventId": "eventId"
    }
    response: {
      "success": true,
      "message": "event deleted successfully",
      "event": {
        "_writeTime": {
          "_seconds": 1721336310,
          "_nanoseconds": 790740000
        }
      }
    }
*/
export const deleteEvent = async (req, res) => {
  try {
    let { eventId } = req.body;

    if (eventId) {
      const validateData = await readSingleData(process.env.eventsCollection, eventId)
      if (validateData) {
        var eventData = await deleteData(process.env.eventsCollection, eventId);
        console.log('success');
        cache.del('all_events');

        return res.status(201).send({
          success: true,
          message: 'event deleted successfully',
          event: eventData
        });
      }
    } else {
      cache.del('all_events');

      return res.send({ message: "Error while finding event" })
    }
    cache.del('all_events');

  } catch (error) {
    console.error('Error in event deletion:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in student deletion',
      error: error.message,
    });
  }
};