import { check_stock } from "../helper/check_stock.js"
import { db } from "../DB/firestore.js"
import dotenv from "dotenv"

dotenv.config()

//middleware to check stock before adding item to cart
async function check_single_stock_middleware(req, res, next) {
    console.log("inside check stock middleware", req.user_id)
    console.log(req.body.pid)
    console.log(req.body.color)
    if (req.user_id && req.body.pid) {
        try {
            const { pid, qauntity_str, size, color } = req.body
            const qauntity = Number(qauntity_str)
            const check = await check_stock(pid, qauntity, size, color)
            if(check){
                console.log("item is in stock")
                next()
            }
            else{
                console.log("item not in stock")
                res.status(400).send("Item out of stock")
            }
        }
        catch (err) {
            console.error(err)
            res.status(500).send("internal server error")
        }
    }
    else {
        res.status(401).send("Authorization error")
    }
}

//unchecked
async function check_cart_stock_middleware(req, res, next){
    if(req.user_id){
        try{
            const user_id = req.user_id
            const doc = await db.collection(process.env.userCollection).doc(user_id).get()
            const cart = doc.data().cart
            const check_for_all_item = [] 
            const overall_check = true

            for(var i = 0; i<cart.length; i++){
                let item = cart[i]
                console.log("cart item", item)
                let check = await check_stock(item.pid, item.qauntity, item.size, item.color)
                if(check == false){
                    overall_check = false
                }
                let check_obj = {
                    cart_item: item.pid,
                    color : item.color,
                    size : item.size,
                    check
                }
                check_for_all_item.push(check_obj)
            }
               
            if(overall_check == false){
               return res.status(400).send("items out of stock", check_for_all_item)
            }
            else{
                console.log("all items in stock", check_for_all_item)
                next()
            }

        }
        catch(err){
            console.error(err)
            return res.status(500).send("Internal server error")
        }
    }
    else{
        res.status(401).send("Authorization error")
    }
}

export {check_single_stock_middleware, check_cart_stock_middleware}