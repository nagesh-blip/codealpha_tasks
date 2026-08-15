from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Comment, Project, Task


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'username', 'date_joined']


class AddMemberSerializer(serializers.Serializer):
    username = serializers.CharField()

    def validate_username(self, value):
        try:
            user = User.objects.get(username__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found with that username.')
        self.user = user
        return value


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'owner', 'members',
            'task_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'members', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        return obj.tasks.count()

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Project name cannot be empty.')
        return value


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assigned_to',
        write_only=True,
        required=False,
        allow_null=True,
    )
    created_by = UserSerializer(read_only=True)
    project = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description', 'assigned_to', 'assigned_to_id',
            'status', 'priority', 'due_date', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project', 'created_by', 'created_at', 'updated_at']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Task title cannot be empty.')
        return value

    def validate_assigned_to_id(self, value):
        project = self.context.get('project')
        if project and value and not project.members.filter(id=value.id).exists():
            raise serializers.ValidationError(
                'This user must be a member of the project before being assigned a task.'
            )
        return value


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    task = serializers.PrimaryKeyRelatedField(read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'task', 'user', 'content', 'can_edit', 'created_at', 'updated_at']
        read_only_fields = ['id', 'task', 'user', 'created_at', 'updated_at']

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError('Comment cannot be empty.')
        return value

    def get_can_edit(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and request.user.id == obj.user_id)
