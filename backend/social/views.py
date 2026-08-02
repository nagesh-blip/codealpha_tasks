from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .authentication import get_or_create_profile
from .models import Comment, Follow, Like, Post
from .serializers import CommentSerializer, PostSerializer, ProfileSerializer


# ------------------------- PROFILES -------------------------

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def my_profile_view(request):
    """Get or update the logged-in user's own profile."""
    profile = get_or_create_profile(request.user)

    if request.method == 'GET':
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    # PUT: edit profile (bio and/or avatar image)
    bio = request.data.get('bio')
    avatar = request.data.get('avatar')

    if bio is not None:
        profile.bio = bio
    if avatar:
        profile.avatar = avatar

    profile.save()
    serializer = ProfileSerializer(profile, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request, username):
    """Get another user's public profile by username."""
    user = get_object_or_404(User, username=username)
    profile = get_or_create_profile(user)
    serializer = ProfileSerializer(profile, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users_view(request):
    """Search for users whose username contains the query string."""
    query = request.GET.get('q', '').strip()
    if not query:
        return Response([])

    users = User.objects.filter(username__icontains=query).exclude(id=request.user.id)[:20]
    results = [
        ProfileSerializer(get_or_create_profile(user), context={'request': request}).data
        for user in users
    ]
    return Response(results)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_toggle_view(request, username):
    """Follow a user if not already following them, otherwise unfollow."""
    target_user = get_object_or_404(User, username=username)

    if target_user.id == request.user.id:
        return Response(
            {'error': "You can't follow yourself."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    existing = Follow.objects.filter(follower=request.user, following=target_user).first()
    if existing:
        existing.delete()
        is_following = False
    else:
        Follow.objects.create(follower=request.user, following=target_user)
        is_following = True

    followers_count = Follow.objects.filter(following=target_user).count()
    return Response({'is_following': is_following, 'followers_count': followers_count})


# --------------------------- POSTS ---------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def posts_view(request):
    """GET: list all posts (or a single user's posts with ?username=).
    POST: create a new post for the logged-in user."""
    if request.method == 'GET':
        username = request.GET.get('username')
        if username:
            posts = Post.objects.filter(author__username=username)
        else:
            posts = Post.objects.all()
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)

    # POST: create a post
    caption = request.data.get('caption', '').strip()
    image = request.data.get('image')

    if not caption and not image:
        return Response(
            {'error': 'A post needs a caption or an image.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    post = Post.objects.create(author=request.user, caption=caption, image=image)
    serializer = PostSerializer(post, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_post_view(request, post_id):
    """Delete a post. Only the post's own author is allowed to do this."""
    post = get_object_or_404(Post, id=post_id)

    if post.author_id != request.user.id:
        return Response(
            {'error': 'You can only delete your own posts.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    post.delete()
    return Response({'message': 'Post deleted.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_toggle_view(request, post_id):
    """Like a post if not already liked, otherwise unlike it."""
    post = get_object_or_404(Post, id=post_id)

    existing = Like.objects.filter(post=post, user=request.user).first()
    if existing:
        existing.delete()
        is_liked = False
    else:
        Like.objects.create(post=post, user=request.user)
        is_liked = True

    return Response({'is_liked': is_liked, 'likes_count': post.likes.count()})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def comments_view(request, post_id):
    """GET: list comments on a post. POST: add a new comment to a post."""
    post = get_object_or_404(Post, id=post_id)

    if request.method == 'GET':
        comments = post.comments.all()
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    text = request.data.get('text', '').strip()
    if not text:
        return Response(
            {'error': 'A comment cannot be empty.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    comment = Comment.objects.create(post=post, author=request.user, text=text)
    serializer = CommentSerializer(comment, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)
