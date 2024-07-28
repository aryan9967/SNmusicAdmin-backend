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
import { comparePassword, hashPassword } from "../helper/authHelper.js";

dotenv.config()

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const bucket = admin.storage().bucket()


//register admin

//not applicable
export const adminRegisterController = async (req, res) => {
  try {
    const { name, address, contact, email, instagram, facebook, whatsapp } = req.body;
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
    if (!whatsapp) {
      return res.send({ message: 'whatsapp is required' });
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
      whatsapp: whatsapp,
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

//function to login admin
/* 
    request url = http://localhost:8080/api/v1/auth/login-admin
    method = POST
    req.body: 
    {
      "adminId": "adminId"
    }
*/
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
        whatsapp: adminData?.whatsapp,
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
    console.log(req.body)
    const { adminId, name, address, contact, email, instagram, facebook, whatsapp, role } = req.body;
    // const file = req.file; // Assuming file is an image file
    // let downloadURL;

    // Create the updates object only with provided fields
    const updates = {};
    if (name) updates.name = name;
    if (address) updates.address = address;
    if (contact) updates.contact = contact;
    if (email) updates.email = email;
    if (instagram) updates.instagram = instagram;
    if (facebook) updates.facebook = facebook;
    if (whatsapp) updates.whatsapp = whatsapp;
    if (role) updates.role = role;

    if (!adminId) {
      return res.status(400).send({ message: 'Error finding admin' });
    }

    if (!name && !address && !contact && !email && !instagram && !facebook && !whatsapp && !role && !file) {
      return res.status(400).send({ message: 'At least one field (name, address, contact, email, social media, role) or image is required' });
    }

    const adminData = await readSingleData(process.env.adminCollection, adminId);

    if (!adminData) {
      return res.status(404).send({ message: 'Admin not found' });
    }

    // if (file) {
    //   const storageRef = ref(storage, `${process.env.storagePath}/admins/${adminId}/${file.originalname}`);
    //   const metadata = {
    //     contentType: file.mimetype,
    //   };

    //   // Wrap the upload task in a Promise
    //   const uploadPromise = new Promise((resolve, reject) => {
    //     const uploadTask = uploadBytesResumable(storageRef, file.buffer, metadata);

    //     uploadTask.on(
    //       'state_changed',
    //       (snapshot) => {
    //         console.log('Upload state:', snapshot.state);
    //         console.log('Bytes transferred:', snapshot.bytesTransferred);
    //         console.log('Total bytes:', snapshot.totalBytes);
    //       },
    //       (error) => {
    //         console.error('Upload error:', error);
    //         reject({ message: 'Upload error', error: error.message });
    //       },
    //       async () => {
    //         try {
    //           downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    //           if (downloadURL) updates.photoUrl = downloadURL; // Assuming photoUrl field in admin data
    //           resolve();
    //         } catch (error) {
    //           console.error('Error getting download URL:', error);
    //           reject({ message: 'Error getting download URL', error: error.message });
    //         }
    //       }
    //     );
    //   });

    //   // Await the upload promise
    //   await uploadPromise;
    // }

    // Update admin data in Firestore
    await updateData(process.env.adminCollection, adminId, updates);

    console.log('Admin updated successfully');
    res.status(200).send({
      success: true,
      message: 'Admin updated successfully',
      admin: { ...updates, adminId: adminData.adminId }, // Return updated fields
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

export const changeProfile = async (req, res) => {
  if (req.file) {
    const { adminId } = req.body
    const file = req.file
    console.log(file)
    if (adminId) {
      const storageRef = ref(storage, `${process.env.storagePath}/admins/${adminId}/${file.originalname}`);

      const metadata = {
        contentType: file.mimetype,
      };

      // Upload the file and metadata
      const uploadTask = uploadBytesResumable(storageRef, file.buffer, metadata);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
          switch (snapshot.state) {
            case 'paused':
              console.log('Upload is paused');
              break;
            case 'running':
              console.log('Upload is running');
              break;
          }
        },
        (error) => {
          // Handle unsuccessful uploads
        },
        async () => {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref)
          console.log("new image", downloadUrl)
          const updates = {
            photoUrl: downloadUrl
          }
          await updateData(process.env.adminCollection, adminId, updates);
          res.status(200).send({
            success: true,
            photoUrl: downloadUrl,
            message: "Profile changed successfully"
          })
        }
      );
    }
    else {
      return res.status(401).send("Authorization error")
    }
  }
  else {
    return res.status(400).send("image is not provided")
  }
}



//optional

export const registerController = async (req, res) => {
  try {
    const { name, username, password, phone, address } = req.body;
    const userId = uuidv4();

    // Validate email
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const otpRegex = /^\d{6}$/;
    const phoneRegex = /^(?:\+91|91)?[789]\d{9}$/;

    if (!name) {
      return res.send({ message: 'Name is required' });
    }
    if (!username) {
      return res.send({ message: 'Username is required' });
    }
    if (!password) {
      return res.send({ message: 'Password is required' });
    }
    if (!phone || !phoneRegex.test(phone)) {
      return res.send({ message: 'Phone is required' });
    }
    if (!address) {
      return res.send({ message: 'Address is required' });
    }

    //existing user
    const querySnapshot = await db
      .collection(process.env.adminCollection)
      .where('username', '==', username)
      .get();
    if (!querySnapshot.empty) {
      return res.status(200).send({
        success: false,
        message: 'User already registered. Please login.',
      });
    }

    //register user
    const hashedPassword = await hashPassword(password);

    if (typeof hashedPassword !== 'string') {
      return res.status(500).send({
        success: false,
        message: 'Error in registration: Invalid password',
      });
    }

    const userJson = {
      userId: userId,
      name: name,
      username: username,
      password: hashedPassword,
      phone: phone,
      address: address,
      study: [],
      events: [],
      albums: [],
      ourStudents: [],
      windInstruments: [],
      gallery: [],
      role: 1,
    };

    //token
    const token = await JWT.sign(
      { id: userJson.userId },
      process.env.JWT_token,
      {
        expiresIn: '3d',
      }
    );

    await db.collection(process.env.adminCollection).doc(userId).set(userJson);
    console.log('success');

    return res.status(201).send({
      success: true,
      message: 'User registered successfully',
      user: userJson,
      token
    });
  } catch (error) {
    console.error('Error in registration:', error);
    return res.status(500).send({
      success: false,
      message: 'Error in registration',
      error: error.message,
    });
  }
};

//Login User
export const loginController = async (req, res) => {
  try {
    const { username, password } = req.body;
    //Validtion
    if (!username || !password) {
      return res.status(404).send({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username) {
      return res.status(400).send({ message: 'Valid email is required' });
    }

    //Retrieve user data
    const querySnapshot = await db
      .collection(process.env.adminCollection)
      .where('username', '==', username)
      .get();

    let userData = null;
    querySnapshot.forEach((doc) => {
      userData = doc.data();
    });

    //validating user
    if (!userData) {
      return res.status(404).send({
        success: false,
        message: 'User is not registered',
      });
    }

    //comparing user password with hashed/encrypted password
    const match = await comparePassword(password, userData.password);

    //verifying password
    if (!match) {
      return res.status(200).send({
        success: false,
        message: 'Invalid Password',
      });
    }

    //token
    const token = await JWT.sign(
      { id: userData.userId },
      process.env.JWT_token,
      {
        expiresIn: '3d',
      }
    );
    res.status(200).send({
      success: true,
      message: 'Login successfully',
      user: {
        userId: userData.userId,
        name: userData.name,
        username: userData.username,
        phone: userData.phone,
        address: userData.address,
        events: userData.events,
        albums: userData.albums,
        ourStudents: userData.ourStudents,
        windInstruments: userData.windInstruments,
        gallery: userData.gallery,
        role: userData.role,
      },
      token,
    });
    console.log('success');
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: 'Error in login',
      error: error,
    });
  }
};
