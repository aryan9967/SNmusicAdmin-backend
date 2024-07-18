import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import multer from 'multer';
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { uploadVideo } from "../DB/storage.js";
import { createData, createSubData, deleteData, deleteSubData, matchData, matchSubData, readAllData, readAllSubData, readSingleData, readSingleSubData, updateData, updateSubData } from "../DB/crumd.js";
import { storage } from "../DB/firebase.js";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

dotenv.config()

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket();


//function that creates album folder document (title )
/*
    request url = http://localhost:8080/api/v1/album/create-album
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
    const { title } = req.body;

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
    req.file 
    *req.headers.authorization = JWT token
    response: {
      "success": true,
      "message": "Student created successfully",
      "albumItem": {
        "albumFolderId": "686554da-5cbb-4200-893a-06a04decaf5f",
        "albumItemId": "cc82dc08-738a-445c-928c-119dbe00111f",
        "title": "title3",
        "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2Fcc82dc08-738a-445c-928c-119dbe00111f%2Fviddemo1.mp4?alt=media&token=94b9be5e-9b4b-4a1e-b2df-875f2e02ac17",
        "timestamp": "2024-07-18T19:53:10.012Z"
      }
    }
*/

export const createAlbumItem = async (req, res) => {
  try {
    const { albumFolderId, title } = req.body;
    const file = req.file;
    const albumItemId = uuidv4();

    if (!title || !file) {
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

    const storageRef = ref(storage, `${process.env.storagePath}/albums/${albumFolderId}/${albumItemId}/${file.originalname}`);
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

          const albumJson = {
            albumFolderId: albumFolderId,
            albumItemId: albumItemId,
            title: title,
            mediaUrl: downloadURL,
            timestamp: new Date(),
          };

          await createSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId, albumJson);

          res.status(201).send({
            success: true,
            message: 'Student created successfully',
            albumItem: albumJson,
          });
        } catch (error) {
          console.error('Error saving data:', error);
          res.status(500).send({ message: 'Error saving data', error: error.message });
        }
      }
    );
  } catch (error) {
    console.error('Error in album creation:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in album creation',
      error: error.message,
    });
  }
};

//function that reads album folder document 
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
    var albumData = await readAllData(process.env.albumFolderCollection);
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
    var albumData = await readAllSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId);
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

//function that reads single album folder document 
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

//function to update single our Students details
/* 
    request url = http://localhost:8080/api/v1/album/update-album-item
    method = POST
    FormData: 
    fields: {
      "albumFolderId": "albumFolderId"
      "albumItemId": "albumItemId",
      "title": "text1"
    }
    file: { //req.file
      "file": "file",
    }
      response: {
        "success": true,
        "message": "Album Item updated successfully",
        "student": {
          "title": "title2.0",
          "mediaUrl": "https://firebasestorage.googleapis.com/v0/b/snmusic-ca00f.appspot.com/o/albums%2F686554da-5cbb-4200-893a-06a04decaf5f%2Fbada917a-ca12-4233-a1fe-c1068b6eed3b%2Fviddemo3.mp4?alt=media&token=a10e9f6a-da37-4001-bca9-6bc58cdecc65"
        }
      }
*/
export const updateAlbumItem = async (req, res) => {
  try {
    const { albumFolderId, albumItemId, title } = req.body;
    const file = req.file;
    var downloadURL;

    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;

    if (!albumFolderId) {
      return res.status(400).send({ message: 'Error finding album folder' });
    }

    if (!albumItemId) {
      return res.status(400).send({ message: 'Error finding album item' });
    }


    if (!title || !file) {
      return res.status(400).send({ message: 'Title and media are required' });
    }
    console.log(albumItemId);

    const validateData = await readSingleSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId);

    console.log(validateData);
    if (validateData) {
      console.log(albumItemId);
      console.log(file);
      if (file) {
        const storageRef = ref(storage, `${process.env.storagePath}/albums/${albumFolderId}/${albumItemId}/${file.originalname}`);
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
                if (downloadURL) updates.mediaUrl = downloadURL;
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

      const albumItem = await updateSubData(process.env.albumFolderCollection, process.env.albumItemCollection, albumFolderId, albumItemId, updates)
      console.log('success');

      res.status(201).send({
        success: true,
        message: 'Album Item updated successfully',
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