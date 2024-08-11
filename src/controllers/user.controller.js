import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import colors from "colors/safe.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// USER REGISTERATION
export const registerUser = asyncHandler(async (req, res) => {
  // extract the details from the request
  const { username, email, fullName, password } = req.body;

  // validation of inputs
  // if (fullName === "")
  //   throw new ApiError((statusCode = 400), (message = "Full name is required"));
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

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
  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  // check for avatar
  if (!avatarLocalPath)
    throw new ApiError(400, "Avatar is needed. Please Upload.");

  // upload images to cloudinary,
  const avatarUploadResponse = await uploadOnCloudinary(avatarLocalPath);
  const coverImageUploadResponse =
    await uploadOnCloudinary(coverImageLocalPath);

  if (!avatarUploadResponse)
    throw new ApiError(400, "Unable to upload the Avatar. Please try again!");

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
    "-password -refreshToken"
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

// USER LOGIN
export const loginUser = asyncHandler(async (req, res) => {
  // extract information
  const { username, email, password } = req.body;
  // validate inputs
  if (!username && !email) {
    throw new ApiError(400, "Please provide either email or username");
  }
  if (!password) {
    throw new ApiError(400, "Please provide password");
  }
  // extract user and validate
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!existedUser) {
    throw new ApiError(404, "No valid user found");
  }
  // if user exisits with given username or email => validate password
  const validPassword = await existedUser.isPasswordCorrect(password);
  if (!validPassword) {
    throw new ApiError(404, "No valid user found");
  }
  // if successfull generate access and refresh token

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existedUser._id
  );

  // store the refresh token in the db => stored in the db using fnc generateAccessAndRefreshToken
  // provide the user access token in the cookiee
  const loggedInUser = await User.findById(existedUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully!"
      )
    );
});

// USER LOGOUT
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successful"));
});

export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incommingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incommingRefreshToken) {
    throw new ApiError(401, "Unauthorized Access");
  }
  try {
    const decodedRefreshToken = await jwt.verify(
      incommingRefreshToken,
      process.evn.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedRefreshToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or User");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token Refreshed!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Ïnvalid Refresh Token");
  }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect Old Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password Updated"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

export const updateUserAccount = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, { user: updatedUser }, "User details updated"));
});

export const updateUserAvavtar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is missing");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, { user: updatedUser }, "User Avatar updated"));
});

export const updateUserCover = asyncHandler(async (req, res) => {
  const coverImgLocalPath = req.file?.path;
  if (!coverImgLocalPath) {
    throw new ApiError(400, "Cover Image File is missing");
  }
  const coverImg = await uploadOnCloudinary(coverImgLocalPath);

  if (!coverImg) {
    throw new ApiError(400, "Cover Image upload failed");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImg.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, { user: updatedUser }, "User Avatar updated"));
});
