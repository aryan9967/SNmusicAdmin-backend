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
import { extractFrameFromVideo } from "../helper/mediaHelper.js";

dotenv.config()

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
    file: { //req.file
      "video": "video file",
      "image": "image file"
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
    console.log("file1", req.file)
    console.log("file2", req.files)
    console.log("file3", req.files[0])
    console.log("file4", files)
    const studentId = uuidv4();

    if (!title || !description || !files || !files.video) {
      return res.status(400).send({ message: 'Title, description, image, and video are required' });
    }

    const validateData = await matchData(process.env.ourStudentCollection, 'title', title);
    if (!validateData.empty) {
      return res.status(400).send({ message: 'Student already exists' });
    }

    const uploadFile = (file, type) => {
      return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `${process.env.storagePath}/students/${studentId}/${type}/${file.originalname}`);
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

    let imageUrl = null;
    let videoUrl = null;

    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      videoUrl = await uploadFile(videoFile, 'videos', videoFile.name);

      if (files.image && files.image.length > 0) {
        const imageFile = files.image[0];
        imageUrl = await uploadFile(imageFile, 'images', imageFile.name);
      } else {
        const frameBuffer = await extractFrameFromVideo(videoFile.buffer);
        const frameFile = {
          originalname: 'frame.jpg',
          mimetype: 'image/jpeg',
          buffer: frameBuffer,
        };
        imageUrl = await uploadFile(frameFile, 'images');
      }
    } else {
      throw new Error('Video file is required.');
    }

    const studentJson = {
      studentId: studentId,
      title: title,
      description: description,
      imageUrl: imageUrl,
      videoUrl: videoUrl,
      timestamp: new Date(),
    };

    await createData(process.env.ourStudentCollection, studentId, studentJson);

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
          "title": "title2"
          "imageUrl": "hgjhghj.com"
        },
        {
          "studentId": "78ffed10-3e19-43a5-88d7-a6d907f0c708",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/students%2Fviddemo1.mp4?alt=media&token=9481caa7-7bc3-446d-bc41-152eeffe558e",
          "description": "gfjghjgkjhgjgjgj",
          "title": "title1"
          "imageUrl": "hgjhghj.com"
        }
      ]
    }
*/

export const readAllStudent = async (req, res) => {
  try {
    var student = await readAllData(process.env.ourStudentCollection);
    console.log('success');

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
          "title": "title2"
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
    file: { //req.file
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

    const uploadFile = (file, type) => {
      return new Promise((resolve, reject) => {
        const storageRef = ref(storage, `${process.env.storagePath}/students/${studentId}/${type}/${file.originalname}`);
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

    let imageUrl = null;
    let videoUrl = null;

    if (files.video && files.video.length > 0) {
      const videoFile = files.video[0];
      videoUrl = await uploadFile(videoFile, 'videos');
      updates.videoUrl = videoUrl;

      if (files.image && files.image.length > 0) {
        const imageFile = files.image[0];
        imageUrl = await uploadFile(imageFile, 'images');
        updates.imageUrl = imageUrl;
      }
    }

    const student = await updateData(process.env.ourStudentCollection, studentId, updates);

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