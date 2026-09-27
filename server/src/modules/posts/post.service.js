import { Post } from './post.model.js';
import { PostComment } from './postComment.model.js';
import { PostLike } from './postLike.model.js';
import { PostSave } from './postSave.model.js';
import { User } from '../users/user.model.js';
import { ProfessionalIdentity } from '../profiles/professionalIdentity.model.js';
import { POST_STATE, COMMENT_STATE, APP_EVENT } from '../../config/constants.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors.js';
import { eventBus } from '../../events/eventBus.js';
import { filterToCardActive } from '../cards/cardGate.js';

/**
 * Helper to enrich an array of posts with isLiked, isSaved, and author's primary profession.
 */
async function enrichPosts(posts, viewerId) {
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p._id);
  const authorIds = [...new Set(posts.map((p) => p.authorId?._id?.toString() || p.authorId?.toString()).filter(Boolean))];

  // Fetch primary professions for authors
  const primaryIdentities = await ProfessionalIdentity.find({
    userId: { $in: authorIds },
    isPrimary: true,
  }).lean();

  const authorProfessionMap = {};
  for (const pi of primaryIdentities) {
    authorProfessionMap[pi.userId.toString()] = pi.customTitle;
  }

  // Fetch viewer like states
  const viewerLikes = viewerId
    ? await PostLike.find({ postId: { $in: postIds }, userId: viewerId }).select('postId').lean()
    : [];
  const likedPostIdSet = new Set(viewerLikes.map((l) => l.postId.toString()));

  // Fetch viewer save states
  const viewerSaves = viewerId
    ? await PostSave.find({ postId: { $in: postIds }, userId: viewerId }).select('postId').lean()
    : [];
  const savedPostIdSet = new Set(viewerSaves.map((s) => s.postId.toString()));

  return posts.map((post) => {
    const postObj = post.toObject ? post.toObject() : { ...post };
    const authorIdStr = postObj.authorId?._id?.toString() || postObj.authorId?.toString();
    const primaryProfession = authorIdStr ? authorProfessionMap[authorIdStr] || null : null;

    if (postObj.authorId && typeof postObj.authorId === 'object') {
      postObj.author = {
        _id: postObj.authorId._id,
        displayName: postObj.authorId.displayName,
        username: postObj.authorId.username,
        avatarUrl: postObj.authorId.avatarUrl,
        primaryProfession,
      };
      delete postObj.authorId;
    }

    postObj.isLiked = likedPostIdSet.has(postObj._id.toString());
    postObj.isSaved = savedPostIdSet.has(postObj._id.toString());
    return postObj;
  });
}

/**
 * Create a new post.
 */
export async function createPost(userId, data) {
  const post = await Post.create({
    authorId: userId,
    content: data.content || '',
    media: data.media || [],
    visibility: data.visibility || 'PUBLIC',
    state: POST_STATE.ACTIVE,
  });

  const populated = await Post.findById(post._id)
    .populate('authorId', 'displayName username avatarUrl')
    .lean();

  const [enriched] = await enrichPosts([populated], userId);
  return enriched;
}

/**
 * Get feed of posts (all, my, saved, archived, or by author).
 */
export async function getFeed(viewerId, { page = 1, limit = 20, filter = 'all', authorUsername = null } = {}) {
  const skip = (page - 1) * limit;
  let query = { state: POST_STATE.ACTIVE };

  if (filter === 'saved') {
    if (!viewerId) {
      throw new ForbiddenError('Sign in required to view saved posts');
    }
    const saves = await PostSave.find({ userId: viewerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('postId')
      .lean();

    const postIds = saves.map((s) => s.postId);
    const total = await PostSave.countDocuments({ userId: viewerId });

    const rawPosts = await Post.find({ _id: { $in: postIds }, state: { $ne: POST_STATE.DELETED } })
      .populate('authorId', 'displayName username avatarUrl')
      .lean();

    // Preserve order of saves
    const postMap = new Map(rawPosts.map((p) => [p._id.toString(), p]));
    const ordered = postIds.map((id) => postMap.get(id.toString())).filter(Boolean);

    const posts = await enrichPosts(ordered, viewerId);
    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  if (filter === 'archived') {
    if (!viewerId) {
      throw new ForbiddenError('Sign in required to view archived posts');
    }
    query = { authorId: viewerId, state: POST_STATE.ARCHIVED };
  } else if (filter === 'my') {
    if (!viewerId) {
      throw new ForbiddenError('Sign in required to view your posts');
    }
    query = { authorId: viewerId, state: POST_STATE.ACTIVE };
  } else if (authorUsername) {
    const author = await User.findOne({ username: authorUsername.toLowerCase() }).select('_id').lean();
    if (!author) {
      throw new NotFoundError('User not found');
    }
    // Card-gate: do not reveal posts from users without an active card
    const activeSet = await filterToCardActive([author._id]);
    if (!activeSet.has(author._id.toString())) {
      throw new NotFoundError('User not found');
    }
    query = { authorId: author._id, state: POST_STATE.ACTIVE };
  }

  const [rawPosts, total] = await Promise.all([
    Post.find(query)
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'displayName username avatarUrl')
      .lean(),
    Post.countDocuments(query),
  ]);

  // Card-gate: for public/all feeds and per-author feeds, suppress posts from
  // authors who have not yet activated a physical card.
  // 'my' and 'archived' filters are owner-only views — no gating needed.
  let gatedPosts = rawPosts;
  if (filter !== 'my' && filter !== 'archived') {
    const authorIds = [...new Set(
      rawPosts
        .map((p) => p.authorId?._id?.toString() || p.authorId?.toString())
        .filter(Boolean),
    )];
    if (authorIds.length > 0) {
      const cardActiveSet = await filterToCardActive(authorIds);
      gatedPosts = rawPosts.filter((p) => {
        const aid = p.authorId?._id?.toString() || p.authorId?.toString();
        return aid && cardActiveSet.has(aid);
      });
    }
  }

  const posts = await enrichPosts(gatedPosts, viewerId);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get a single post by ID.
 */
export async function getPostById(postId, viewerId) {
  const post = await Post.findById(postId)
    .populate('authorId', 'displayName username avatarUrl')
    .lean();

  if (!post || post.state === POST_STATE.DELETED) {
    throw new NotFoundError('Post not found');
  }

  if (post.state === POST_STATE.ARCHIVED && (!viewerId || post.authorId._id.toString() !== viewerId.toString())) {
    throw new NotFoundError('Post is archived');
  }

  // Card-gate: do not serve posts from users who haven't activated a physical card.
  // Exception: the post owner can always see their own posts.
  const authorId = post.authorId?._id?.toString() || post.authorId?.toString();
  if (!viewerId || viewerId.toString() !== authorId) {
    const activeSet = await filterToCardActive([authorId]);
    if (!activeSet.has(authorId)) {
      throw new NotFoundError('Post not found');
    }
  }

  const [enriched] = await enrichPosts([post], viewerId);
  return enriched;
}

/**
 * Update a post's content (owner only).
 */
export async function updatePost(postId, userId, data) {
  const post = await Post.findById(postId);
  if (!post || post.state === POST_STATE.DELETED) {
    throw new NotFoundError('Post not found');
  }

  if (post.authorId.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only edit your own posts');
  }

  post.content = data.content;
  post.editedAt = new Date();
  await post.save();

  const populated = await Post.findById(post._id)
    .populate('authorId', 'displayName username avatarUrl')
    .lean();

  const [enriched] = await enrichPosts([populated], userId);
  return enriched;
}

/**
 * Delete a post (owner or admin).
 */
export async function deletePost(postId, userId, userRole) {
  const post = await Post.findById(postId);
  if (!post || post.state === POST_STATE.DELETED) {
    throw new NotFoundError('Post not found');
  }

  const isOwner = post.authorId.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You cannot delete this post');
  }

  post.state = POST_STATE.DELETED;
  await post.save();

  // Cascade cleanup likes & saves
  await Promise.all([
    PostLike.deleteMany({ postId: post._id }),
    PostSave.deleteMany({ postId: post._id }),
  ]);

  return { message: 'Post deleted successfully' };
}

/**
 * Toggle archive/hide status of a post (owner only).
 */
export async function toggleArchivePost(postId, userId) {
  const post = await Post.findById(postId);
  if (!post || post.state === POST_STATE.DELETED) {
    throw new NotFoundError('Post not found');
  }

  if (post.authorId.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only archive your own posts');
  }

  post.state = post.state === POST_STATE.ARCHIVED ? POST_STATE.ACTIVE : POST_STATE.ARCHIVED;
  await post.save();

  return {
    state: post.state,
    isArchived: post.state === POST_STATE.ARCHIVED,
  };
}

/**
 * Toggle like on a post.
 */
export async function toggleLikePost(postId, userId) {
  const post = await Post.findById(postId);
  if (!post || post.state !== POST_STATE.ACTIVE) {
    throw new NotFoundError('Post not found');
  }

  const existingLike = await PostLike.findOne({ postId, userId });

  if (existingLike) {
    await PostLike.deleteOne({ _id: existingLike._id });
    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();
    return { isLiked: false, likesCount: post.likesCount };
  }

  await PostLike.create({ postId, userId });
  post.likesCount += 1;
  await post.save();

  if (post.authorId && post.authorId.toString() !== userId.toString()) {
    eventBus.publish(APP_EVENT.POST_LIKED, {
      postId: post._id.toString(),
      authorId: post.authorId.toString(),
      likerId: userId.toString(),
    });
  }

  return { isLiked: true, likesCount: post.likesCount };
}

/**
 * Toggle save / bookmark on a post.
 */
export async function toggleSavePost(postId, userId) {
  const post = await Post.findById(postId);
  if (!post || post.state === POST_STATE.DELETED) {
    throw new NotFoundError('Post not found');
  }

  const existingSave = await PostSave.findOne({ postId, userId });

  if (existingSave) {
    await PostSave.deleteOne({ _id: existingSave._id });
    post.savesCount = Math.max(0, post.savesCount - 1);
    await post.save();
    return { isSaved: false, savesCount: post.savesCount };
  }

  await PostSave.create({ postId, userId });
  post.savesCount += 1;
  await post.save();
  return { isSaved: true, savesCount: post.savesCount };
}

/**
 * Increment share counter.
 */
export async function incrementShare(postId) {
  const post = await Post.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } }, { new: true });
  if (!post) {
    throw new NotFoundError('Post not found');
  }
  return { sharesCount: post.sharesCount };
}

/**
 * Add a comment or reply to a post.
 */
export async function addComment(postId, userId, { content, parentId = null }) {
  const post = await Post.findById(postId);
  if (!post || post.state !== POST_STATE.ACTIVE) {
    throw new NotFoundError('Post not found');
  }

  if (parentId) {
    const parentComment = await PostComment.findById(parentId);
    if (!parentComment || parentComment.state !== COMMENT_STATE.ACTIVE) {
      throw new ValidationError('Parent comment does not exist or has been deleted');
    }
  }

  const comment = await PostComment.create({
    postId,
    authorId: userId,
    parentId: parentId || null,
    content,
    state: COMMENT_STATE.ACTIVE,
  });

  post.commentsCount += 1;
  await post.save();

  if (post.authorId && post.authorId.toString() !== userId.toString()) {
    eventBus.publish(APP_EVENT.POST_COMMENTED, {
      postId: post._id.toString(),
      authorId: post.authorId.toString(),
      commenterId: userId.toString(),
      content,
      parentId,
    });
  }

  const populated = await PostComment.findById(comment._id)
    .populate('authorId', 'displayName username avatarUrl')
    .lean();

  return populated;
}

/**
 * Get all comments for a post organized in hierarchical nested tree.
 */
export async function getPostComments(postId) {
  const post = await Post.findById(postId);
  if (!post || post.state === POST_STATE.DELETED) {
    throw new NotFoundError('Post not found');
  }

  const rawComments = await PostComment.find({
    postId,
    state: COMMENT_STATE.ACTIVE,
  })
    .sort({ createdAt: 1 })
    .populate('authorId', 'displayName username avatarUrl')
    .lean();

  // Fetch professions for all comment authors
  const authorIds = [...new Set(rawComments.map((c) => c.authorId?._id?.toString()).filter(Boolean))];
  const primaryIdentities = await ProfessionalIdentity.find({
    userId: { $in: authorIds },
    isPrimary: true,
  }).lean();

  const authorProfessionMap = {};
  for (const pi of primaryIdentities) {
    authorProfessionMap[pi.userId.toString()] = pi.customTitle;
  }

  // Attach author details
  const commentMap = new Map();
  const rootComments = [];

  for (const comment of rawComments) {
    const authorIdStr = comment.authorId?._id?.toString();
    const commentItem = {
      ...comment,
      author: comment.authorId
        ? {
            _id: comment.authorId._id,
            displayName: comment.authorId.displayName,
            username: comment.authorId.username,
            avatarUrl: comment.authorId.avatarUrl,
            primaryProfession: authorIdStr ? authorProfessionMap[authorIdStr] || null : null,
          }
        : null,
      replies: [],
    };
    delete commentItem.authorId;
    commentMap.set(commentItem._id.toString(), commentItem);
  }

  // Build tree
  for (const comment of commentMap.values()) {
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId.toString());
      if (parent) {
        parent.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  }

  return rootComments;
}

/**
 * Delete a comment (comment author, post author, or admin).
 */
export async function deleteComment(commentId, userId, userRole) {
  const comment = await PostComment.findById(commentId);
  if (!comment || comment.state === COMMENT_STATE.DELETED) {
    throw new NotFoundError('Comment not found');
  }

  const post = await Post.findById(comment.postId);
  const isCommentOwner = comment.authorId.toString() === userId.toString();
  const isPostOwner = post && post.authorId.toString() === userId.toString();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  if (!isCommentOwner && !isPostOwner && !isAdmin) {
    throw new ForbiddenError('You cannot delete this comment');
  }

  comment.state = COMMENT_STATE.DELETED;
  await comment.save();

  if (post && post.commentsCount > 0) {
    post.commentsCount -= 1;
    await post.save();
  }

  return { message: 'Comment deleted' };
}
