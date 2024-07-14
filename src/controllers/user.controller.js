import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

export const registerUser = asyncHandler(async (req, res) => {
  // extract the details from the request
  console.log(req.body);
  const { username, email, fullName, password } = req.body;

  // validation of inputs
  // if (fullName === "")
  //   throw new ApiError((statusCode = 400), (message = "Full name is required"));
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "All fields are required.");

  // check exsiting user:  username and email
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser)
    throw new ApiError(
      409,
      "User with same email or username already exsists."
    );

  // check for images
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  // check for avatar
  if (!avatarLocalPath)
    throw new ApiError(400, "Avatar is needed. Please Upload.");

  // upload images to cloudinary,
  const avatarUploadResponse = await uploadOnCloudinary(avatarLocalPath);
  console.log(avatarUploadResponse);
  const coverImageUploadResponse =
    await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarUploadResponse)
    throw new ApiError(400, "Avatar is needed. Please Upload.");

  // create user object and store to db
  const userToRegister = await User.create({
    fullName,
    username,
    password,
    email,
    avatar: avatarUploadResponse.url,
    coverImage: coverImageUploadResponse?.url || "",
  });

  // check user creation
  // remove password and refresh token filed
  const confirmUserCreated = await User.findById(userToRegister._id).select(
    "-passowrd -refreshToken"
  );

  // return res
  if (!confirmUserCreated)
    throw new Error(
      500,
      " Something went wrong while registering user. Please try again"
    );
  return res
    .status(201)
    .json(
      new ApiResponse(200, confirmUserCreated, "User registered successfully")
    );
});
