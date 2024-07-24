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
import { createData, deleteData, deleteSubFieldData, matchData, readAllData, readFieldData, readSingleData, readSubFieldData, updateData, updateSubFieldData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from "firebase/firestore";
import { addTextWatermarkToImage, uploadFile } from "../helper/mediaHelper.js";

dotenv.config()

const CACHE_DURATION = 24 * 60 * 60 * 1000; //24 hours

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket()

//NOTE: gallery document id and field name is store in env file which is provided in colab
//function to add our gallery image details 
//NOTE: No nned to create gallery if no image present in gallery it will automatically create it and add the image, if it exists it will update it it by appending new image
/* 
    request url = http://localhost:8080/api/v1/gallery/add-gallery
    method = POST
    FormData: 
    file: { //req.file
      "file": "file",
    }
    response: {
        "success": true,
        "message": "Gallery updated successfully",
        "gallery": {
        "imageId": "260a79a0-0ae0-4a67-9534-bba98d6fbd7c",
        "name": "instrument2.png",
        "galleryId": "d582c96d-01f8-44d0-8aa6-44b4004ce31a",
        "url": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/gallery%2Fd582c96d-01f8-44d0-8aa6-44b4004ce31a%2F260a79a0-0ae0-4a67-9534-bba98d6fbd7c%2F1721591886300%2Fimage%2Fundefined?alt=media&token=900854de-1246-4448-918d-4a9058dc53fa",
        "timestamp": "2024-07-21T19:58:09.549Z"
    }
}
*/
export const addGallery = async (req, res) => {
    try {
        const file = req.file;
        const galleryId = process.env.galleryId; // Get galleryId from env
        const galleryCollection = process.env.galleryCollection;
        const fieldName = process.env.galleryField;
        const imageId = uuidv4();
        var watermarkUrl, gallery;

        if (!file) {
            return res.status(400).send({ message: 'Image is required' });
        }

        if (file) {
            const imageFile = file;
            console.log(imageFile);
            const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
            watermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `gallery/${galleryId}/${imageId}/${Date.now()}/image/${watermarkedFrameBuffer.originalname}`);
        }

        const galleryDoc = await readSingleData(process.env.galleryCollection, galleryId);

        let galleryData = [];

        if (galleryDoc) {
            galleryData = galleryDoc[fieldName] || [];
        }

        // Create new gallery item
        const newGalleryItem = {
            imageId: imageId,
            name: file.originalname,
            galleryId: galleryId,
            url: watermarkUrl,
            timestamp: new Date(),
        };

        // Append new gallery item to existing data
        galleryData.push(newGalleryItem);


        if (!galleryDoc) {
            gallery = await createData(process.env.galleryCollection, galleryId, { [fieldName]: galleryData })
        }
        gallery = await updateData(process.env.galleryCollection, galleryId, { [fieldName]: galleryData })
        console.log('success');

        cache.del('gallery');

        res.status(201).send({
            success: true,
            message: 'Gallery added successfully',
            gallery: newGalleryItem,
        });
    } catch (error) {
        console.error('Error in gallery creation:', error);
        res.status(500).send({
            success: false,
            message: 'Error in gallery creation',
            error: error.message,
        });
    }
};

//function to read all our Gallery details 
/* 
    request url = http://localhost:8080/api/v1/gallery/read-all-gallery
    method = GET
    response: {
        "success": true,
        "message": "gallery read successfully",
        "gallery": [
            {
            "imageId": "ec933eb9-29ff-4c72-82dc-a58bab1637f9",
            "galleryId": "d582c96d-01f8-44d0-8aa6-44b4004ce31a",
            "name": "instrument3.png",
            "url": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/gallery%2Fd582c96d-01f8-44d0-8aa6-44b4004ce31a%2Fec933eb9-29ff-4c72-82dc-a58bab1637f9%2F1721589025352%2Fimage%2Fundefined?alt=media&token=46cd1d8d-07c0-4277-bba1-ee646efb9714",
            "timestamp": {
                "_seconds": 1721589028,
                "_nanoseconds": 504000000
            }
            },
            {
            "imageId": "260a79a0-0ae0-4a67-9534-bba98d6fbd7c",
            "galleryId": "d582c96d-01f8-44d0-8aa6-44b4004ce31a",
            "name": "instrument2.png",
            "url": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/gallery%2Fd582c96d-01f8-44d0-8aa6-44b4004ce31a%2F260a79a0-0ae0-4a67-9534-bba98d6fbd7c%2F1721591886300%2Fimage%2Fundefined?alt=media&token=900854de-1246-4448-918d-4a9058dc53fa",
            "timestamp": {
                "_seconds": 1721591889,
                "_nanoseconds": 549000000
            }
            }
        ]
    }
*/
export const readAllGallery = async (req, res) => {
    try {
        var key = "gallery"
        const galleryId = process.env.galleryId; // Get galleryId from env
        const fieldName = process.env.galleryField;
        var gallery = await readFieldData(process.env.galleryCollection, galleryId, fieldName);
        console.log('success');

        var response = {
            success: true,
            message: 'gallery read successfully',
            gallery: gallery
        }
        cache.put(key, response, CACHE_DURATION)

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


//function to read single Gallery image 
/* 
    request url = http://localhost:8080/api/v1/gallery/read-gallery-image
    method = POST
    req.body: {
        "imageId": "imageId"
    }
    response: {
        "success": true,
        "message": "gallery read successfully",
        "gallery": {
            "imageId": "04981c97-ef49-4c74-ab2c-09f88b6d832a",
            "galleryId": "d582c96d-01f8-44d0-8aa6-44b4004ce31a",
            "name": "instrument1.jpg",
            "url": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/gallery%2Fd582c96d-01f8-44d0-8aa6-44b4004ce31a%2F04981c97-ef49-4c74-ab2c-09f88b6d832a%2F1721588913514%2Fimage%2Fundefined?alt=media&token=ca5b9fd7-b242-4c01-b756-2d828c6646c0",
            "timestamp": {
            "_seconds": 1721588916,
            "_nanoseconds": 850000000
            }
        }
    }
*/
export const readSingleGalleryImage = async (req, res) => {
    try {
        const { imageId } = req.body;
        const galleryId = process.env.galleryId; // Get galleryId from env
        const fieldName = process.env.galleryField;
        console.log(imageId);
        var galleryData = await readSubFieldData(process.env.galleryCollection, galleryId, fieldName, imageId);
        console.log('success');

        return res.status(201).send({
            success: true,
            message: 'gallery image read successfully',
            gallery: galleryData
        });
    } catch (error) {
        console.error('Error in reading gallery image:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in reading gallery image',
            error: error.message,
        });
    }
};


//function to update single our Gallery image
/* 
    request url = http://localhost:8080/api/v1/gallery/update-gallery-image
    method = POST
    FormData: 
    fields: {
      "imageId": "imageId"
    }
    file: { //req.file
      "file": "file",
    }
    response: {
        "success": true,
        "message": "Gallery image updated successfully",
        "gallery": {
            "imageId": "04981c97-ef49-4c74-ab2c-09f88b6d832a",
            "name": "instrument3.png",
            "galleryId": "d582c96d-01f8-44d0-8aa6-44b4004ce31a",
            "url": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/gallery%2Fd582c96d-01f8-44d0-8aa6-44b4004ce31a%2F04981c97-ef49-4c74-ab2c-09f88b6d832a%2F1721592330858%2Fimage%2Fundefined?alt=media&token=74ec0a67-5cb1-45a8-a2e6-b2a2bcaaac3f",
            "timestamp": "2024-07-21T20:05:32.546Z"
        }
    }
*/
export const updateGalleryImage = async (req, res) => {
    try {
        const { imageId } = req.body;
        const file = req.file;
        const galleryId = process.env.galleryId; // Get galleryId from env
        const fieldName = process.env.galleryField;
        var watermarkUrl, gallery;

        if (!file) {
            return res.status(400).send({ message: 'Image is required' });
        }

        const validateData = await readSingleData(process.env.galleryCollection, galleryId);

        if (!validateData) {
            return res.status(404).send({ message: 'Gallery image not found' });
        }

        if (file) {
            const imageFile = file;
            console.log(imageFile);
            const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
            watermarkUrl = await uploadFile(watermarkedFrameBuffer, 'images', `gallery/${galleryId}/${imageId}/${Date.now()}/image/${watermarkedFrameBuffer.originalname}`);
        }

        // Create new gallery item
        const newGalleryItem = {
            imageId: imageId,
            name: file.originalname,
            galleryId: galleryId,
            url: watermarkUrl,
            timestamp: new Date(),
        };

        gallery = await updateSubFieldData(process.env.galleryCollection, galleryId, fieldName, imageId, newGalleryItem)
        console.log('success');

        cache.del('gallery');

        res.status(201).send({
            success: true,
            message: 'Gallery image updated successfully',
            gallery: newGalleryItem,
        });
    } catch (error) {
        console.error('Error in updating gallery:', error);
        res.status(500).send({
            success: false,
            message: 'Error in updating gallery',
            error: error.message,
        });
    }
};

//function to delete all our Gallery details
//NOTE: Don't use it it will remove all gallery images
/* 
    request url = http://localhost:8080/api/v1/gallery/delete-gallery
    method = POST
    Asking for galleryId because it is secured function
    req.body: 
    {
      "galleryId": "galleryId"
    }
      response: {
        "success": true,
        "message": "gallery deleted successfully",
        "gallery": {
            "_writeTime": {
            "_seconds": 1721335483,
            "_nanoseconds": 272460000
            }
        }
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

                cache.del('gallery');

                return res.status(201).send({
                    success: true,
                    message: 'Gallery deleted successfully',
                    gallery: galleryData
                });
            }
        } else {
            return res.send({ message: "Error while finding Gallery" })
        }

    } catch (error) {
        console.error('Error in Gallery deletion:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in Gallery deletion',
            error: error.message,
        });
    }
};


//function to delete single Gallery image
//NOTE: Don't use it it will remove all gallery images
/* 
    request url = http://localhost:8080/api/v1/gallery/delete-gallery-image
    method = POST
    req.body: 
    {
      "imageId": "imageId"
    }
    response: {
        "success": true,
        "message": "gallery deleted successfully",
        "gallery": [
            {
            "subId": "04981c97-ef49-4c74-ab2c-09f88b6d832a",
            "imageId": "04981c97-ef49-4c74-ab2c-09f88b6d832a",
            "galleryId": "d582c96d-01f8-44d0-8aa6-44b4004ce31a",
            "name": "instrument3.png",
            "url": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/gallery%2Fd582c96d-01f8-44d0-8aa6-44b4004ce31a%2F04981c97-ef49-4c74-ab2c-09f88b6d832a%2F1721592330858%2Fimage%2Fundefined?alt=media&token=74ec0a67-5cb1-45a8-a2e6-b2a2bcaaac3f",
            "timestamp": {
                "_seconds": 1721592332,
                "_nanoseconds": 546000000
            }
            }
        ]
    }
*/
export const deleteGalleryImage = async (req, res) => {
    try {
        let { imageId } = req.body;
        const galleryId = process.env.galleryId; // Get galleryId from env
        const galleryCollection = process.env.galleryCollection;
        const fieldName = process.env.galleryField;

        if (galleryId) {
            const validateData = await readSingleData(process.env.galleryCollection, galleryId)
            if (validateData) {
                var galleryData = await deleteSubFieldData(process.env.galleryCollection, galleryId, fieldName, imageId);
                console.log('success');

                cache.del('gallery');

                return res.status(201).send({
                    success: true,
                    message: 'gallery image deleted successfully',
                    gallery: galleryData
                });
            }
        } else {
            return res.send({ message: "Error while finding gallery image" })
        }

    } catch (error) {
        console.error('Error in gallery image deletion:', error);
        return res.status(500).send({
            success: false,
            message: 'Error in gallery image deletion',
            error: error.message,
        });
    }
};