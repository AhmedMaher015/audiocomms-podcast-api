const Follow = require('../models/followModel')
const User = require('../models/userModel')
const AppError = require('../utils/appError')
const APIFeatures = require('../utils/apiFeatures')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory')
const { StatusCodes } = require('http-status-codes')

exports.getUserFollowers = catchAsync(async (req, res, next) => {
    const featuresBeforePagination = new APIFeatures(
        Follow.find({ following: req.params.id }),
        req.query
    ).filter()

    const features = new APIFeatures(
        Follow.find({ following: req.params.id }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()

    let following = await features.query
        .select('-following')
        .populate({
            path: 'follower',
            select: 'name photo',
        })
        .lean()

    const docsCount = await Follow.countDocuments(
        featuresBeforePagination.query
    )

    await User.updateOne({ _id: req.params.id }, { followers: docsCount })

    res.status(StatusCodes.OK).json({
        status: 'success',
        docsCount,
        results: following.length,
        data: following,
    })
})

exports.getUserFollowing = catchAsync(async (req, res, next) => {
    const featuresBeforePagination = new APIFeatures(
        Follow.find({ follower: req.params.id }),
        req.query
    ).filter()

    const features = new APIFeatures(
        Follow.find({ follower: req.params.id }),
        req.query
    )
        .filter()
        .sort()
        .limitFields()
        .paginate()

    let follower = await features.query
        .select('-follower')
        .populate({
            path: 'following',
            select: 'name photo',
        })
        .lean()

    const docsCount = await Follow.countDocuments(
        featuresBeforePagination.query
    )

    await User.updateOne({ _id: req.params.id }, { follower: docsCount })

    res.status(StatusCodes.OK).json({
        status: 'success',
        docsCount,
        results: follower.length,
        data: follower,
    })
})

exports.followUser = catchAsync(async (req, res, next) => {
    const followExists = await Follow.findOne({
        follower: req.user.id,
        following: req.params.id,
    }).lean()

    if (followExists) {
        return next(
            new AppError(
                'you already follow this user',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const userExists = await User.findById(req.params.id).lean()

    if (!userExists) {
        return next(
            new AppError(
                'there is no user with that ID',
                StatusCodes.BAD_REQUEST
            )
        )
    }

    const follow = await Follow.create({
        follower: req.user.id,
        following: req.params.id,
    })

    if (follow) {
        await User.updateOne({ _id: req.params.id }, { $inc: { followers: 1 } })

        await User.updateOne({ _id: req.user.id }, { $inc: { following: 1 } })
    }

    res.status(StatusCodes.CREATED).json({
        status: 'success',
        message: 'user followed!',
    })
})

exports.unFollowUser = catchAsync(async (req, res, next) => {
    const data = await Follow.findOneAndRemove({
        follower: req.user.id,
        following: req.params.id,
    })

    if (!data) {
        return next(
            new AppError('You did not follow that user'),
            StatusCodes.NOT_FOUND
        )
    }

    await User.updateOne({ _id: req.params.id }, { $inc: { followers: -1 } })

    await User.updateOne({ _id: req.user.id }, { $inc: { following: -1 } })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'user unfollowed!',
    })
})
