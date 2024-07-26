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
import { addTextWatermarkToImage, addTextWatermarkToVideo, extractFrameFromVideo, uploadFile, uploadWaterMarkFile } from "../helper/mediaHelper.js";

dotenv.config()

const CACHE_DURATION = 24 * 60 * 60 * 1000; //24 hours

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket()


//function to read all our Study details
/* 
    request url = http://localhost:8080/api/v1/study/read-all-study
    method = GET
    response: [
    {
      "studyId": "35e5869f-2e88-4880-8ae8-cff13d140ec9",
      "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/study%2F35e5869f-2e88-4880-8ae8-cff13d140ec9%2Fimage%2Fframe.jpg?alt=media&token=fcdcb285-db66-4a30-992e-3c2d80a9641b",
      "description": "desc5",
      "title": "title5"
    },
    {
      "studyId": "44588c1b-125b-44eb-9179-f6c59d9d7344",
      "imageUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/study%2F44588c1b-125b-44eb-9179-f6c59d9d7344%2Fimage%2Fframe.jpg?alt=media&token=ac167b7e-0a3e-49fe-937a-490cd9cefafa",
      "description": "desc3",
      "title": "title3"
    }
  ]
*/

export const readAllAccess = async (req, res) => {
    try {
        var key = 'all_access'
        // var study = await readAllData(process.env.studyCollection);
        var access = await readAllData(process.env.accessCollection);

        console.log("setting data in cache")
        var response = {
            success: true,
            message: 'access read successfully',
            access: access
        }
        cache.put(key, response, CACHE_DURATION)

        return res.status(201).send({
            success: true,
            message: 'access read successfully',
            access: access
        });
    } catch (error) {
        console.error('Error in reading all access:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading all access',
            error: error.message,
        });
    }
};


//function to read single document of our Study details
/* 
    request url = http://localhost:8080/api/v1/study/read-study
    method = POST
    {
      "studyId": "jjhjhjsagsa" //your doc id
    }
      response: {
        "success": true,
        "message": "Study read successfully",
        "student": {
          "studentId": "0cfc8500-8ebd-44ac-b2f8-f46e712e24ed",
          "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/study%2Fviddemo1.mp4?alt=media&token=c1a87355-2d6e-49f5-b87c-8d67eaf0784b",
          "description": "gjygkjhjk",
          "title": "title2",
          "imageUrl": "hgjhghj.com"
        }
      }
*/
export const readUserAccess = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).send({ message: 'Error finding study' });
        }

        var accessData = await readSingleData(process.env.accessCollection, userId);
        console.log('success');

        return res.status(201).send({
            success: true,
            message: 'access read successfully',
            access: accessData.study
        });
    } catch (error) {
        console.error('Error in reading access:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading access',
            error: error.message,
        });
    }
};


//function to update single our Study details
/*
    request url = http://localhost:8080/api/v1/study/update-study
    method = POST
    FormData: 
    fields: {
      "studyId": "studyId"
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
      "study": {
        "description": "desc1_jhjhkhhkjhhkjjhjhkhkjkh",
        "imageUrl": "hgjhghj.com"
        "videoUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/study%2F6638b142-4a0c-4eb8-8ed3-128ec3665e58%2Fviddemo4.mp4?alt=media&token=726d4053-bb5a-48a8-a1a9-b91764cdfb53"
      }
    }
*/
export const updateAccess = async (req, res) => {
    try {
        const { userId, studyId, approved } = req.body;

        var accessData = (await db.collection(process.env.accessCollection).doc(userId).get()).get("study");

        var fieldData = accessData.find(item => item.studyId === studyId)

        // Find and update the object
        const updatedData = accessData.map(item => {
            if (item.studyId === studyId) {
                if (approved) {
                    const now = new Date();

                    // Set the startDate to the current date
                    const startDate = now.toISOString(); // Converts to ISO string format

                    // Calculate the date 100 days from now
                    const expiryDate = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000).toISOString();
                    return {
                        ...item,
                        access: approved,
                        status: 'approved',
                        startDate: startDate,
                        expiryDate: expiryDate,
                    };
                }
            }
            return item;
        });

        var update = await db.collection(process.env.accessCollection).doc(userId).update({ "study": updatedData })
        console.log("success");

        res.status(201).send({
            success: true,
            message: 'Access Data updated successfully',
            fieldData: fieldData,
            updatedData: updatedData,
        });
    } catch (error) {
        console.error('Error in updating study:', error);
        res.status(500).send({
            success: false,
            message: 'Error in updating study',
            error: error.message,
        });
    }
};

//function to delete single our Study details
/* 
    request url = http://localhost:8080/api/v1/study/delete-study
    method = POST
    req.body: 
    {
      "studyId": "studyId"
    }
    response: {
      "success": true,
      "message": "study deleted successfully",
      "study": {
        "_writeTime": {
          "_seconds": 1721336310,
          "_nanoseconds": 790740000
        }
      }
    }
*/
export const deleteStudy = async (req, res) => {
    try {
        let { studyId } = req.body;

        if (studyId) {
            const validateData = await readSingleData(process.env.studyCollection, studyId)
            if (validateData) {
                var studyData = await deleteData(process.env.studyCollection, studyId);
                console.log('success');
                cache.del('all_study');

                return res.status(201).send({
                    success: true,
                    message: 'study deleted successfully',
                    study: studyData
                });
            }
        } else {
            cache.del('all_study');

            return res.send({ message: "Error while finding study" })
        }
        cache.del('all_study');

    } catch (error) {
        console.error('Error in study deletion:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in student deletion',
            error: error.message,
        });
    }
};