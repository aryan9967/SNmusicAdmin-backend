import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import multer from 'multer';
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { uploadVideo } from "../DB/storage.js";
import { createData, createSubData, deleteData, deleteSubData, matchData, matchSubData, readAllData, readAllLimitData, readAllLimitSubData, readAllSubData, readSingleData, readSingleSubData, readSubFieldData, updateData, updateSubData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addTextWatermarkToImage, addTextWatermarkToVideo, extractFrameFromVideo, uploadFile } from "../helper/mediaHelper.js";

dotenv.config()

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket();


//function that creates album folder document (title )
/*
    request url = http://localhost:8080/api/v1/album/create-album-folder
    method = POST
    req.body =  {
    title
    } 
    *req.headers.authorization = JWT token
    response: {
      "success": true,
      "message": "Album created successfully",
      "albumFolder": {
        "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
        "title": "Mahashivratri",
        "timestamp": "2024-07-18T19:38:14.595Z"
      }
    }
*/

export const createAlbumFolder = async (req, res) => {
  try {
    const { title, description } = req.body;

    const albumFolderId = uuidv4();
    if (!title) {
      return res.send({ message: 'Title is required' });
    }
    if (title) {
      const validateData = await matchData(process.env.albumFolderCollection, 'title', title)
      console.log(validateData);
      if (!validateData.empty) {
        return res.send({ message: 'Album Folder already exists' });
      }
    }

    const albumJson = {
      albumFolderId: albumFolderId,
      title: title,
      description,
      timestamp: new Date()
    };

    const album = await createData(process.env.albumFolderCollection, albumFolderId, albumJson)
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album created successfully',
      albumFolder: albumJson
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function that creates album item which is a sub collection of album folder document (title, video/image )
/*
    request url = http://localhost:8080/api/v1/album/create-album
    method = POST
    req.body =  {
    albumFolderId,
    title
    } /at once only video/image
    files: {
      "media": "video/image file",
      "image": "image file for thumbnail"
    }
    *req.headers.authorization = JWT token
    response: {
      "success": true,
      "message": "Student created successfully",
      "albumItem": {
        "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
        "albumItemId": "cc82dc08-738a-445c-928c-119dbe00111f",
        "title": "title3",
        "imageUrl": "bbnbn.com",
        "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2Fcc82dc08-738a-445c-928c-119dbe00111f%2Fviddemo1.mp4?alt=media&token=94b9be5e-9b4b-4a1e-b2df-875f2e02ac17",
        "timestamp": "2024-07-18T19:53:10.012Z"
      }
    }
*/

export const createAlbumItem = async (req, res) => {
  try {
    const { albumFolderId, title } = req.body;
    const files = req.files;
    const albumItemId = uuidv4();

    if (!title || !files || !files.media) {
      return res.status(400).send({ message: 'Title and media are required' });
    }

    const validateData = await readSingleData(process.env.albumFolderCollection, albumFolderId);
    console.log(validateData);
    if (!validateData) {
      return res.status(400).send({ message: 'Album does not exists' });
    }

    const validateItemData = await matchSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, 'title', title);
    console.log(validateItemData.empty);
    if (!validateItemData.empty) {
      return res.status(400).send({ message: 'Album Item already exists' });
    }

    let imageUrl = null;
    let mediaUrl = null;
    var mediaFile, mediaType;

    if (files.media && files.media.length > 0) {
      mediaFile = files.media[0];
      console.log(mediaFile);
      mediaType = mediaFile.mimetype.split('/')[0];
      if (mediaType === "video") {
        const watermarkedFrameBuffer = await addTextWatermarkToVideo(mediaFile.buffer, 'SN MUSIC');
        mediaUrl = await uploadFile(watermarkedFrameBuffer, 'videos', `albums/${albumFolderId}/${albumItemId}/media/${mediaFile.originalname}`);
      } else if (mediaType === 'image') {
        const watermarkedFrameBuffer = await addTextWatermarkToImage(mediaFile.buffer, 'SN MUSIC');
        mediaUrl = await uploadFile(watermarkedFrameBuffer, 'images', `albums/${albumFolderId}/${albumItemId}/media/${mediaFile.originalname}`);
      }
    }

    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
      imageUrl = await uploadFile(watermarkedFrameBuffer, 'images', `albums/${albumFolderId}/${albumItemId}/image/${mediaFile.originalname}`);
    } else {
      if (mediaType === "image") {
        imageUrl = mediaUrl;
      } else if (mediaType === "video") {
        const frameBuffer = await extractFrameFromVideo(mediaFile.buffer);
        const frameFile = {
          originalname: 'frame.jpg',
          mimetype: 'image/png',
          buffer: frameBuffer,
        };
        const watermarkedFrameBuffer = await addTextWatermarkToImage(frameFile.buffer, 'SN MUSIC');
        imageUrl = await uploadFile(watermarkedFrameBuffer, 'images', `albums/${albumFolderId}/${albumItemId}/image/${mediaFile.originalname}`);
      }
    }

    const albumJson = {
      albumFolderId: albumFolderId,
      albumItemId: albumItemId,
      title: title,
      mediaUrl: mediaUrl,
      imageUrl: imageUrl,
      timestamp: new Date(),
    };

    await createSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId, albumJson);

    res.status(201).send({
      success: true,
      message: 'Album created successfully',
      albumItem: albumJson,
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function that reads all album folder document 
/*
    request url = http://localhost:8080/api/v1/album/read-all-album-folder
    method = GET
    req.body = nothing
    response: {
      "success": true,
      "message": "Album read successfully",
      "albumFolder": [
        {
          "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
          "timestamp": {
            "_seconds": 1721331494,
            "_nanoseconds": 595000000
          },
          "title": "Shravan"
        }
      ]
    }
*/

export const readAllAlbumFolder = async (req, res) => {
  try {
    // var albumData = await readAllData(process.env.albumFolderCollection);
    var albumData = await readAllLimitData(process.env.albumFolderCollection, ["albumFolderId", "title"]);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      albumFolder: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function that reads single album folder document 
/*
    request url = http://localhost:8080/api/v1/album/read-single-album-folder
    method = POST
    req.body = {
      "albumFolderId": "ghghjgjgjjhj"
    }
    response: {
      "success": true,
      "message": "Album read successfully",
      "albumFolder": {
        "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
        "title": "Mahashivratri",
        "timestamp": {
          "_seconds": 1721331494,
          "_nanoseconds": 595000000
        }
      }
    }
*/

export const readSingleAlbumFolder = async (req, res) => {
  try {
    const { albumFolderId } = req.body;
    var albumData = await readSingleData(process.env.albumFolderCollection, albumFolderId);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      albumFolder: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function that reads all album items document 
/*
    request url = http://localhost:8080/api/v1/album/read-all-album-item
    method = POST
    req.body = {
      "albumFolderId": "ghghjgjgjjhj"
    }
    response: {
      "success": true,
      "message": "Album read successfully",
      "albumItem": [
        {
          "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
          "imageUrl": "bbnbn.com",
          "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2F8a9ebb00-714f-4ed7-8e89-161e35b38802%2Flogin3c.jpg?alt=media&token=e17fe9f8-1809-4bd5-8e17-1f0f21b91afb",
          "albumItemId": "8a9ebb00-714f-4ed7-8e89-161e35b38802",
          "title": "title1",
          "timestamp": {
            "_seconds": 1721331729,
            "_nanoseconds": 532000000
          }
        },
        {
          "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
          "imageUrl": "bbnbn.com",
          "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2Fbada917a-ca12-4233-a1fe-c1068b6eed3b%2Flogin3c.jpg?alt=media&token=bce53592-88bb-4d11-947f-e1662991f744",
          "albumItemId": "bada917a-ca12-4233-a1fe-c1068b6eed3b",
          "title": "title2",
          "timestamp": {
            "_seconds": 1721332325,
            "_nanoseconds": 935000000
          }
        }
        }
      ]
    }
*/

export const readAllAlbumItems = async (req, res) => {
  try {
    const { albumFolderId } = req.body;
    // var albumData = await readAllSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId);
    var albumData = await readAllLimitSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, ["albumFolderId", "albumItemId", "imageUrl", "title"]);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      albumItem: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};


//function that reads single album folder document 
/*
    request url = http://localhost:8080/api/v1/album/read-single-album-item
    method = POST
    req.body = {
      "albumFolderId": "ghghjgjgjjhj"
    }
    response: {
      "success": true,
      "message": "Album read successfully",
      "albumItem": {
        "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
        "imageUrl": "bbnbn.com",
        "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2Fcc82dc08-738a-445c-928c-119dbe00111f%2Fviddemo1.mp4?alt=media&token=94b9be5e-9b4b-4a1e-b2df-875f2e02ac17",
        "albumItemId": "cc82dc08-738a-445c-928c-119dbe00111f",
        "title": "title3",
        "timestamp": {
          "_seconds": 1721332390,
          "_nanoseconds": 12000000
        }
      }
    }
*/

export const readSingleAlbumItem = async (req, res) => {
  try {
    const { albumFolderId, albumItemId } = req.body;
    var albumData = await readSingleSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      albumItem: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

export const readAlbumItemUrl = async (req, res) => {
  try {
    const { albumFolderId, albumItemId } = req.body;
    var albumData = await readSubFieldData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId, "mediaUrl");
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      albumItem: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function that updates single album folder document 
/*
    request url = http://localhost:8080/api/v1/album/update-album-folder
    method = POST
    req.body = {
      "albumFolderId": "ghghjgjgjjhj",
      "title": "Shravan"
    }
    response: {
      "success": true,
      "message": "Album read successfully",
      "albumFolder": {
        "title": "Shravan"
      }
    }
*/

export const updateAlbumFolder = async (req, res) => {
  try {
    let { albumFolderId, title } = req.body;
    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;

    if (albumFolderId) {
      const validateData = await readSingleData(process.env.albumFolderCollection, albumFolderId)
      if (!validateData) {
        return res.send({ message: 'Album Folder does not exists' });
      }
    } else {
      return res.send({ message: "Error while finding album" })
    }

    var albumData = await updateData(process.env.albumFolderCollection, albumFolderId, updates);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      albumFolder: updates
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function to update single album folder sub item details
/* 
    request url = http://localhost:8080/api/v1/album/update-album-item
    method = POST
    FormData: 
    fields: {
      "albumFolderId": "albumFolderId"
      "albumItemId": "albumItemId",
      "title": "text1"
    }
    files: {
      "media": "video/image file",
      "image": "image file for thumbnail"
    }
      response: {
        "success": true,
        "message": "Album Item updated successfully",
        "student": {
          "title": "title2.0",
          "imageUrl": "bbnbn.com",
          "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2Fbada917a-ca12-4233-a1fe-c1068b6eed3b%2Fviddemo3.mp4?alt=media&token=a10e9f6a-da37-4001-bca9-6bc58cdecc65"
        }
      }
*/
export const updateAlbumItem = async (req, res) => {
  try {
    const { albumFolderId, albumItemId, title } = req.body;
    const files = req.files;

    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;

    if (!albumFolderId) {
      return res.status(400).send({ message: 'Album folder ID is required' });
    }

    if (!albumItemId) {
      return res.status(400).send({ message: 'Album item ID is required' });
    }

    if (!title && !files) {
      return res.status(400).send({ message: 'Title and media are required' });
    }

    const validateData = await readSingleSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId);

    if (!validateData) {
      return res.status(404).send({ message: 'Album item not found' });
    }

    let imageUrl = null;
    let mediaUrl = null;
    var mediaFile;

    if (files.media && files.media.length > 0) {
      mediaFile = files.media[0];
      console.log(mediaFile);
      mediaType = mediaFile.mimetype.split('/')[0];
      if (mediaType === "video") {
        const watermarkedFrameBuffer = await addTextWatermarkToVideo(mediaFile.buffer, 'SN MUSIC');
        mediaUrl = await uploadFile(watermarkedFrameBuffer, 'videos', `albums/${albumFolderId}/${albumItemId}/media/${mediaFile.originalname}`);
        updates.mediaUrl = mediaUrl;
      } else if (mediaType === 'image') {
        const watermarkedFrameBuffer = await addTextWatermarkToImage(mediaFile.buffer, 'SN MUSIC');
        mediaUrl = await uploadFile(watermarkedFrameBuffer, 'images', `albums/${albumFolderId}/${albumItemId}/media/${mediaFile.originalname}`);
        updates.mediaUrl = mediaUrl;
      }
    }

    if (files.image && files.image.length > 0) {
      const imageFile = files.image[0];
      const watermarkedFrameBuffer = await addTextWatermarkToImage(imageFile.buffer, 'SN MUSIC');
      imageUrl = await uploadFile(watermarkedFrameBuffer, 'images', `albums/${albumFolderId}/${albumItemId}/image/${mediaFile.originalname}`);
      updates.imageUrl = imageUrl;
    }

    const albumItem = await updateSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId, updates)
    console.log('success');

    res.status(201).send({
      success: true,
      message: 'Album Item updated successfully',
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

//function to update single our Students details
/* 
    request url = http://localhost:8080/api/v1/album/delete-album-folder
    method = POST
    req.body: 
    req.body: {
      "albumFolderId": "albumFolderId"
    }
*/

export const deleteAlbumFolder = async (req, res) => {
  try {
    let { albumFolderId } = req.body;

    if (albumFolderId) {
      const validateData = await readSingleData(process.env.albumFolderCollection, albumFolderId)
      if (!validateData) {
        return res.send({ message: 'Album does not exists' });
      }
    } else {
      return res.send({ message: "Error while finding album" })
    }

    var albumData = await deleteData(process.env.albumFolderCollection, albumFolderId);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album deleted successfully',
      albumFolder: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function to update single our Students details
/* 
    request url = http://localhost:8080/api/v1/album/delete-album-item
    method = POST
    FormData: 
    req.body: {
      "albumFolderId": "albumFolderId",
      "albumItemId": "albumItemId"
    }
*/

export const deleteAlbumItem = async (req, res) => {
  try {
    let { albumFolderId, albumItemId } = req.body;

    if (albumFolderId) {
      const validateData = await readSingleSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId)
      if (!validateData) {
        return res.send({ message: 'Album does not exists' });
      }
    } else {
      return res.send({ message: "Error while finding album" })
    }

    var albumData = await deleteSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album deleted successfully',
      albumItem: albumData
    });
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};