import cache from 'memory-cache'

function checkcache_allproduct(req, res, next){
    if (!req.query.pagesize || !req.query.page_no) {
        res.status(400).send("pagesize and pageno are required")
    }
    else{
        const key = req.url + req.query.page_no
        const cacheddata = cache.get(key)
        if(cacheddata){
            console.log("data is present in cache from cache middleware", cacheddata)
            res.status(200).send(cacheddata)
        }
        else{
            console.log("data is not present in cache(cache middleware)")
            next()
        }
    }
    
}

function checkcache_for_product(req, res, next){
    const key = req.query.pid
    // console.log(key)
    if(key){
        const cacheddata = cache.get(key)
        if(cacheddata){
            console.log("product data is present in cache")
            res.status(200).send(cacheddata)
        }
        else{
            console.log("data is not present in cache")
            next()
        }
    }
    else{
        res.status(400).send("Pid is not given")
    } 
}

function checkcache_for_bestseller(req, res, next){
    const key = "bestseller"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("bestseller is present in cache")
        res.status(200).send(cacheddata)
    }
    else{
        console.log("bestseller is not present in cache")
        next()
    }
}

function checkcache_for_toprated(req, res, next){
    const key = "toprated"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("toprated is present in cache")
        res.status(200).send(cacheddata)
    }
    else{
        console.log("toprated is not present in cache")
        next()
    }
}
export {checkcache_allproduct, checkcache_for_product, checkcache_for_bestseller, checkcache_for_toprated}