import * as postService from './post.service.js';
import { sendSuccess } from '../../shared/response.js';

export async function createPostController(req, res, next) {
  try {
    const post = await postService.createPost(req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Post created successfully.',
      data: { post },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getFeedController(req, res, next) {
  try {
    const viewerId = req.user ? req.user.id : null;
    const result = await postService.getFeed(viewerId, req.query);
    return sendSuccess(res, {
      message: 'Feed retrieved.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getPostByIdController(req, res, next) {
  try {
    const viewerId = req.user ? req.user.id : null;
    const post = await postService.getPostById(req.params.id, viewerId);
    return sendSuccess(res, {
      message: 'Post retrieved.',
      data: { post },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updatePostController(req, res, next) {
  try {
    const post = await postService.updatePost(req.params.id, req.user.id, req.body);
    return sendSuccess(res, {
      message: 'Post updated successfully.',
      data: { post },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deletePostController(req, res, next) {
  try {
    const result = await postService.deletePost(req.params.id, req.user.id, req.user.role);
    return sendSuccess(res, {
      message: result.message,
    });
  } catch (err) {
    return next(err);
  }
}

export async function toggleArchivePostController(req, res, next) {
  try {
    const result = await postService.toggleArchivePost(req.params.id, req.user.id);
    return sendSuccess(res, {
      message: result.isArchived ? 'Post archived.' : 'Post restored to feed.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function toggleLikePostController(req, res, next) {
  try {
    const result = await postService.toggleLikePost(req.params.id, req.user.id);
    return sendSuccess(res, {
      message: result.isLiked ? 'Post liked.' : 'Post unliked.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function toggleSavePostController(req, res, next) {
  try {
    const result = await postService.toggleSavePost(req.params.id, req.user.id);
    return sendSuccess(res, {
      message: result.isSaved ? 'Post saved to bookmarks.' : 'Post removed from bookmarks.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function sharePostController(req, res, next) {
  try {
    const result = await postService.incrementShare(req.params.id);
    return sendSuccess(res, {
      message: 'Share recorded.',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

export async function addCommentController(req, res, next) {
  try {
    const comment = await postService.addComment(req.params.id, req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Comment added.',
      data: { comment },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getPostCommentsController(req, res, next) {
  try {
    const comments = await postService.getPostComments(req.params.id);
    return sendSuccess(res, {
      message: 'Comments retrieved.',
      data: { comments },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteCommentController(req, res, next) {
  try {
    const result = await postService.deleteComment(req.params.commentId, req.user.id, req.user.role);
    return sendSuccess(res, {
      message: result.message,
    });
  } catch (err) {
    return next(err);
  }
}
