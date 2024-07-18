import { db, admin } from "../DB/firestore.js";
import slugify from "slugify";
import dotenv from "dotenv"
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from 'uuid';

dotenv.config()

const bucket = admin.storage().bucket()

//function to create product along with its color
/*
request url = http://localhost:8080/api/v1/seller/create_product
method = POST
this function handles multiple images and formdata

for sample request body refer index.html file

    * req.headers.authorization = JWT token
*/
async function create_product(req, res) {
    if (req.seller_id) {
        console.log("files", req.files)
        let main_image_url = ""
        const other_images = []
        const pid = req.seller_id + Date.now()
        let count = 1

        try {
            if (req.files) {

                for (let i of req.files) {
                    if (i.fieldname == "main_image") {
                        const blob = bucket.file(`products/${pid}/main_image`);

                        await new Promise((resolve, reject) => {
                            const blobStream = blob.createWriteStream({
                                metadata: {
                                    contentType: i.mimetype
                                }
                            });

                            blobStream.on("error", (err) => {
                                console.error("upload error", err);
                                reject(new Error("Upload error"));
                            });

                            blobStream.on("finish", async () => {
                                await blob.makePublic();
                                main_image_url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                                resolve();
                            });

                            blobStream.end(i.buffer);
                        });

                    } else {
                        const blob = bucket.file(`products/${pid}/${slugify(i.fieldname)}/${count}`);

                        await new Promise((resolve, reject) => {
                            const blobStream = blob.createWriteStream({
                                metadata: {
                                    contentType: i.mimetype
                                }
                            });

                            blobStream.on("error", (err) => {
                                console.error("upload error", err);
                                reject(new Error("Upload error"));
                            });

                            blobStream.on("finish", async () => {
                                await blob.makePublic();
                                const img_url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                                other_images.push(img_url);
                                count++;
                                resolve();
                            });

                            blobStream.end(i.buffer);
                        });
                    }
                }

            }
            else {
                console.log("no files")
            }

            const { product_name, seller_id, seller_name, colors, description, category, display_price, color_code } = req.body
            const productNameLowerCase = product_name.toLowerCase()
            console.log(req.body)
            let color_arr = JSON.parse(colors)
            let color_code_arr = JSON.parse(color_code)
            // Convert each value in color_arr to lowercase
            color_arr = color_arr.map(color => color.toLowerCase());

            // Convert each value in color_code_arr to lowercase
            color_code_arr = color_code_arr.map(colorObj => {
                return {
                    color_code: colorObj.color_code.toLowerCase(),
                    color_name: colorObj.color_name.toLowerCase()
                };
            });

            console.log("color code arr", color_code_arr)
            console.log("color array", color_arr)
            const data = {
                pid,
                product_name: productNameLowerCase,
                main_image: main_image_url,
                rating_count: 0,
                rating_average: 0,
                seller_id,
                seller_name,
                colors: color_arr,
                color_code: color_code_arr,
                description,
                category,
                total_order_count: 0,
                display_price: Number(display_price),
                created_at: Date.now()
            }

            const batch = db.batch();

            const productRef = db.collection(process.env.collectionProduct).doc(pid);
            const sellerRef = db.collection(process.env.sellerCollection).doc(seller_id);

            batch.set(productRef, data);
            batch.update(sellerRef, { products: FieldValue.arrayUnion(pid) });

            for (let i = 0; i < color_arr.length; i++) {
                const color_data = JSON.parse(req.body[`${color_arr[i]}`]);
                await create_color_in_product(batch, pid, color_data, other_images);
            }

            await batch.commit();

            return res.status(200).send("Product created successfully");

        }
        catch (err) {
            console.error(err)
            return res.status(500).send("Internal server error")
        }
    }
    else {
        return res.status(401).send("Authorization error")
    }
}

//helper function for create product i.e the above function
async function create_color_in_product(batch, pid, color_data, other_images) {
    const parent_ref = db.collection(process.env.collectionProduct).doc(pid);

    try {
        let { color_name, color_code, sizes } = color_data;
        color_name = color_name.toLowerCase()
        const color_pid = pid + slugify(color_name);
        const images = [];

        for (let i = 0; i < other_images.length; i++) {
            if (other_images[i].indexOf(color_name) > -1) {
                images.push(other_images[i]);
            }
        }

        const data = {
            color_pid,
            color_name,
            color_code,
            sizes,
            color_order_count: 0,
            images
        };

        batch.set(parent_ref.collection(process.env.collectioncolor).doc(color_pid), data);
    } catch (err) {
        console.error(err);
    }
}
//function to delete complete product
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
async function delete_complete_product(req, res) {
    if (req.seller_id) {
        if (req.body.pid) {
            console.log("inside delete product", req.seller_id)

            const pid = slugify(req.body.pid)

            try {
                const product_doc = await db.collection(process.env.collectionProduct).doc(pid).get()
                const color_arr = product_doc.data().colors

                // Delete main image from storage
                await bucket.file(`products/${pid}/main_image`).delete()

                // Start batch
                const batch = db.batch();

                for (let i = 0; i < color_arr.length; i++) {
                    const color = slugify(color_arr[i]);
                    const color_pid = pid + color;

                    const docRef = db.collection(process.env.collectionProduct).doc(pid).collection(process.env.collectioncolor).doc(color_pid);
                    const color_doc = await docRef.get();
                    const arr_images = color_doc.data().images;

                    for (let j = 0; j < arr_images.length; j++) {
                        const url = new URL(arr_images[j]);
                        const filepath = url.pathname.replace(`/maulikecommerceintern.appspot.com`, '').substring(1);
                        console.log("filepath for each file", filepath);
                        await bucket.file(filepath).delete();
                        console.log(`File ${filepath} deleted successfully.`);
                    }

                    // Add color document deletion to the batch
                    batch.delete(docRef);
                }

                // Add product document deletion to the batch
                const productRef = db.collection(process.env.collectionProduct).doc(pid);
                batch.delete(productRef);

                // Add seller document update to remove the product from the list
                const sellerRef = db.collection(process.env.sellerCollection).doc(req.seller_id);
                batch.update(sellerRef, { products: FieldValue.arrayRemove(pid) });

                // Commit the batch
                await batch.commit();

                res.status(200).send("Product deleted successfully");
            } catch (err) {
                console.error(err);
                res.status(500).send("Internal server error");
            }
        } else {
            res.status(400).send("Pid is not provided");
        }
    } else {
        return res.status(401).send("Authorization error");
    }
}

//function to delete color from a product
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
async function delete_color(req, res) {
    if (req.seller_id) {
        if (req.body.pid) {
            console.log("inside delete color", req.seller_id)
            console.log("color", req.body.color)

            const pid = slugify(req.body.pid)
            const color = req.body.color.toLowerCase()
            const color_code = req.body.color_code
            const color_pid = pid + slugify(color)

            try {
                const colordoc = await db.collection(process.env.collectionProduct).doc(pid).collection(process.env.collectioncolor).doc(color_pid).get()
                const arr_images = colordoc.data().images

                for (var i = 0; i < arr_images.length; i++) {
                    const url = new URL(arr_images[i])
                    const filepath = url.pathname.replace(`/maulikecommerceintern.appspot.com`, '').substring(1)
                    console.log("filepath for each file", filepath)
                    await bucket.file(filepath).delete();
                    console.log(`File ${filepath} deleted successfully.`);
                }
                const color_data = {
                    color_name: color,
                    color_code: color_code
                }
                await db.collection(process.env.collectionProduct).doc(pid).collection(process.env.collectioncolor).doc(color_pid).delete()
                await db.collection(process.env.collectionProduct).doc(pid).update({
                    colors: FieldValue.arrayRemove(color),
                    color_code: FieldValue.arrayRemove(color_data)
                })
                res.status(200).send("Color deleted successfully")
            }
            catch (err) {
                console.error(err)
                res.status(500).send("Internal server error")
            }
        }
        else {
            res.status(400).send("Pid is not provided")
        }
    }
    else {
        return res.status(401).send("Authorizatoin error")
    }
}

//function to create a color document of a product
/*request url = http://localhost:8080/api/v1/seller/add_color
method = POST
req.body = refer test.html 
    all fields are required
    * req.headers.authorization = JWT token
*/
async function add_color(req, res) {
    if (req.seller_id) {
        if (req.body.pid) {
            try {
                console.log('insidr add_color PID:', req.body.pid)

                let { pid, color_name, color_code, sizes } = req.body
                color_name = color_name.toLowerCase()
                const size_arr = JSON.parse(sizes)
                const color_pid = pid + slugify(color_name)
                let count = 1
                const images = []

                if (req.files) {
                    for (let i of req.files) {
                        const blob = bucket.file(`products/${pid}/${slugify(color_name)}/${count}`);
                        await new Promise((resolve, reject) => {
                            const blobStream = blob.createWriteStream({
                                metadata: {
                                    contentType: i.mimetype
                                }
                            });

                            blobStream.on("error", (err) => {
                                console.error("upload error", err);
                                reject(new Error("Upload error"));
                            });

                            blobStream.on("finish", async () => {
                                await blob.makePublic();
                                const img_url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                                images.push(img_url);
                                count++;
                                resolve();
                            });

                            blobStream.end(i.buffer);
                        });
                    }
                }

                const data = {
                    color_pid,
                    color_name,
                    color_code,
                    sizes: size_arr,
                    color_order_count: 0,
                    images
                }
                const color_data = {
                    color_name,
                    color_code
                }
                await db.collection(process.env.collectionProduct).doc(pid).collection(process.env.collectioncolor).doc(color_pid).set(data)
                await db.collection(process.env.collectionProduct).doc(pid).update({
                    colors: FieldValue.arrayUnion(color_name),
                    color_code: FieldValue.arrayUnion(color_data),
                    created_at: Date.now()
                })
                res.status(200).send("Color added successfully")
            }
            catch (err) {
                console.error(err)
                res.status(500).send("Internal server error")
            }
        }
        else {
            res.status(400).send("Pid is not provided")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//this function adds stock for a given color and size of the product
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
async function add_stock(req, res) {
    if (req.seller_id) {
        const { pid, color_pid, size, qauntity } = req.body
        if (pid && color_pid && size && qauntity) {
            try {
                const docRef = db.collection(process.env.collectionProduct).doc(pid).collection(process.env.collectioncolor).doc(color_pid)
                const doc = await docRef.get()
                if (doc.exists) {
                    const size_arr = doc.data().sizes
                    for (let i of size_arr) {
                        if (i.size == size.toUpperCase()) {
                            const new_qauntity = Number(i.stock) + Number(qauntity)
                            i.stock = new_qauntity
                        }
                    }
                    await docRef.update({ sizes: size_arr })
                    res.status(200).send("Stock added successfully")
                }
                else {
                    res.status(400).send("Error")
                }
            }
            catch (err) {
                console.error(err)
                res.status(500).send("Internal server error")
            }
        }
        else {
            res.status(400).send("Incomplete fields")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//function to change the description of product
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
async function change_desc(req, res) {
    if (req.seller_id) {
        const { pid, description } = req.body
        if (pid && description) {
            await db.collection(process.env.collectionProduct).doc(pid).update({ description: description.toLowerCase() })
            res.status(200).send("Description updated")
        }
        else {
            res.status(400).send("Inavlid arguments")
        }
    }
    else {
        res.status(401).send("Unauthorized")
    }
}

//function to change the main image of product
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
async function change_main_img(req, res) {
    if (req.seller_id) {
        const pid = req.body.pid

        if (req.file && pid) {
            console.log(req.file)
            await bucket.file(`products/${pid}/main_image`).delete()
            const blob = bucket.file(`products/${pid}/main_image`)

            const blobStream = blob.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype
                }
            })

            blobStream.on("error", (err) => {
                console.error("upload error", err);
                res.status(500).send("Internal server error")
            });

            blobStream.on("finish", async () => {
                await blob.makePublic();
                const img_url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                await db.collection(process.env.collectionProduct).doc(pid).update({ main_image: img_url })
                res.status(200).send("main image updated successfully")
            });

            blobStream.end(req.file.buffer)

        }
        else {
            res.status(400).send("Invalid arguments")
        }
    }
    else {
        res.status(401).send("Unauthorized")
    }
}

//function to change product name
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
async function change_product_name(req, res) {
    if (req.seller_id) {
        const { pid, name } = req.body
        if (pid && name) {
            await db.collection(process.env.collectionProduct).doc(pid).update({ product_name: name.toLowerCase() })
            res.status(200).send("Product name changed successfully")
        }
        else {
            res.status(400).send("Invalid arguments")
        }
    }
    else {
        res.status(401).send("Unauthorized")
    }
}

//function to get seller profile
/*
request url = http://localhost:8080/api/v1/seller/get_profile
method = GET 

    * req.headers.authorization = JWT token
*/
async function get_seller_profile(req, res) {
    if (req.seller_id) {
        try {
            const doc = await db.collection(process.env.sellerCollection).doc(req.seller_id).get()
            res.status(200).send(doc.data())
        }
        catch (err) {
            console.error(err)
            res.status(500).send("Internal server error")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//function to get seller products
/*
request url = http://localhost:8080/api/v1/seller/get_products
method = GET 

    * req.headers.authorization = JWT token
*/
async function get_seller_products(req, res) {
    if (req.seller_id) {
        try {
            const snapshot = await db.collection(process.env.collectionProduct).where('seller_id', '==', req.seller_id).get()
            if (snapshot.empty) {
                res.status(200).send("No products")
            }
            else {
                const response_arr = []
                snapshot.forEach(doc => {
                    response_arr.push(doc.data())
                });
                res.status(200).send(response_arr)
            }
        }
        catch (err) {
            console.error(err)
            res.status(500).send("Internal server error")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

export {
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
}