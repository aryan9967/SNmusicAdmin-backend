import cache from 'memory-cache'


function checkcache_for_students(req, res, next){
    const key = "our_students"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("students is present in cache");
        res.status(200).send(cacheddata)
    }
    else{
        console.log("students is not present in cache")
        next()
    }
}

function checkcache_for_events(req, res, next){
    const key = "all_events"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("events is present in cache")
        res.status(200).send(cacheddata)
    }
    else{
        console.log("events is not present in cache")
        next()
    }
}

function checkcache_for_album_folder(req, res, next){
    const key = "album_folder"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("album folder is present in cache");
        res.status(200).send(cacheddata)
    }
    else{
        console.log("album folder is not present in cache")
        next()
    }
}

function checkcache_for_album_item(req, res, next){
    const key = "album_item"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("album item is present in cache");
        res.status(200).send(cacheddata)
    }
    else{
        console.log("album item is not present in cache")
        next()
    }
}

function checkcache_for_gallery(req, res, next){
    const key = "gallery"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("gallery is present in cache");
        res.status(200).send(cacheddata)
    }
    else{
        console.log("gallery is not present in cache")
        next()
    }
}

function checkcache_for_instrument(req, res, next){
    const key = "instrument"
    const cacheddata = cache.get(key)
    if(cacheddata){
        console.log("instrument is present in cache");
        res.status(200).send(cacheddata)
    }
    else{
        console.log("instrument is not present in cache")
        next()
    }
}

export { checkcache_for_students, checkcache_for_events, checkcache_for_album_folder, checkcache_for_album_item, checkcache_for_gallery, checkcache_for_instrument}