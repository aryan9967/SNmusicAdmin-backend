import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createAlbumFolder, createSingleAlbum, deleteAlbum, readAllAlbum, readSingleAlbum, updateAlbum } from '../controllers/albumController.js';
// import { create } from '../DB/FCRUD.js';

const upload = multer(); //




//In progress

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-album-folder', createAlbumFolder);

router.post('/create-single-album', upload.single('file'), createSingleAlbum);

//Register User || POST
router.post('/read-all-album', readAllAlbum);

//Register Seller || POST
router.post('/read-single-album', readSingleAlbum);

//Login User || POST
router.post('/update-album', updateAlbum);

//Login Seller || POST
router.post('/delete-album', deleteAlbum);

export default router;
