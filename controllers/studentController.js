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

//function to create our Students details
/* 
    request url = http://localhost:8080/api/v1/user/create-student
    method = POST
    FormData: 
    fields: {
      "title": "title1",
      "description": "desc1"
    }
    file: { //req.file
      "video": "file",
    }
*/
export const createStudents = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;
    const studentId = uuidv4();

    if (!title || !description || !file) {
      return res.status(400).send({ message: 'Title, description, and video are required' });
    }

    const validateData = await matchData(process.env.ourStudentCollection, 'title', title);
    if (!validateData.empty) {
      return res.status(400).send({ message: 'Student already exists' });
    }

    console.log(storage.app.name);
    const storageRef = ref(storage, `${process.env.storagePath}/students/${studentId}/${file.originalname}`);
    console.log(storageRef.parent);
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

          const studentJson = {
            studentId: studentId,
            title: title,
            description: description,
            videoUrl: downloadURL,
            timestamp: new Date(),
          };

          await createData(process.env.ourStudentCollection, studentId, studentJson);

          res.status(201).send({
            success: true,
            message: 'Student created successfully',
            student: studentJson,
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

//function to read all our Students details
/* 
    request url = http://localhost:8080/api/v1/user/read-all-student
    method = GET
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
    request url = http://localhost:8080/api/v1/user/read-student
    method = POST
    {
      "id": "jjhjhjsagsa" //your doc id
    }
*/
export const readSingleStudent = async (req, res) => {
  try {
    const { id } = req.body;
    var studentData = await readSingleData(process.env.ourStudentCollection, id);
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
    request url = http://localhost:8080/api/v1/user/update-student
    method = POST
    FormData: 
    fields: {
      "id": "id"
      "title": "title1",
      "description": "desc1"
    }
    file: { //req.file
      "video": "file",
    }
*/
export const updateStudent = async (req, res) => {
  try {
    const { id, title, description } = req.body;
    const file = req.file;
    var downloadURL;

    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;

    if (!id) {
      return res.status(400).send({ message: 'Error finding student' });
    }

    if (!title && !description && !file) {
      return res.status(400).send({ message: 'Title, description, and video are required' });
    }

    const validateData = await readSingleData(process.env.ourStudentCollection, id);

    if (validateData) {
      console.log(file);
      if (file) {
        const storageRef = ref(storage, `${process.env.storagePath}/students/${id}/${file.originalname}`);
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

      const student = await updateData(process.env.ourStudentCollection, id, updates)
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

//function to delete single our Students details
/* 
    request url = http://localhost:8080/api/v1/user/delete-student
    method = POST
    req.body: 
    {
      "id": "id"
    }
*/
export const deleteStudent = async (req, res) => {
  try {
    let { id } = req.body;

    if (id) {
      const validateData = await readSingleData(process.env.ourStudentCollection, id)
      if (validateData) {
        var albumData = await deleteData(process.env.ourStudentCollection, id);
        console.log('success');

        return res.status(201).send({
          success: true,
          message: 'student deleted successfully',
          album: albumData
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