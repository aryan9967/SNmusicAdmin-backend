import express, { Router } from "express"
import { get_city_state } from "../controllers/addressUtil.js"


const router = express.Router()

router.get("/get_city_state", get_city_state )

export default router