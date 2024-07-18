import { admin, db } from "../DB/firestore.js";
import dotenv from "dotenv";

dotenv.config();
// import { getStorage, ref, getDownloadURL } from 'firebase/storage'

const bucket = admin.storage().bucket();

//function to upload banner
/*
request url = http://localhost:8080/api/v1/banner/new_banner
method = POST
req.body =
{
    "bannerid": "1720100876121",
    "title": "New offer",
    "description": "description of offer"
}
    * req.headers.authorization = JWT token
*/






//In progress
async function upload_banner(req, res) {
    if(!req.body.bannerid){
        return res.status(400).send("banner id must be provided")
    }
    console.log(req.file);
    const snapshot = await db.collection(process.env.collectionBanner).doc(req.body.bannerid).get();
    if (snapshot.exists) {
        res.status(400).send("Banner already present")
    }
    else {
        if (req.file.mimetype == "image/jpeg" || req.file.mimetype == "image/jpg" || req.file.mimetype == "image/png") {
            try {
                const blob = bucket.file(`banners/${req.body.bannerid}`);
                const blobStream = blob.createWriteStream({
                    resumable: false,
                    metadata: {
                        contentType: req.file.mimetype,
                    },
                });

                blobStream.on("error", (err) => {
                    console.error("Upload error:", err);
                    res.status(500).send({ error: "Upload error" });
                });

                blobStream.on("finish", async () => {
                    await blob.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

                    const { bannerid, title, description } = req.body;
                    const data = {
                        bannerid,
                        title,
                        description,
                        date: Date.now(),
                        imageurl: publicUrl,
                    };

                    const banner = await db
                        .collection(process.env.collectionBanner)
                        .doc(req.body.bannerid)
                        .set(data);
                    res.status(200).send("Banner created successfully");
                });

                blobStream.end(req.file.buffer);
            } catch (error) {
                console.error("Upload error:", error);
                res.status(500).send({ error: "Upload error" });
            }
        } else {
            res.status(400).send("file type not supported");
            req.file.buffer = null;
            console.log(req.file.buffer);
        }
    }
}

//function to get all banner
/*
request url = http://localhost:8080/api/v1/banner/get_all_banner
method = GET
*/
async function get_all_banner(req, res){
    const banner_arr = []
    const banner = db.collection(process.env.collectionBanner);
    const snapshot = await banner.get();
    snapshot.forEach((doc) => {
        banner_arr.push(doc.data())
    })
    return(
        res.status(200).send(banner_arr)
    )
}
export { upload_banner, get_all_banner };
