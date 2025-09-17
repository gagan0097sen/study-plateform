import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloundinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken
        const refreshToken = user.generateRefreshToken
        // console.log(accessToken,refreshToken);
        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generationg refresh and access token ")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    console.log(req.body)
    // return false
    const {fullName,email,username,password} = req.body
    console.log("email ", email)

    if( 
        [fullName,email,username,password].some((field)=>{
            field?.trim() === ""
        })
    )
    {
        throw new ApiError(400,"All fields are required ")
    }

    const existedUser =await User.findOne({
        $or:[{username},{email}]
    }) 

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists ")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")   
    )
})

const loginUser = asyncHandler(async(req,res)=>{
    const {username,email,password} = req.body;

    if(!username && !email){
        throw new ApiError(400,"username or email is required ")
    }

    

    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"userdoes not exists ")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Username and email or password are invalid")
    }
    const {accessToken,refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedUser = await User.findById(user._id).select("-password -refreshtoken")

    const options = {
        httpOnly : true,
        secure : true
    }

    res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedUser,accessToken,refreshToken
            },
            "user logged In successfully"
        )
    )
})

const logOutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))

})

const refreshAccessToken = asyncHandler(async(req,res,next)=>{
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
    if(incomingRefreshToken){
        throw new ApiError(401,"unathorized error")
    }

    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(404,"Invalid refresh token ")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(404,"Refresh token  is expired or used ")
    }

     const options = {
        httpOnly:true,
        secure:true
     }

    const {accessToken,newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
     return res.status(200)
     .cookie("accessToken ",accessToken,options)
     .cookie("newRefreshToken ",newRefreshToken,options)
     .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "accesstoken refreshed successfully"
        )
     )
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken
}