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

//function to create our gallery details
/* 
    request url = http://localhost:8080/api/v1/user/create-gallery
    method = POST
    FormData: 
    file: { //req.file
      "file": "file",
    }
*/
export const createGallery = async (req, res) => {
    try {
        const file = req.file;
        const galleryId = uuidv4();

        if (!file) {
            return res.status(400).send({ message: 'Image are required' });
        }

        const validateData = await matchData(process.env.galleryCollection, 'name', file.originalname);
        if (!validateData.empty) {
            return res.status(400).send({ message: 'Student already exists' });
        }

        const storageRef = ref(storage, `${process.env.storagePath}/gallery/${galleryId}/${file.originalname}`);
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

                    const galleryJson = {
                        name: file.originalname,
                        galleryId: galleryId,
                        url: [downloadURL],
                        timestamp: new Date(),
                    };

                    await createData(process.env.galleryCollection, galleryId, galleryJson);

                    res.status(201).send({
                        success: true,
                        message: 'Gallery created successfully',
                        gallery: galleryJson,
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

//function to read all our Gallery details
/* 
    request url = http://localhost:8080/api/v1/user/read-all-gallery
    method = GET
*/

export const readAllGallery = async (req, res) => {
    try {
        var gallery = await readAllData(process.env.galleryCollection);
        console.log('success');

        return res.status(201).send({
            success: true,
            message: 'gallery read successfully',
            gallery: gallery
        });
    } catch (error) {
        console.error('Error in reading all gallery:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading all gallery',
            error: error.message,
        });
    }
};

//function to read single document of our Gallery details
/* 
    request url = http://localhost:8080/api/v1/user/read-gallery
    method = POST
    {
      "gallerId": "jjhjhjsagsa" //your doc id
    }
*/
export const readSingleGallery = async (req, res) => {
    try {
        const { galleryId } = req.body;
        var galleryData = await readSingleData(process.env.galleryCollection, galleryId);
        console.log('success');

        return res.status(201).send({
            success: true,
            message: 'student read successfully',
            gallery: galleryData
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

//function to update single our Gallery details
/* 
    request url = http://localhost:8080/api/v1/user/update-gallery
    method = POST
    FormData: 
    fields: {
      "galleryId": "galleryId"
    }
    file: { //req.file
      "file": "file",
    }
*/
export const updateGallery = async (req, res) => {
    try {
        const { galleryId } = req.body;
        const file = req.file;
        var downloadURL;

        // Create the updates object only with provided fields

        if (!galleryId) {
            return res.status(400).send({ message: 'Error finding student' });
        }

        const validateData = await readSingleData(process.env.galleryCollection, galleryId);

        if (validateData) {
            console.log(file);
            if (file) {
                const storageRef = ref(storage, `${process.env.storagePath}/gallery/${galleryId}/${file.originalname}`);
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
                                if (downloadURL) updates.imgUrl = downloadURL;
                                if (file.originalname) updates.name = file.originalname;
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

            const gallery = await updateData(process.env.galleryCollection, galleryId, updates)
            console.log('success');

            res.status(201).send({
                success: true,
                message: 'Student updated successfully',
                gallery: updates,
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

//function to delete single our Gallery details
/* 
    request url = http://localhost:8080/api/v1/user/delete-gallery
    method = POST
    req.body: 
    {
      "galleryId": "galleryId"
    }
*/
export const deleteGallery = async (req, res) => {
    try {
        let { galleryId } = req.body;

        if (galleryId) {
            const validateData = await readSingleData(process.env.galleryCollection, galleryId)
            if (validateData) {
                var galleryData = await deleteData(process.env.galleryCollection, galleryId);
                console.log('success');

                return res.status(201).send({
                    success: true,
                    message: 'student deleted successfully',
                    gallery: galleryData
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