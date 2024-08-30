import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  // CHECKING FOR TITLE AND DESCRIPTION
  if ([title, description].some((field) => field?.trim() === "")) {
    {
      throw new ApiError(400, "All fields are required.");
    }
  }
  // CHECKING FOR THE THUMBNAIL AND VIDEO FILE
  let thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  let videoLocalPath = req.files?.videoFile[0]?.path;

  if (!thumbnailLocalPath || !videoLocalPath) {
    throw new ApiError(400, "Both thumbnail and video files are required.");
  }
  // UPLOAD THUMBNAIL AND VIDEO TO CLOUDINARY
  const thumbnailUploadResponse = await uploadOnCloudinary(thumbnailLocalPath);
  const videoUploadResponse = await uploadOnCloudinary(videoLocalPath);

  if (!thumbnailUploadResponse || !videoUploadResponse) {
    throw new ApiError(400, "Unable to upload the files. Please try again!");
  }

  // RETURNING THE API RESPONSE
  const video = await Video.create({
    videoFile: videoUploadResponse.url,
    thumbnail: thumbnailUploadResponse.url,
    title,
    description,
    duration: videoUploadResponse.duration,
    owner: req.user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
