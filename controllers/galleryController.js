import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import dotenv from "dotenv"
import express from 'express';
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';
import { storeVideo, uploadVideo } from "../DB/storage.js";
import { deleteData, matchData, readAllData, readSingleData } from "../DB/crumd.js";

dotenv.config()

const upload = multer(); //

const bucket = admin.storage().bucket() = GET

export const createGallery = async (req, res) => {
    try {
        const { image } = req.body;
        var imgUrl;
        const galleryId = uuidv4();
        if (!image) {
            return res.send({ message: 'Image is required' });
        }
        if (image) {
            const validateData = await matchData(process.env.galleryCollection, 'title', title)
            if (validateData) {
                return res.send({ message: 'Album already exists' });
            }
        }
        if (image) {
            imgUrl = await uploadVideo(image, `album/image/${albumId}`)
        } else if (video) {
            videoUrl = await uploadVideo(video, `album/video/${albumId}`)
        }

        const albumJson = {
            albumId: albumId,
            title: title,
            imgUrl: imgUrl,
            videoUrl: videoUrl
        };

        var album = await createData(process.env.albumCollection, albumId, albumJson)
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