import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import JWT from 'jsonwebtoken';
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


//register admin
export const adminRegisterController = async (req, res) => {
  try {
    const { name, address, contact, email, instagram, facebook, twitter } = req.body;
    const adminId = uuidv4();
    if (!name) {
      return res.send({ message: 'Name is required' });
    }
    if (!address) {
      return res.send({ message: 'Address is required' });
    }
    if (!contact) {
      return res.send({ message: 'Contact is required' });
    }
    if (!email) {
      return res.send({ message: 'Email is required' });
    }
    if (!instagram) {
      return res.send({ message: 'Instagram is required' });
    }
    if (!facebook) {
      return res.send({ message: 'Facebook is required' });
    }
    if (!twitter) {
      return res.send({ message: 'Twitter is required' });
    }

    //existing user
    const querySnapshot = await readSingleData(process.env.adminCollection, adminId);
    if (querySnapshot) {
      return res.status(200).send({
        success: false,
        message: 'Admin already registered. Please login.',
      });
    }

    const adminJson = {
      adminId: adminId,
      name: name,
      address: address,
      contact: contact,
      email: email,
      instagram: instagram,
      facebook: facebook,
      twitter: twitter,
      photoUrl: '',
      role: 2,
    };

    //token
    const token = await JWT.sign(
      { id: adminId },
      process.env.JWT_token,
      {
        expiresIn: '7d',
      }
    );

    var adminData = await createData(process.env.adminCollection, adminId, adminJson)
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'Admin registered successfully',
      admin: adminJson,
      token
    });
  } catch (error) {
    console.error('Error in admin registration:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in admin registration',
      error: error.message,
    });
  }
};

//Login User
export const adminLoginController = async (req, res) => {
  try {
    const { adminId } = req.body;
    //Validtion
    if (!adminId) {
      return res.status(404).send({
        success: false,
        message: 'Invalid admin',
      });
    }
    //Retrieve user data
    const adminData = await readSingleData(process.env.adminCollection, adminId);

    //verification
    if (!adminData) {
      return res.status(404).send({
        success: false,
        message: 'admin is not registered',
      });
    }

    //token
    const token = await JWT.sign(
      { id: adminData.adminId },
      process.env.JWT_token,
      {
        expiresIn: '7d',
      }
    );
    res.status(200).send({
      success: true,
      message: 'Admin Login successfully',
      user: {
        adminId: adminData?.adminId,
        name: adminData?.name,
        address: adminData?.address,
        contact: adminData?.contact,
        email: adminData?.email,
        instagram: adminData?.instagram,
        facebook: adminData?.facebook,
        twitter: adminData?.twitter,
        photoUrl: adminData?.photoUrl,
        role: adminData?.role,
      },
      token,
    });
    console.log('success');
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: 'Error in admin login',
      error: error,
    });
  }
};

// Update admin details including image
export const adminUpdateController = async (req, res) => {
  try {
    const { adminId, name, address, contact, email, instagram, facebook, twitter, role } = req.body;
    const file = req.file; // Assuming file is an image file
    let downloadURL;

    // Create the updates object only with provided fields
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (contact) updates.contact = contact;
    if (email) updates.email = email;
    if (instagram) updates.instagram = instagram;
    if (facebook) updates.facebook = facebook;
    if (twitter) updates.twitter = twitter;
    if (role) updates.role = role;

    if (!adminId) {
      return res.status(400).send({ message: 'Error finding admin' });
    }

    if (!name && !address && !contact && !email && !instagram && !facebook && !twitter && !role && !file) {
      return res.status(400).send({ message: 'At least one field (name, address, contact, email, social media, role) or image is required' });
    }

    const adminData = await readSingleData(process.env.adminCollection, adminId);

    if (!adminData.exists) {
      return res.status(404).send({ message: 'Admin not found' });
    }

    if (file) {
      const storageRef = ref(storage, `${process.env.storagePath}/admins/${adminId}/${file.originalname}`);
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
              if (downloadURL) updates.photoUrl = downloadURL; // Assuming photoUrl field in admin data
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

    // Update admin data in Firestore
    await updateData(process.env.adminCollection, adminId, updates);

    console.log('Admin updated successfully');
    res.status(200).send({
      success: true,
      message: 'Admin updated successfully',
      admin: updates, // Return updated fields
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).send({
      success: false,
      message: 'Error updating admin',
      error: error.message,
    });
  }
};