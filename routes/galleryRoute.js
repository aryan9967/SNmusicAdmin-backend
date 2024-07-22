import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { addGallery, deleteGallery, deleteGalleryImage, readAllGallery, readSingleGalleryImage, updateGalleryImage } from '../controllers/galleryController.js';
import { checkcache_for_gallery } from '../middleware/caching_middleware.js';

const upload = multer({ storage: multer.memoryStorage() });

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/add-gallery', upload.single('file'), addGallery);

//Verify Phone Number || POST
router.get('/read-all-gallery', checkcache_for_gallery, readAllGallery);

//Verify Phone Number || POST
router.post('/read-gallery-image', readSingleGalleryImage);

//Verify Phone Number || POST
router.post('/update-gallery-image', upload.single('file'), updateGalleryImage);

//Verify Phone Number || POST
router.post('/delete-gallery', deleteGallery);

//Verify Phone Number || POST
router.post('/delete-gallery-image', deleteGalleryImage);

export default router;
