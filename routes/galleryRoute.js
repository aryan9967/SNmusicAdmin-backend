import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createGallery, deleteGallery, readAllGallery, readSingleGallery, updateGallery } from '../controllers/galleryController.js';

const upload = multer({ storage: multer.memoryStorage() });

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-gallery', upload.single('file'), createGallery);

//Verify Phone Number || POST
router.get('/read-all-gallery', readAllGallery);

//Verify Phone Number || POST
router.post('/read-gallery', readSingleGallery);

//Verify Phone Number || POST
router.post('/update-gallery', upload.single('file'), updateGallery);

//Verify Phone Number || POST
router.post('/delete-gallery', deleteGallery);

export default router;
