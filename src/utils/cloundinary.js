import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
        cloud_name: process.env.CLOUNDINARY_CLOUND_NAME, 
        api_key: process.env.CLOUNDINARY_API_KEY, 
        api_secret: process.env.CLOUNDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });


   const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath ) return null
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        console.log("file is uploaded on cloudinary ", response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
        console.log(error);
    }
   }
   
   export {uploadOnCloudinary}

    