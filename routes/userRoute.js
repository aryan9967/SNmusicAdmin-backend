import express from "express"
import {
    get_user_details,
    update_user_details,
    add_to_cart,
    add_to_wishlist,
    empty_cart,
    fetch_cart,
    delete_item_from_cart,
    remove_item_from_wishlist,
    place_order,
    execute_cart,
    submit_rating,
    get_user_address_contact
} from "../controllers/userController.js"
import { isUser, requireSignIn } from "../middleware/authMiddleware.js"
import { check_single_stock_middleware } from "../middleware/check_stock_middleware.js"

import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

const router = express.Router()

//demo user_id = aryan
//JWT token for aryan = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFyeWFuIn0.2pc99p7IzrDQFdXRrR6rm_A4XABVMyewqLbgLrwL_0c

//route to get user details
/* 
    request url = http://localhost:8080/api/v1/user/get_user_details
    *req.headers.authorization = JWT token
    method = GET
*/
router.get("/get_user_details", requireSignIn, isUser, get_user_details)

router.get("/get_user_address", requireSignIn, isUser, get_user_address_contact)

//route to update user detaisl (profileimg, name, address )
/* 
    request url = http://localhost:8080/api/v1/user/update_user
    method = POST
    req.body =  {name, address} /optional
    req.file /optional
    *req.headers.authorization = JWT token
*/
router.post("/update_user", requireSignIn, isUser, upload.single('file'), update_user_details)


//route to add items to whishlist
/* 
    request url = http://localhost:8080/api/v1/user/update_wishlist
    method = POST
    req.body = 
    {
        "pid": "aryan1720100876121",
        "name": "Sample Product",
        "price": 99.99,
        "image": "path/to/image.jpg",
        "color": "blue"
    }
    all fields must be provided
    *req.headers.authorization = JWT token
*/
router.post("/update_wishlist", requireSignIn, isUser, add_to_wishlist)


//route to remove items from whishlist
/* 
    request url = http://localhost:8080/api/v1/user/remove_item_wishlist
    method = POST
    req.body = 
    {
        "pid": "aryan1720100876121",
        "color": "blue"
    }
    all fields must be provided
    *req.headers.authorization = JWT token
*/
router.post("/remove_item_wishlist", requireSignIn, isUser, remove_item_from_wishlist)


//route to add items to cart
/* 
    request url = http://localhost:8080/api/v1/user/update_cart
    method = POST
    req.body = 
    {
        "pid": "aryan1720100876121",
        "color": "blue",
        "qauntity_str": "2",
        "size": "M" //size should be capital
    }
    all fields must be provided
    *req.headers.authorization = JWT token
*/
router.post("/update_cart", requireSignIn, isUser, check_single_stock_middleware, add_to_cart)


//route to delete all items from cart
/* 
    request url = http://localhost:8080/api/v1/user/empty_cart
    method = POST
    
    *req.headers.authorization = JWT token
*/
router.post("/empty_cart", requireSignIn, isUser, empty_cart)


//route to remove a particular item from cart
/* 
    request url = http://localhost:8080/api/v1/user/remove_item_from_cart
    method = POST
    req.body = 
    {
        "pid": "aryan1720100876121",
        "color": "blue",
        "size": "M" //size should be capital
    }
    all fields must be provided
    *req.headers.authorization = JWT token
*/
router.post("/remove_item_from_cart", requireSignIn, isUser, delete_item_from_cart)


//route to fetch cart also stock is checked to ensure that the items present in cart are in stock
/* 
    request url = http://localhost:8080/api/v1/user/fetch_cart
    method = GET
    
    *req.headers.authorization = JWT token
*/
router.get("/fetch_cart", requireSignIn, isUser, fetch_cart)


//route to place order of a particular product(single pid)
/*
request url = http://localhost:8080/api/v1/user/place_order
method = POST
req.body =
{
    "pid": "aryan1720100876121",
    "color_pid": "aryan1720100876121blue",
    "size": "M" //size should be capital,
    "qauntity_str": 2,
    "address": {
        "line1": "456 Customer St",
        "line2": "Apt 1A",
        "city": "CityName",
        "state": "StateName",
        "zipCode": "67890",
        "country": "CountryName"
    },
    "contact": "9967855433",
    "color": "blue",
}
    all fields must be provided

    * req.headers.authorization = JWT token
*/
router.post("/place_order", requireSignIn, isUser, place_order)


//route to place order for all items present in cart
/*
request url = http://localhost:8080/api/v1/user/execute_cart
method = POST
req.body =
{
    "address": {
        "line1": "456 Customer St",
        "line2": "Apt 1A",
        "city": "CityName",
        "state": "StateName",
        "zipCode": "67890",
        "country": "CountryName"
    },
    "contact": "9967855433",
}
    all fields must be provided

    * req.headers.authorization = JWT token
*/
router.post("/execute_cart", requireSignIn, isUser, execute_cart)


//route to submit ratings of a product
/*
request url = http://localhost:8080/api/v1/user/rating
method = POST
req.body =
{
    "pid": "aryan1720100876121",
    "rating": 4 //out of 5
}
    all fields must be provided

    * req.headers.authorization = JWT token
*/
router.post("/rating", requireSignIn, isUser, submit_rating)

export default router