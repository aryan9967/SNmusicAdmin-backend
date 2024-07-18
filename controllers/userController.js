import { faL } from "@fortawesome/free-solid-svg-icons";
import { db, admin } from "../DB/firestore.js";
import dotenv from "dotenv"
import { FieldValue } from "firebase-admin/firestore"
import slugify from "slugify";
import { v4 as uuidv4 } from 'uuid';

dotenv.config()

const bucket = admin.storage().bucket()

//function to get user details includes previous and current orders as well
/* 
    request url = http://localhost:8080/api/v1/user/get_user_details
    *req.headers.authorization = JWT token
    method = GET
*/
async function get_user_details(req, res) {
    const user_id = req.user_id
    if (user_id) {
        const doc = await db.collection(process.env.userCollection).doc(user_id).get()
        res.status(200).send(doc.data())
    }
    else {
        return res.status(400).send("phone number is not provided")
    }
}

async function get_user_address_contact(req, res) {
    const user_id = req.user_id
    if (user_id) {
        try{
            const doc = await db.collection(process.env.userCollection).doc(user_id).get()
            const {address, contact} = doc.data()
            const data = {
                address,
                contact
            }
            res.status(200).send(data)
        }
        catch(err){
            console.error(err)
            return res.status(500).send("Internal server error")
        }
    }
    else {
        return res.status(400).send()
    }
}


//function that updates user details (name, address, profile img)
/* 
    request url = http://localhost:8080/api/v1/user/update_user
    method = POST
    req.body =  {name, address} /optional
    req.file /optional
    *req.headers.authorization = JWT token
*/
async function update_user_details(req, res) {
    console.log("inside update user", req.user_id)
    if (req.user_id) {
        try {
            let photoUrl = ""
            let { name, alternative_phone, email, dob, gender, address } = req.body;
            // Create the updates object only with provided fields
            const updates = {};
            if (name) updates.name = name;
            if (alternative_phone) updates.alternative_phone = alternative_phone;
            if (email) updates.email = email;
            if (dob) updates.dob = dob;
            if (gender) updates.gender = gender;
            if (address) updates.address = JSON.parse(address);

            console.log("file", req.file)
            console.log(name, address)
            if (req.file) {
                if (req.file.mimetype == "image/jpeg" || req.file.mimetype == "image/jpg" || req.file.mimetype == "image/png") {

                    const doc_data = await db.collection(process.env.userCollection).doc(req.user_id).get()
                    const previous_url = doc_data.data().photoUrl
                    if (previous_url) {
                        const url = new URL(previous_url);
                        const filepath = url.pathname.replace(`/maulikecommerceintern.appspot.com`, '').substring(1);
                        console.log("filepath for each file", filepath);
                        await bucket.file(filepath).delete();
                    }

                    const blob = bucket.file(`users/${req.user_id}${Date.now()}`)

                    const blobStream = blob.createWriteStream(
                        {
                            metadata: {
                                contentType: req.file.mimetype
                            }
                        }
                    )

                    blobStream.on("error", (err) => {
                        console.error("Upload error:", err);
                        res.status(500).send({ error: "Upload error" });
                    })

                    blobStream.on("finish", async () => {
                        await blob.makePublic()
                        photoUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`
                        if (name && address) {
                            await db.collection(process.env.userCollection).doc(req.user_id).update({ name: name, address: JSON.parse(address), photoUrl: photoUrl })
                            return res.status(200).send({
                                message: "name address and profile pic updated",
                                name: name,
                                address: JSON.parse(address),
                                photoUrl: photoUrl,
                            })
                        }
                        else if (name) {
                            await db.collection(process.env.userCollection).doc(req.user_id).update({ name: name, photoUrl: photoUrl })
                            return res.status(200).send({
                                message: "name and profile pic updated",
                                name: name,
                                photoUrl: photoUrl,
                            })
                        }
                        else if (address) {
                            await db.collection(process.env.userCollection).doc(req.user_id).update({ address: JSON.parse(address), photoUrl: photoUrl })
                            return res.status(200).send({
                                message: "address and profile pic updated",
                                address: JSON.parse(address),
                                photoUrl: photoUrl,
                            })
                        }
                        else {
                            console.log("inside update doc", photoUrl)
                            await db.collection(process.env.userCollection).doc(req.user_id).update({ photoUrl: photoUrl })
                            return res.status(200).send({
                                message: "profile pic updated",
                                photoUrl: photoUrl,
                            })
                        }
                    })

                    blobStream.end(req.file.buffer)
                }
                else {
                    res.status(400).send("file type not supported")
                    req.file.buffer = null
                }
            }

          
            else if (name || alternative_phone || email || dob || gender || address) {
                await db.collection(process.env.userCollection).doc(req.user_id).update(updates);
                return res.status(200).send("name and address updated")
            }

            else {
                res.status(400).send("Nothing to update")
            }
        }
        catch (err) {
            console.log("error", err)
        }
    }
    else {
        res.status(401).send("unauthorized")
    }
}

//function to add products to whishlist
/* 
    request url = http://localhost:8080/api/v1/user/update_wishlist
    method = POST
    req.body = 
    {
        "pid": "aryan1720100876121",
        "name": "Sample Product",
        "price": 99.99,
        "image": "path/to/image.jpg",
        "color": "blue",
        "color_code":"#000000"
    }
    all fields must be provided
    *req.headers.authorization = JWT token
*/
async function add_to_wishlist(req, res) {
    console.log("inside wishlist", req.user_id)
    console.log(req.body.pid)
    if (req.user_id && req.body.pid) {
        try {
            const { pid, name, price, image, color, color_code } = req.body
            const data = {
                pid,
                name,
                price,
                image,
                color,
                color_code
            }
            await db.collection(process.env.userCollection).doc(req.user_id).update({ wishlist: FieldValue.arrayUnion(data) })
            res.status(200).send("item added successfully")
        }
        catch (err) {
            console.log("error occured")
            console.error(err)
            res.status(500).send("some error occured")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//function to remove items from whishlist
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
async function remove_item_from_wishlist(req, res) {
    if (req.user_id) {
        const { pid, color } = req.body
        try {
            const doc = await db.collection(process.env.userCollection).doc(req.user_id).get()
            const wishlist_arr = doc.data().wishlist

            let index = 0

            for (let i of wishlist_arr) {
                if ((i.pid == pid) && (i.color == color)) {
                    wishlist_arr.splice(index, 1)
                    break
                }
                index++
            }
            console.log(wishlist_arr)
            await db.collection(process.env.userCollection).doc(req.user_id).update({ wishlist: wishlist_arr })
            res.status(200).send("Item removed successfully")
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

//function to add items to cart
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
async function add_to_cart(req, res) {
    console.log("inside cart", req.user_id)
    console.log(req.body.pid)
    if (req.user_id && req.body.pid) {
        try {
            const { pid, qauntity_str, size, color } = req.body
            const qauntity = Number(qauntity_str)
            const data = {
                pid,
                qauntity,
                size,
                color
            }
            console.log("qauntity", qauntity)

            if (qauntity > 0) {
                const doc = await db.collection(process.env.userCollection).doc(req.user_id).get()
                const cart_arr = doc.data().cart

                let already_exist = false
                for (let i of cart_arr) {
                    if ((i.pid == pid) && (i.color == color) && (i.size == size)) {
                        console.log("item already exist changing qauntity")
                        i.qauntity = qauntity
                        already_exist = true
                        break
                    }
                }

                if (already_exist) {
                    await db.collection(process.env.userCollection).doc(req.user_id).update({ cart: cart_arr })
                    res.status(200).send("qauntity updated successfully")
                }
                else {
                    await db.collection(process.env.userCollection).doc(req.user_id).update({ cart: FieldValue.arrayUnion(data) })
                    res.status(200).send("item added successfully")
                }
            }
            else {
                res.status(400).send("Invalid qauntity")
            }

        }
        catch (err) {
            console.log("error occured")
            res.status(500).send("Internal server error")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//function to delete items from cart
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
async function delete_item_from_cart(req, res) {
    if (req.user_id) {
        const { pid, color, size } = req.body
        try {
            const doc = await db.collection(process.env.userCollection).doc(req.user_id).get()
            const cart_arr = doc.data().cart

            const data = {
                pid,
                color,
                size,
                qauntity: 0
            }

            let item_exist = false

            for (let i of cart_arr) {
                if ((i.pid == pid) && (i.color == color) && (i.size == size)) {
                    data.qauntity = i.qauntity
                    item_exist = true
                    break
                }
            }

            if (item_exist) {
                await db.collection(process.env.userCollection).doc(req.user_id).update({ cart: FieldValue.arrayRemove(data) })
                res.status(200).send("Item deleted from cart")
            }
            else {
                res.status(400).send("Invalid request")
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

// function to empty the cart
/* 
    request url = http://localhost:8080/api/v1/user/empty_cart
    method = POST
    
    *req.headers.authorization = JWT token
*/
async function empty_cart(req, res) {
    if (req.user_id) {
        try {
            await db.collection(process.env.userCollection).doc(req.user_id).update({ cart: [] })
            res.status(200).send("Cart is emptied successfully")
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

//function to fetch cart and also check stock of the items in cart
/* 
    request url = http://localhost:8080/api/v1/user/fetch_cart
    method = GET
    
    *req.headers.authorization = JWT token
*/
async function fetch_cart(req, res) {
    if (req.user_id) {
        try {
            const user_doc = await db.collection(process.env.userCollection).doc(req.user_id).get()
            const user_data = user_doc.data()
            const cart_arr = user_data.cart

            const response_arr = []

            for (var i = 0; i < cart_arr.length; i++) {
                const item = cart_arr[i]
                const color_pid = item.pid + slugify(item.color)
                const docRef = db.collection(process.env.collectionProduct).doc(item.pid)
                const doc_snap = await docRef.get()
                const doc_data = doc_snap.data()

                const color_doc = await docRef.collection(process.env.collectioncolor).doc(color_pid).get()
                const color_data = color_doc.data()

                const size_arr = color_data.sizes

                let price = 0
                let images = color_data.images
                let check = true

                for (var j = 0; j < size_arr.length; j++) {
                    if (size_arr[j].size == item.size) {
                        if (size_arr[j].stock < item.qauntity) {
                            check = false
                        }
                        price = size_arr[j].price * item.qauntity
                        break
                    }
                }

                const data = {
                    pid: item.pid,
                    name: doc_data.product_name,
                    rating: doc_data.rating_average,
                    color: item.color,
                    qauntity: item.qauntity,
                    size: item.size,
                    price,
                    in_stock: check,
                    images,
                    category: doc_data.category
                }

                response_arr.push(data)
            }

            res.status(200).send(JSON.stringify(response_arr))
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

//function to place order of a single product(single pid)
//color_pid is the id of document inside the subcollection 'color_collections' color_pid = pid + color //no spaces 
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

async function place_order(req, res) {
    if (req.user_id) {
        const user_id = req.user_id
        const { pid, color_pid, size, qauntity_str, address, contact, color } = req.body
        // const address_obj = JSON.parse(address)
        const qauntity = Number(qauntity_str)

        if (pid && color_pid && size && qauntity) {
            try {
                const parent_ref = db.collection(process.env.collectionProduct).doc(pid)

                const parent_doc = await parent_ref.get()
                const name = parent_doc.data().product_name

                const doc = await parent_ref.collection(process.env.collectioncolor).doc(color_pid).get()

                if (doc.exists) {
                    const doc_data = doc.data()
                    const size_arr = doc_data.sizes

                    let price = 0
                    let image = doc_data.images[0]

                    for (let i of size_arr) {
                        if (i.size == size.toUpperCase()) {
                            if (i.stock < qauntity) {
                                return res.status(400).send("out of stock")
                            }
                            price = Number(i.price)
                            i.stock = Number(i.stock) - qauntity
                            break
                        }
                    }

                    let total_amount = price * qauntity

                    const order_id = "OD" + user_id + Date.now()
                    const order_date = Date.now()

                    const product_data = {
                        pid,
                        image,
                        name,
                        color
                    }

                    const user_data = {
                        order_id,
                        products: [product_data],
                        total_amount,
                        order_date
                    }

                    const product_data_comp = {
                        pid,
                        image,
                        name,
                        color,
                        size,
                        qauntity: qauntity,
                        price,
                        total_item_price: total_amount
                    }

                    const complete_order_data = {
                        user_id,
                        order_id,
                        products: [product_data_comp],
                        total_amount,
                        order_date,
                        contact,
                        address,
                        delivery_status: "ordered",
                        payment_status: "paid",
                        payment_method: "UPI"
                    }

                    await Promise.all([
                        parent_ref.collection(process.env.collectioncolor).doc(color_pid).update({ sizes: size_arr }),
                        db.collection(process.env.userCollection).doc(user_id).update({ current_orders: FieldValue.arrayUnion(user_data) }),
                        db.collection(process.env.collectionorders).doc(order_id).set(complete_order_data),
                        parent_ref.update({ total_order_count: FieldValue.increment(qauntity) }),
                        parent_ref.collection(process.env.collectioncolor).doc(color_pid).update({ color_order_count: FieldValue.increment(qauntity) })
                    ])

                    res.status(200).send("Order placed successfully")
                }
                else {
                    res.status(404).send("Not found")
                }
            }
            catch (err) {
                console.error(err)
                res.status(500).send("Internal server error")
            }
        }
        else {
            res.status(400).send("Invalid request")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//this function is used to order all the items present in the cart
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
async function execute_cart(req, res) {
    const user_id = req.user_id
    const { address, contact } = req.body
    if (user_id) {
        try {
            const doc = await db.collection(process.env.userCollection).doc(user_id).get()
            const cart_arr = doc.data().cart

            const order_arr_user = []
            const order_arr_complete = []

            let total_amount = 0

            const order_date = Date.now()
            const order_id = "OD" + user_id + order_date

            const batch = db.batch();

            for (let i of cart_arr) {
                const pid = i.pid
                const color = slugify(i.color)
                const qauntity = Number(i.qauntity)
                const size = i.size
                const color_pid = pid + color

                const parent_ref = db.collection(process.env.collectionProduct).doc(pid)
                const parent_doc = await parent_ref.get()
                const name = parent_doc.data().product_name

                const color_ref = parent_ref.collection(process.env.collectioncolor).doc(color_pid);
                const color_doc = await color_ref.get()
                const color_data = color_doc.data()

                let price = 0
                const image = color_data.images[0]

                const size_arr = color_data.sizes

                for (let j of size_arr) {
                    if (j.size == size) {
                        if (j.stock < qauntity) {
                            const data = {
                                pid,
                                color,
                                qauntity,
                                size,
                                in_stock: false
                            }
                            return res.status(400).send("Out of stock", data)
                        }
                        price = j.price
                        j.stock = Number(j.stock) - qauntity
                    }
                }
                let item_price = qauntity * price
                total_amount += item_price

                const product_data = {
                    pid,
                    image,
                    name,
                    color
                }
                order_arr_user.push(product_data)

                const product_data_comp = {
                    pid,
                    image,
                    name,
                    color,
                    size,
                    qauntity,
                    price,
                    total_item_price: item_price
                }
                order_arr_complete.push(product_data_comp)

                batch.update(color_ref, { sizes: size_arr });
                batch.update(parent_ref, { total_order_count: FieldValue.increment(qauntity) });
                batch.update(color_ref, { color_order_count: FieldValue.increment(qauntity) });
            }
            const user_data = {
                order_id,
                products: order_arr_user,
                total_amount,
                order_date
            }

            const complete_order_data = {
                user_id,
                order_id,
                products: order_arr_complete,
                total_amount,
                order_date,
                contact,
                address,
                delivery_status: "ordered",
                payment_status: "paid",
                payment_method: "UPI"
            }

            batch.update(db.collection(process.env.userCollection).doc(user_id), { current_orders: FieldValue.arrayUnion(user_data) });
            batch.set(db.collection(process.env.collectionorders).doc(order_id), complete_order_data);
            batch.update(db.collection(process.env.userCollection).doc(user_id), { cart: [] })

            await batch.commit();

            res.status(200).send("Cart Order placed successfully");
        }
        catch (err) {
            console.error(err)
            return res.status(500).send("Internal serevr error")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//this function is used to submit rating of a product
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
async function submit_rating(req, res) {
    const user_id = req.user_id
    const { pid, rating } = req.body
    if (user_id) {
        if (pid && rating) {
            const doc = await db.collection(process.env.collectionProduct).doc(pid).get()
            let { rating_average, rating_count } = doc.data()
            let total_rating = (Number(rating_average) * Number(rating_count)) + Number(rating)
            rating_count++
            let new_rating = total_rating / rating_count
            await db.collection(process.env.collectionProduct).doc(pid).update({
                rating_count,
                rating_average: new_rating
            })
            return res.status(200).send("Rating added successfully")
        }
        else {
            res.status(400).send("Invalid request")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

export {
    get_user_details,
    update_user_details,
    add_to_cart,
    add_to_wishlist,
    fetch_cart,
    empty_cart,
    delete_item_from_cart,
    remove_item_from_wishlist,
    place_order,
    execute_cart,
    submit_rating,
    get_user_address_contact
}