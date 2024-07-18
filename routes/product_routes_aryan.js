import express from "express"
import {
    checkcache_allproduct,
    checkcache_for_product,
    checkcache_for_bestseller,
    checkcache_for_toprated
} from "../middleware/caching_middleware.js"
import {
    get_all_product_paginate,
    get_product_by_pid,
    get_bestseller,
    get_toprated,
    get_short_description,
    get_color_data,
    get_newly_arrived,
    search_by_keyword
} from "../controllers/product_controller_user.js"
import { isUser, requireSignIn } from "../middleware/authMiddleware.js"

const router = express.Router()

//route for getting all the products
/*request url = http://localhost:8080/api/v1/product/get_product?pagesize=<integer>&page_no=<integer>&last_id=<string>
method = GET
Get request with query parameters
pagesize => no of products(docs) you want at a particular 
                     time
                    *compulsory field
page_no => all the docs requested at a particular time are saved in a 
                     particular page and a page_no should be
                     *page_no should be unique for eachrequest  
                     *compulsory field
last_id => product id of the last product(doc) should be given for
                pagination
                 *optional for first request
                 *must be provided for second request
*/
router.get("/get_product", checkcache_allproduct, get_all_product_paginate)

//route for getting a particular product
/*request url = http://localhost:8080/api/v1/product/get_product_pid?pid=<value>
method = GET
*/
router.get("/get_product_pid", checkcache_for_product, get_product_by_pid)

//route for reading the color document
/*request url = http://localhost:8080/api/v1/product/get_color?pid=<value>&color=<value>
method = GET
*/
router.get("/get_color", get_color_data)

//route for getting best seller products
/*request url = http://localhost:8080/api/v1/product/get_bestseller 
method = GET
*/
router.get("/get_bestseller", checkcache_for_bestseller, get_bestseller)

//route for getting toprated products
/*request url = http://localhost:8080/api/v1/product/get_toprated 
method = GET
*/
router.get("/get_toprated", checkcache_for_toprated, get_toprated)

//route for getting short description user must be logged in
/*request url = http://localhost:8080/api/v1/product/get_short_description 
method = GET
* req.headers.authorization = JWT token
*/
router.get("/get_short_description", requireSignIn, isUser, get_short_description)

//route for getting newly arrived product
/*request url = http://localhost:8080/api/v1/product/newly_arrived
method = GET
*/
router.get("/newly_arrived", get_newly_arrived)

router.post("/search", search_by_keyword)

export default router