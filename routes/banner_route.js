import express from "express"
import multer from "multer"
import { upload_banner, get_all_banner, } from "../controllers/banner_controller.js"
import { requireSignIn, isAdmin } from "../middleware/authMiddleware.js"

const upload = multer({storage: multer.memoryStorage()})

const router = express.Router()

//route for admin to create a new banner
/*
request url = http://localhost:8080/api/v1/banner/new_banner
method = POST
req.body =
{
    "bannerid": "1720100876121",
    "title": "New offer",
    "description": "description of offer"
}
    * req.headers.authorization = JWT token
*/
router.post("/new_banner", requireSignIn, isAdmin, upload.single('file'), upload_banner )

//route to get all the banners
/*
request url = http://localhost:8080/api/v1/banner/get_all_banner
method = GET
*/
router.get("/get_all_banner", get_all_banner)

export default router