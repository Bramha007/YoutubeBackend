import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  console.log(query, sortBy, sortType, userId);
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

  // CHECKING IF vedioID IS PRESENT AND IS VALID
  if (!videoId || videoId.trim() === "") {
    throw new ApiError(400, "No videoId was provided");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  // FINDING AND RETURNING THE VIDEO
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video found successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail

  // CHECKING IF vedioID IS PRESENT AND IS VALID
  if (!videoId || videoId.trim() === "") {
    throw new ApiError(400, "No videoId was provided");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const fieldsToUpdate = {};
  if (req.body?.title) fieldsToUpdate.title = req.body.title;
  if (req.body?.description) fieldsToUpdate.description = req.body.description;
  if (req.file) {
    const thumbnailLocalPath = req.file?.path;
    const thumbnailUploadResponse =
      await uploadOnCloudinary(thumbnailLocalPath);
    if (thumbnailUploadResponse)
      fieldsToUpdate.thumbnail = thumbnailUploadResponse.url;
    else throw new ApiError(400, "Thumbnail update failed");
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    throw new ApiError(400, "Atleast one fieldto update is required");
  }
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: fieldsToUpdate,
    },
    { new: true, runValidators: false }
  );
  if (!updatedVideo) throw new ApiError(404, "Video not found");
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Successfully updated video"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  // CHECKING IF vedioID IS PRESENT AND IS VALID
  if (!videoId || videoId.trim() === "") {
    throw new ApiError(400, "No videoId was provided");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
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
