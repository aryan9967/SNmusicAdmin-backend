import { db } from "../DB/firestore.js"
import dotenv from 'dotenv'
import cache from "memory-cache"
import slugify from "slugify"

const CACHE_DURATION = 10 * 60 * 1000 //10 minutes

dotenv.config()

//function to get all product with pagination
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
async function get_all_product_paginate(req, res) {
    var last_id = undefined
    const product_arr = []
    console.log("request url", req.url)
    const request_query = req.query
    const page_no = request_query.page_no
    const page_size = request_query.pagesize
    last_id = request_query.last_id
    const key = req.url + page_no

    if (!page_size || !page_no) {
        res.status(400).send("pagesize and pageno are required")
    }
    else {
        console.log("last_doc id is", request_query.last_id)

        let query = db.collection(process.env.collectionProduct)
            .orderBy('display_price')
            .limit(Number(page_size));

        if (last_id) {
            console.log("id of last doc", last_id)
            const last_doc = await db.collection(process.env.collectionProduct).doc(last_id).get()
            query = query.startAfter(last_doc)
        }

        const snapshot = await query.get()

        if (snapshot.empty) {
            console.log("data is not present")
            res.status(404).send("No more data")
        }
        else {
            // last = snapshot.docs[snapshot.docs.length - 1]
            snapshot.forEach(doc => {
                var act_data = doc.data()
                const product_summary = {
                    pid: act_data.pid,
                    product_name: act_data.product_name,
                    main_image: act_data.main_image,
                    rating_average: act_data.rating_average,
                    display_price: act_data.display_price,
                    description: act_data.description,
                    category: act_data.category
                }
                product_arr.push(product_summary)
            })
            console.log("product_data", product_arr)
            let cacheddata = cache.get(key)
            if (cacheddata) {
                console.log("data is present in cache from get_all_product_paginate", key)
            }
            else {
                console.log("setting data in cache")
                cache.put(key, product_arr, CACHE_DURATION)
            }

            res.status(200).send(product_arr)
        }
    }

}

//function to get product by pid
/*request url = http://localhost:8080/api/v1/product/get_product_pid?pid=<value>
method = GET
*/
async function get_product_by_pid(req, res) {
    // console.log(req.query.pid)
    if (req.query.pid) {
        const key = req.query.pid
        const product_doc = await db.collection(process.env.collectionProduct).doc(req.query.pid).get()
        res.status(200).send(product_doc.data())
        cache.put(key, product_doc.data(), CACHE_DURATION)
    }
    else {
        res.status(400).send("PID should be given")
    }
}

//function to get a prouct's color data
/*request url = http://localhost:8080/api/v1/product/get_color?pid=<value>&color=<value>
method = GET
*/
async function get_color_data(req, res) {
    const { pid, color } = req.query
    if (pid && color) {
        try {
            const color_doc = pid + slugify(color)
            const snapshot = await db.collection(process.env.collectionProduct).doc(pid).collection(process.env.collectioncolor).doc(color_doc).get()
            if (snapshot.exists) {
                const doc_data = snapshot.data()
                res.status(200).send(doc_data)
            }
            else {
                res.status(400).send("Not found")
            }
        }
        catch (err) {
            console.error(err)
            res.status(500).send("Internal server error")
        }
    }
    else {
        res.status(400).send("Invalid arguments")
    }
}

//function to get short description of product
/*request url = http://localhost:8080/api/v1/product/get_short_description 
method = GET
* req.headers.authorization = JWT token
*/
async function get_short_description(req, res) {
    if (req.user_id) //change according to middleware
    {
        if (req.query.pid) {
            try {
                const snapshot = await db.collection(process.env.collectionProduct).doc(req.query.pid).get()
                const { pid, product_name, main_image, rating_average, display_price, description, category } = snapshot.data()
                const data = {
                    pid,
                    product_name,
                    main_image,
                    rating_average,
                    display_price,
                    description,
                    category
                }
                res.status(200).send(data)
            }
            catch (err) {
                console.error(err)
                res.status(500).send("Internal server error")
            }
        }
        else {
            res.status(400).send("product id is invalid")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//function to get bestseller product
/*request url = http://localhost:8080/api/v1/product/get_bestseller 
method = GET
*/
async function get_bestseller(req, res) {
    let bestseller_products = []
    let query = db.collection(process.env.collectionProduct).orderBy('total_order_count', 'desc').limit(20)

    const key = "bestseller"

    const snapshot = await query.get()
    snapshot.forEach(doc => {
        var act_data = doc.data()
        const product_summary = {
            pid: act_data.pid,
            product_name: act_data.product_name,
            main_image: act_data.main_image,
            rating_average: act_data.rating_average,
            display_price: act_data.display_price,
            description: act_data.description,
            category: act_data.category
        }
        bestseller_products.push(product_summary)
    })

    cache.put(key, bestseller_products, CACHE_DURATION)

    res.status(200).send(bestseller_products)
}

//function to get toprated products
/*request url = http://localhost:8080/api/v1/product/get_toprated 
method = GET
*/
async function get_toprated(req, res) {
    let top_rated = []
    let query = db.collection(process.env.collectionProduct).orderBy('rating_average', 'desc').limit(20)

    const key = "toprated"

    const snapshot = await query.get()
    snapshot.forEach(doc => {
        var act_data = doc.data()
        const product_summary = {
            pid: act_data.pid,
            product_name: act_data.product_name,
            main_image: act_data.main_image,
            rating_average: act_data.rating_average,
            display_price: act_data.display_price,
            description: act_data.description,
            category: act_data.category
        }
        top_rated.push(product_summary)
    })

    cache.put(key, top_rated, CACHE_DURATION)

    res.status(200).send(top_rated)
}

async function get_newly_arrived(req, res) {
    let newly_arrived = []

    let query = db.collection(process.env.collectionProduct).orderBy('created_at', 'desc').limit(20)

    const key = "newly_arrived"
    try {
        const snapshot = await query.get()
        snapshot.forEach(doc => {
            var act_data = doc.data()
            const product_summary = {
                pid: act_data.pid,
                product_name: act_data.product_name,
                main_image: act_data.main_image,
                rating_average: act_data.rating_average,
                display_price: act_data.display_price,
                description: act_data.description,
                category: act_data.category
            }
            newly_arrived.push(product_summary)
        })

        cache.put(key, newly_arrived, CACHE_DURATION)
        res.status(200).send(newly_arrived)
    }
    catch (err) {
        console.error(err)
    }
}

async function search_by_keyword(req, res) {
    const keyword = req.body.keyword ? req.body.keyword.toLowerCase() : null;

    if (!keyword) {
        return res.status(400).json({ message: 'No search keyword provided' });
    }

    try {
        // Search by product name
        const productNameDocs = await db.collection('products')
            .where('product_name', '==', keyword)
            .get();

        // Search by color
        const colorDocs = await db.collection('products')
            .where('colors', 'array-contains', keyword)
            .get();

        // Combine the results from both queries
        const productNameResults = productNameDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const colorResults = colorDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Merge unique results
        const productSet = new Set();
        const products = [...productNameResults, ...colorResults].filter(product => {
            const duplicate = productSet.has(product.id);
            productSet.add(product.id);
            return !duplicate;
        });

        if (products.length === 0) {
            return res.status(404).json({ message: 'No matching products found' });
        }

        res.status(200).json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export { get_all_product_paginate, get_product_by_pid, get_bestseller, get_toprated, get_short_description, get_color_data, get_newly_arrived, search_by_keyword }