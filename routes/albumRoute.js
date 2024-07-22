import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createAlbumFolder, createAlbumItem, deleteAlbumFolder, deleteAlbumItem, readAlbumItemUrl, readAllAlbumFolder, readAllAlbumItems, readSingleAlbumFolder, readSingleAlbumItem, updateAlbumFolder, updateAlbumItem } from '../controllers/albumController.js';
import { readSubFieldData } from '../DB/crumd.js';
import { checkcache_for_album_folder, checkcache_for_album_item } from '../middleware/caching_middleware.js';
// import { create } from '../DB/FCRUD.js';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB file size limit
}).fields([
    { name: 'media', maxCount: 1 },
    { name: 'image', maxCount: 1 },
]);

//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-album-folder', createAlbumFolder);

router.post('/create-album-item', upload, createAlbumItem);

//Register User || POST
router.get('/read-all-album-folder', checkcache_for_album_folder, readAllAlbumFolder);

//Register User || POST
router.post('/read-all-album-item', checkcache_for_album_item, readAllAlbumItems);

//Register Seller || POST
router.post('/read-single-album-folder', readSingleAlbumFolder);

//Register Seller || POST
router.post('/read-single-album-item', readSingleAlbumItem);

//Register Seller || POST
router.post('/read-album-item-url', readAlbumItemUrl);

//Verify Phone Number || POST
router.post('/update-album-folder', updateAlbumFolder);

//Verify Phone Number || POST
router.post('/update-album-item', upload, updateAlbumItem);

//Login Seller || POST
router.post('/delete-album-folder', deleteAlbumFolder);

//Login Seller || POST
router.post('/delete-album-item', deleteAlbumItem);

export default router;
