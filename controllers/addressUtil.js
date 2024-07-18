async function get_city_state(req, res){
    const pincode = req.query.pincode
    if(pincode){
        console.log(pincode)
        try{
            const options = {
                method: 'GET'
            }
            const data = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, options)
            
            const data_json = await data.json()
            console.log(data_json)
            if(data_json[0].Status == 'Error'){
                return res.status(400).send("Invalid pincode")
            }
            const PostOffice = data_json[0].PostOffice[0]
    
            const response = {
                city : PostOffice.District,
                state : PostOffice.State
            }
            console.log(data_json)
            console.log(PostOffice)
            res.status(200).send(response)
        }
        catch(err){
            res.status(400).send("Invalid pincode")
            console.error(err)
        }
        // const city = data[0].PostOffice[0]
    }
    else{
        res.status(400).send("Invalid request")
    }
    
}

export {get_city_state}