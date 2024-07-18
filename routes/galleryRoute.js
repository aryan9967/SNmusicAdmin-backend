import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createGallery, deleteGallery, readAllGallery, readSingleGallery, updateGallery } from '../controllers/galleryController.js';

const upload = multer({storage: multer.memoryStorage()});

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-student', upload.single('file'), createGallery);

//Verify Phone Number || POST
router.get('/read-all-student', readAllGallery);

//Verify Phone Number || POST
router.post('/read-student', readSingleGallery);

//Verify Phone Number || POST
router.post('/update-student', upload.single('file'), updateGallery);

//Verify Phone Number || POST
router.post('/delete-student', deleteGallery);

export default router;
