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
import { createData, deleteData, matchData, readAllData, readAllLimitData, readSingleData, updateData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addTextWatermarkToImage, addTextWatermarkToVideo, extractFrameFromVideo, uploadFile, uploadWaterMarkFile } from "../helper/mediaHelper.js";

dotenv.config()

const CACHE_DURATION = 24 * 60 * 60 * 1000; //24 hours

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket()

//function to create our Students details
/* 
    request url = http://localhost:8080/api/v1/student/create-student
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
      "message": "Student created successfully",
      "student": {
      "studentId": "81d4a19c-683d-4387-9933-e337e1ac50dc",
      "title": "title3",
      "description": "desc3",
      "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2F81d4a19c-683d-4387-9933-e337e1ac50dc%2Fviddemo2.mp4?alt=media&token=acd72563-d7ea-4552-a00e-f60144857426"
      "imageUrl": "hgjhghj.com" (optional)
      }
}
*/
export const createStudents = async (req, res) => {
  try {
    const { title, description } = req.body;
    console.log(req)
    const files = req.files;
    const studentId = uuidv4();

    if (!title || !description || !files || !files.video) {
      return res.status(400).send({ message: 'Title, description video are required' });
    }

    const validateData = await matchData(process.env.ourStudentCollection, 'title', title);
    if (!validateData.empty) {
      return res.status(400).send({ message: 'Student already exists' });
    }

    let imageUrl = null;
    let videoUrl = null;
    var vidWatermark, vidWatermarkUrl, imgWatermarkUrl;

    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      vidWatermark = await addTextWatermarkToVideo(videoFile.buffer, 'SN MUSIC')
      vidWatermarkUrl = await uploadWaterMarkFile(vidWatermark, 'videos', `student/${studentId}/watermark/${videoFile.originalname}`);
      if (files.image && files.image.length > 0) {
        const imageFile = files.image[0];
        const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
        imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `student/${eventId}/image/${watermarkedFrameBuffer.originalname}`);
      } else {
        const frameBuffer = await extractFrameFromVideo(videoFile.buffer);
        const frameFile = {
          originalname: 'frame.jpg',
          mimetype: 'image/jpeg',
          buffer: frameBuffer,
        };
        const watermarkedFrameBuffer = await addTextWatermarkToImage(frameFile.buffer, 'SN MUSIC');
        imgWatermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `student/${eventId}/image/${watermarkedFrameBuffer.originalname}`);
      }
    } else {
      throw new Error('Video file is required.');
    }

    const studentJson = {
      studentId: studentId,
      title: title,
      description: description,
      imageUrl: imgWatermarkUrl,
      videoUrl: vidWatermarkUrl,
      timestamp: new Date(),
    };

    await createData(process.env.ourStudentCollection, studentId, studentJson);

    cache.del('our_students');

    res.status(201).send({
      success: true,
      message: 'Student created successfully',
      student: studentJson,
    });
  } catch (error) {
    console.error('Error in student creation:', error);
    res.status(500).send({
      success: false,
      message: 'Error in student creation',
      error: error.message,
    });
  }
};

//function to read all our Students details
/* 
    request url = http://localhost:8080/api/v1/student/read-all-student
    method = GET
    response : {
      "success": true,
      "message": "student read successfully",
      "student": [
        {
          "studentId": "0cfc8500-8ebd-44ac-b2f8-f46e712e24ed",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2Fviddemo1.mp4?alt=media&token=c1a87355-2d6e-49f5-b87c-8d67eaf0784b",
          "description": "gjygkjhjk",
          "title": "title2",
          "imageUrl": "hgjhghj.com"
        },
        {
          "studentId": "78ffed10-3e19-43a5-88d7-a6d907f0c708",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2Fviddemo1.mp4?alt=media&token=9481caa7-7bc3-446d-bc41-152eeffe558e",
          "description": "gfjghjgkjhgjgjgj",
          "title": "title1",
          "imageUrl": "hgjhghj.com"
        }
      ]
    }
*/

export const readAllStudent = async (req, res) => {
  try {
    var key = 'our_students'
    var student = await readAllLimitData(process.env.ourStudentCollection, ['studentId', 'imageUrl', 'description', 'title']);
    console.log('success');

    cache.put(key, student, CACHE_DURATION)

    return res.status(201).send({
      success: true,
      message: 'students read successfully',
      student: student
    });
  } catch (error) {
    console.error('Error in reading all student:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in reading all student',
      error: error.message,
    });
  }
};

//function to read single document of our Students details
/* 
    request url = http://localhost:8080/api/v1/student/read-student
    method = POST
    {
      "studentId": "jjhjhjsagsa" //your doc id
    }
      response: {
        "success": true,
        "message": "Album read successfully",
        "student": {
          "studentId": "0cfc8500-8ebd-44ac-b2f8-f46e712e24ed",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2Fviddemo1.mp4?alt=media&token=c1a87355-2d6e-49f5-b87c-8d67eaf0784b",
          "description": "gjygkjhjk",
          "title": "title2",
          "imageUrl": "hgjhghj.com"
        }
      }
*/
export const readSingleStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    var studentData = await readSingleData(process.env.ourStudentCollection, studentId);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'student read successfully',
      student: studentData
    });
  } catch (error) {
    console.error('Error in reading student:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in reading student',
      error: error.message,
    });
  }
};

//function to update single our Students details
/* 
    request url = http://localhost:8080/api/v1/student/update-student
    method = POST
    FormData: 
    fields: {
      "studentId": "studentId"
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
      "student": {
        "title": "title2",
        "description": "desc2_jhjhkhhkjhhkjjhjhkhkjkh",
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2F827f2156-239e-4673-a41c-7c29d921c956%2Fviddemo4.mp4?alt=media&token=15653233-06a6-4872-a74b-798c84700b1d"
        "imageUrl": "hgjhghj.com"
      }
    }
*/

export const updateStudent = async (req, res) => {
  try {
    const { studentId, title, description } = req.body;
    const files = req.files;

    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;

    if (!studentId) {
      return res.status(400).send({ message: 'Student ID is required' });
    }

    if (!title && !description && !files) {
      return res.status(400).send({ message: 'Title, description, and video are required' });
    }

    const validateData = await readSingleData(process.env.ourStudentCollection, studentId);

    if (!validateData) {
      return res.status(404).send({ message: 'Student not found' });
    }

    let imageUrl = null;
    let videoUrl = null;
    var watermarkUrl, vidWatermarkUrl, vidWatermark;

    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      console.log(videoFile);
      // videoUrl = await uploadFile(videoFile, 'videos', `event/${eventId}/video/${videoFile.originalname}`);
      vidWatermark = await addTextWatermarkToVideo(videoFile.buffer, 'SN MUSIC')
      vidWatermarkUrl = await uploadWaterMarkFile(vidWatermark, 'videos', `student/${studentId}/watermark/${videoFile.originalname}`);
      updates.videoUrl = vidWatermarkUrl;
    }

    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      console.log(imageFile);
      const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
      watermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `student/${studentId}/image/${watermarkedFrameBuffer.originalname}`);
      updates.imageUrl = watermarkUrl;
    }

    const student = await updateData(process.env.ourStudentCollection, studentId, updates);

    cache.del('our_students');

    res.status(201).send({
      success: true,
      message: 'Student updated successfully',
      student: updates,
    });
  } catch (error) {
    console.error('Error in updating student:', error);
    res.status(500).send({
      success: false,
      message: 'Error in updating student',
      error: error.message,
    });
  }
};

//function to delete single our Students details
/* 
    request url = http://localhost:8080/api/v1/student/delete-student
    method = POST
    req.body: 
    {
      "studentId": "studentId"
    }
    response: {
      "success": true,
      "message": "student deleted successfully",
      "album": {
        "_writeTime": {
          "_seconds": 1721311989,
          "_nanoseconds": 294702000
        }
      }
    }
*/
export const deleteStudent = async (req, res) => {
  try {
    let { studentId } = req.body;

    if (studentId) {
      const validateData = await readSingleData(process.env.ourStudentCollection, studentId)
      if (validateData) {
        var studentData = await deleteData(process.env.ourStudentCollection, studentId);
        console.log('success');

        cache.del('our_students');

        return res.status(201).send({
          success: true,
          message: 'student deleted successfully',
          student: studentData
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