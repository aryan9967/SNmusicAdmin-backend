import express from "express"
import multer from "multer"
import {
    create_product,
    delete_color,
    delete_complete_product,
    add_color,
    add_stock,
    change_desc,
    change_main_img,
    change_product_name,
    get_seller_profile,
    get_seller_products
} from "../controllers/sellerController.js"
import { authorizeProductOwner, isSeller, requireSignIn } from "../middleware/authMiddleware.js"

const upload = multer({ storage: multer.memoryStorage() })

const router = express.Router()

//demo seller_id = aryan
//JWT token : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFyeWFuIn0.2pc99p7IzrDQFdXRrR6rm_A4XABVMyewqLbgLrwL_0c

//route for creating a product refer index.html for knowing the request body
/*
request url = http://localhost:8080/api/v1/seller/create_product
method = POST
this function handles multiple images and formdata

for sample request body refer index.html file

    * req.headers.authorization = JWT token
*/
router.post("/create_product", requireSignIn, isSeller, upload.any(), create_product)


//route for deleting complete product including color documnets
/*
request url = http://localhost:8080/api/v1/seller/delete_product
method = POST
req.body =
{
    "pid": "aryan1720100876121"
}
    all fields are required
    * req.headers.authorization = JWT token
*/
router.post("/delete_product", requireSignIn, isSeller, authorizeProductOwner, delete_complete_product)


/*request url = http://localhost:8080/api/v1/seller/add_color
method = POST
req.body = refer test.html 
    all fields are required
    * req.headers.authorization = JWT token
*/
//route for creating a new color inside a product
router.post("/add_color", requireSignIn, isSeller, upload.any(), authorizeProductOwner, add_color)


//route for deleting a color documnent of a product
/*
request url = http://localhost:8080/api/v1/seller/delete_color
method = POST
req.body =
{
    "pid": "aryan1720100876121",
    "color": "blue",
    "color_code":"#0000"
}
    all fields are required
    * req.headers.authorization = JWT token
*/
router.post("/delete_color", requireSignIn, isSeller, authorizeProductOwner, delete_color)


//route for adding stock of particular size and color of a product
/*
request url = http://localhost:8080/api/v1/seller/add_stock
method = POST
req.body =
{
    "pid": "aryan1720100876121",
    "color_pid": "aryan1720100876121blue",
    "size": "M", //size should always be in capital (S,M,L,XL)
    "qauntity": 10
}
    all fields are required
    * req.headers.authorization = JWT token
*/
router.post("/add_stock", requireSignIn, isSeller, authorizeProductOwner, add_stock)


//route for changing product description
/*
request url = http://localhost:8080/api/v1/seller/change_desc
method = POST
req.body =
{
    "pid": "aryan1720100876121",
    "description": "new description"
}
    all fields are required
    * req.headers.authorization = JWT token
*/
router.post("/change_desc", requireSignIn, isSeller, authorizeProductOwner, change_desc)


//route for changing main image of product
/*
request url = http://localhost:8080/api/v1/seller/change_main_img
method = POST
req.body =
{
    "pid": "aryan1720100876121",
}

fieldname = main_image
req.file should contain the main image field

    all fields are required
    * req.headers.authorization = JWT token
*/
router.post("/change_main_img", requireSignIn, isSeller, authorizeProductOwner, upload.single('main_image'), change_main_img)


//route for changing product name
/*
request url = http://localhost:8080/api/v1/seller/change_product_name
method = POST
req.body =
{
    "pid": "aryan1720100876121",
    "name": "New name"
}

    all fields are required
    * req.headers.authorization = JWT token
*/
router.post("/change_product_name", requireSignIn, isSeller, authorizeProductOwner, change_product_name)


//route for fetching seller profile
/*
request url = http://localhost:8080/api/v1/seller/get_profile
method = GET 

    * req.headers.authorization = JWT token
*/
router.get("/get_profile", requireSignIn, isSeller, get_seller_profile)


//route for fetching all the products of seller
/*
request url = http://localhost:8080/api/v1/seller/get_products
method = GET 

    * req.headers.authorization = JWT token
*/
router.get("/get_products", requireSignIn, isSeller, get_seller_products)

export default router