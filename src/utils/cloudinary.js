import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (localFilePath) return null;
    // Upload file
    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    console.log(colors.green(`File has been uploaded: ${uploadResult.url}`));
    return uploadResult;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temp file as the upload has failed
    return null;
  }
};
