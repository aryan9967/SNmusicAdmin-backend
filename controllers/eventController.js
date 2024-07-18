import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import multer from 'multer';
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { uploadVideo } from "../DB/storage.js";
import { createData, deleteData, matchData, readAllData, readSingleData, updateData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

dotenv.config()

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
    file: { //req.file
      "video": "file",
    }
    response: {
      "success": true,
      "message": "Student created successfully",
      "event": {
        "eventId": "e0cf3d7b-45db-4f06-aed8-12635f2df232",
        "title": "title2",
        "description": "desc2",
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/events%2Fe0cf3d7b-45db-4f06-aed8-12635f2df232%2Fviddemo3.mp4?alt=media&token=99e80870-57ea-4c2c-a7c6-f6403b6f42a4",
        "timestamp": "2024-07-18T20:50:10.233Z"
      }
    }
*/
export const createEvent = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const eventId = uuidv4();

    if (!title || !description || !file) {
      return res.status(400).send({ message: 'Title, description, and video are required' });
    }

    const validateData = await matchData(process.env.eventsCollection, 'title', title);
    if (!validateData.empty) {
      return res.status(400).send({ message: 'Event already exists' });
    }

    const storageRef = ref(storage, `${process.env.storagePath}/events/${eventId}/${file.originalname}`);
    console.log(storageRef.bucket);
    console.log(storageRef.fullPath);
    const metadata = {
      contentType: file.mimetype,
    };

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
        res.status(500).send({ message: 'Upload error', error: error.message });
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Download URL:', downloadURL);

          const eventJson = {
            eventId: eventId,
            title: title,
            description: description,
            videoUrl: downloadURL,
            timestamp: new Date(),
          };

          await createData(process.env.eventsCollection, eventId, eventJson);

          res.status(201).send({
            success: true,
            message: 'Student created successfully',
            event: eventJson,
          });
        } catch (error) {
          console.error('Error saving data:', error);
          res.status(500).send({ message: 'Error saving data', error: error.message });
        }
      }
    );
  } catch (error) {
    console.error('Error in student creation:', error);
    res.status(500).send({
      success: false,
      message: 'Error in student creation',
      error: error.message,
    });
  }
};

//function to read all our Events details
/* 
    request url = http://localhost:8080/api/v1/event/read-all-event
    method = GET
    response: {
      "success": true,
      "message": "events read successfully",
      "event": [
        {
          "eventId": "6638b142-4a0c-4eb8-8ed3-128ec3665e58",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/events%2F6638b142-4a0c-4eb8-8ed3-128ec3665e58%2Fviddemo1.mp4?alt=media&token=1f1799b7-89d8-4f4d-82b8-8db77e35f5bb",
          "description": "desc1",
          "title": "title1",
          "timestamp": {
            "_seconds": 1721335767,
            "_nanoseconds": 946000000
          }
        },
        {
          "eventId": "e0cf3d7b-45db-4f06-aed8-12635f2df232",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/events%2Fe0cf3d7b-45db-4f06-aed8-12635f2df232%2Fviddemo3.mp4?alt=media&token=99e80870-57ea-4c2c-a7c6-f6403b6f42a4",
          "description": "desc2",
          "title": "title2",
          "timestamp": {
            "_seconds": 1721335810,
            "_nanoseconds": 233000000
          }
        }
      ]
    }
*/

export const readAllEvent = async (req, res) => {
  try {
    var event = await readAllData(process.env.eventsCollection);
    console.log('success');

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

//function to read single document of our Events details
/* 
    request url = http://localhost:8080/api/v1/event/read-event
    method = POST
    {
      "eventId": "jjhjhjsagsa" //your doc id
    }
    response: {
      "success": true,
      "message": "event read successfully",
      "event": {
        "eventId": "6638b142-4a0c-4eb8-8ed3-128ec3665e58",
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/events%2F6638b142-4a0c-4eb8-8ed3-128ec3665e58%2Fviddemo1.mp4?alt=media&token=1f1799b7-89d8-4f4d-82b8-8db77e35f5bb",
        "description": "desc1",
        "title": "title1",
        "timestamp": {
          "_seconds": 1721335767,
          "_nanoseconds": 946000000
        }
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
    file: { //req.file
      "video": "file",
    }
    response: {
      "success": true,
      "message": "Student updated successfully",
      "student": {
        "description": "desc1_jhjhkhhkjhhkjjhjhkhkjkh",
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/events%2F6638b142-4a0c-4eb8-8ed3-128ec3665e58%2Fviddemo4.mp4?alt=media&token=726d4053-bb5a-48a8-a1a9-b91764cdfb53"
      }
    }
*/
export const updateEvent = async (req, res) => {
  try {
    const { eventId, title, description } = req.body;
    const file = req.file;
    var downloadURL;

    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;

    if (!eventId) {
      return res.status(400).send({ message: 'Error finding student' });
    }

    if (!title && !description && !file) {
      return res.status(400).send({ message: 'Title, description, and video are required' });
    }

    const validateData = await readSingleData(process.env.eventsCollection, eventId);

    if (validateData) {
      console.log(file);
      if (file) {
        const storageRef = ref(storage, `${process.env.storagePath}/events/${eventId}/${file.originalname}`);
        console.log(storageRef.fullPath);
        const metadata = {
          contentType: file.mimetype,
        };

        // Wrap the upload task in a Promise
        const uploadPromise = new Promise((resolve, reject) => {
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
                downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                if (downloadURL) updates.videoUrl = downloadURL;
                resolve();
              } catch (error) {
                console.error('Error getting download URL:', error);
                reject({ message: 'Error getting download URL', error: error.message });
              }
            }
          );
        });

        // Await the upload promise
        await uploadPromise;
      }

      const student = await updateData(process.env.eventsCollection, eventId, updates)
      console.log('success');

      res.status(201).send({
        success: true,
        message: 'Student updated successfully',
        student: updates,
      });
    }
  } catch (error) {
    console.error('Error in updating student:', error);
    res.status(500).send({
      success: false,
      message: 'Error in updating student',
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
      "message": "student deleted successfully",
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

        return res.status(201).send({
          success: true,
          message: 'student deleted successfully',
          event: eventData
        });
      }
    } else {
      return res.send({ message: "Error while finding student" })
    }

  } catch (error) {
    console.error('Error in student deletion:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in student deletion',
      error: error.message,
    });
  }
};