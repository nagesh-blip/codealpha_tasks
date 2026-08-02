from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Comment, Follow, Post, Profile


class RegisterSerializer(serializers.Serializer):
    """Validates data used to create a brand new user account."""

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        Profile.objects.create(user=user)
        return user


class ProfileSerializer(serializers.Serializer):
    """Public profile information for a single user."""

    id = serializers.IntegerField(source='user.id')
    username = serializers.CharField(source='user.username')
    bio = serializers.CharField()
    avatar = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    posts_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_own_profile = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_followers_count(self, obj):
        return Follow.objects.filter(following=obj.user).count()

    def get_following_count(self, obj):
        return Follow.objects.filter(follower=obj.user).count()

    def get_posts_count(self, obj):
        return obj.user.posts.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj.user).exists()
        return False

    def get_is_own_profile(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.id == obj.user.id
        return False


class CommentSerializer(serializers.ModelSerializer):
    """A single comment, including the commenter's name and avatar."""

    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'author_username', 'author_avatar', 'text', 'created_at']
        read_only_fields = ['id', 'author', 'created_at', 'post']

    def get_author_avatar(self, obj):
        request = self.context.get('request')
        profile = getattr(obj.author, 'profile', None)
        if profile and profile.avatar and request:
            return request.build_absolute_uri(profile.avatar.url)
        return None


class PostSerializer(serializers.ModelSerializer):
    """A single post, including author info, image, and like/comment counts."""

    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_own_post = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_username', 'author_avatar', 'caption',
            'image', 'created_at', 'likes_count', 'comments_count',
            'is_liked', 'is_own_post',
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_avatar(self, obj):
        request = self.context.get('request')
        profile = getattr(obj.author, 'profile', None)
        if profile and profile.avatar and request:
            return request.build_absolute_uri(profile.avatar.url)
        return None

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_is_own_post(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author_id == request.user.id
        return False
