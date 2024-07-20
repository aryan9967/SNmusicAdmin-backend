import express from 'express';
import multer from 'multer';
import { isAdmin, requireSignIn } from '../middleware/authMiddleware.js';
import { createInstrument, deleteInstrument, readAllInstrument, readSingleInstrument, updateInstrument } from '../controllers/windInstrumentController.js';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  }).fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]);
//route object
const router = express.Router();

//routing

//Verify Phone Number || POST
router.post('/create-instrument', upload, createInstrument);

//Verify Phone Number || POST
router.get('/read-all-instrument', readAllInstrument);

//Verify Phone Number || POST
router.post('/read-instrument', readSingleInstrument);

//Verify Phone Number || POST
router.post('/update-instrument', upload, updateInstrument);

//Verify Phone Number || POST
router.post('/delete-instrument', deleteInstrument);

export default router;
