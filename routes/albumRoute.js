import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createAlbumFolder, createAlbumItem, deleteAlbumFolder, deleteAlbumItem, readAllAlbumFolder, readAllAlbumItems, readSingleAlbumFolder, readSingleAlbumItem, updateAlbumFolder, updateAlbumItem } from '../controllers/albumController.js';
// import { create } from '../DB/FCRUD.js';

const upload = multer(); //

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-album-folder', createAlbumFolder);

router.post('/create-album-item', upload.single('file'), createAlbumItem);

//Register User || POST
router.get('/read-all-album-folder', readAllAlbumFolder);

//Register User || POST
router.post('/read-all-album-item', readAllAlbumItems);

//Register Seller || POST
router.post('/read-single-album-folder', readSingleAlbumFolder);

//Register Seller || POST
router.post('/read-single-album-item', readSingleAlbumItem);

//Verify Phone Number || POST
router.post('/update-album-folder', updateAlbumFolder);

//Verify Phone Number || POST
router.post('/update-album-item', upload.single('file'), updateAlbumItem);

//Login Seller || POST
router.post('/delete-album-folder', deleteAlbumFolder);

//Login Seller || POST
router.post('/delete-album-item', deleteAlbumItem);

export default router;
