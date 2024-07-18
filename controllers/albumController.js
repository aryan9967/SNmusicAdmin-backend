import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import multer from 'multer';
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { uploadVideo } from "../DB/storage.js";
import { createCollection, createNestedData, deleteData, matchData, matchNestedData, readAllData, readAllNestedData, readSingleData } from "../DB/crumd.js";

dotenv.config()

const upload = multer(); //

const bucket = admin.storage().bucket();


//function that creates album document (title, video, image )
/*
    request url = http://localhost:8080/api/v1/album/create-album
    method = POST
    req.body =  {
    title,
    video,
    image
    } /at once only video 
    req.file /optional
    *req.headers.authorization = JWT token
*/







//In progress
export const createAlbumFolder = async (req, res) => {
  try {
    const { folder_name } = req.body;

    const albumFolderId = uuidv4();
    if (!folder_name) {
      return res.send({ message: 'Folder Name is required' });
    }
    console.log('1');
    if (folder_name) {
      const validateData = await matchData(process.env.albumCollection, 'folder_name', folder_name)
      console.log(validateData);
      if (!validateData.empty) {
        return res.send({ message: 'Album Folder already exists' });
      }
    }
    console.log('2');
    var timestamp = new Date();

    const albumJson = {
      albumFolderId: albumFolderId,
      folder_name: folder_name,
      nestedCollectionName: folder_name,
      timestamp: timestamp
    };
    console.log('3');

    const album = await createCollection(process.env.albumCollection, folder_name, albumFolderId, albumJson)
    console.log('4');
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album created successfully',
      album: albumJson
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

export const createSingleAlbum = async (req, res) => {
  try {
    const { id, title, video, image, folder_name } = req.body;
    var imgUrl, videoUrl;
    const singleAlbumId = uuidv4();
    if (!title) {
      return res.send({ message: 'Title is required' });
    }
    if (video || image) {
      return res.send({ message: 'Video is required' });
    }
    if (title) {
      const validateData = await matchNestedData(process.env.albumCollection, folder_name, id, 'title', title)
      if (validateData) {
        return res.send({ message: 'Album already exists' });
      }
    }
    if (image) {
      imgUrl = await uploadVideo(image, `album/image/${albumId}`)
    } else if (video) {
      videoUrl = await uploadVideo(video, `album/video/${albumId}`)
    }

    var allAlbums = await readAllNestedData(process.env.albumCollection, folder_name, id);

    var preference = parseInt(allAlbums.length) + 1;

    const albumJson = {
      singleAlbumId: singleAlbumId,
      id: id,
      title: title,
      imgUrl: imgUrl,
      videoUrl: videoUrl,
      folder_name: folder_name,
      preference: preference
    };

    const album = await createNestedData(process.env.albumCollection, folder_name, id, albumJson)
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album created successfully',
      album: albumJson
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

export const readAllAlbum = async (req, res) => {
  try {
    var albumData = await readAllData(process.env.albumCollection);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      album: albumData
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

export const readSingleAlbum = async (req, res) => {
  try {
    const { id } = req.body;
    var albumData = await readSingleData(process.env.albumCollection, id);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      album: albumData
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

export const updateAlbum = async (req, res) => {
  try {
    let { id, title, image, video } = req.body;
    var imgUrl, videoUrl;
    // Create the updates object only with provided fields
    const updates = {};
    if (title) updates.title = title;

    if (id) {
      const validateData = await readSingleData(process.env.albumCollection, id)
      if (validateData) {
        return res.send({ message: 'Album already exists' });
      }
    } else {
      return res.send({ message: "Error while finding album" })
    }

    if (image) {
      imgUrl = await uploadVideo(image, `album/image/${albumId}`)
    }
    if (video) {
      videoUrl = await uploadVideo(video, `album/video/${albumId}`)
    }
    if (imgUrl) updates.imgUrl = imgUrl;
    if (videoUrl) updates.videoUrl = videoUrl;
    var albumData = await updateData(process.env.albumCollection, id, updates);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      album: albumData
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

export const deleteAlbum = async (req, res) => {
  try {
    let { id } = req.body;

    if (id) {
      const validateData = await readSingleData(process.env.albumCollection, id)
      if (validateData) {
        return res.send({ message: 'Album already exists' });
      }
    } else {
      return res.send({ message: "Error while finding album" })
    }

    var albumData = await deleteData(process.env.albumCollection, id);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Album read successfully',
      album: albumData
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