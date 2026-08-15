from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Comment, Project, Task
from .permissions import IsProjectMember
from .serializers import (
    AddMemberSerializer,
    CommentSerializer,
    ProfileSerializer,
    ProjectSerializer,
    RegisterSerializer,
    TaskSerializer,
    UserSerializer,
)


# ---------------------------------------------------------------------------
# Authentication & profile
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """Create a new account and immediately return JWT tokens for it."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginSerializer(TokenObtainPairSerializer):
    """Adds the logged-in user's profile to the standard token response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    """View or update the logged-in user's own profile."""
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

class ProjectListCreateView(generics.ListCreateAPIView):
    """List every project the user belongs to, or create a new one."""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(members=self.request.user).distinct()

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        project.members.add(self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve a project, or (owner-only) update/delete it."""
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsProjectMember]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ('PUT', 'PATCH', 'DELETE') and obj.owner_id != request.user.id:
            self.permission_denied(
                request, message='Only the project owner can edit or delete this project.'
            )


class ProjectMembersView(APIView):
    """List a project's members, or (owner-only) add a new one by username."""
    permission_classes = [IsAuthenticated]

    def _get_project(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        if not project.members.filter(id=request.user.id).exists():
            raise PermissionDenied('You do not have access to this project.')
        return project

    def get(self, request, pk):
        project = self._get_project(request, pk)
        return Response(UserSerializer(project.members.all(), many=True).data)

    def post(self, request, pk):
        project = self._get_project(request, pk)
        if project.owner_id != request.user.id:
            raise PermissionDenied('Only the project owner can add members.')
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project.members.add(serializer.user)
        return Response(
            UserSerializer(project.members.all(), many=True).data,
            status=status.HTTP_201_CREATED,
        )


class ProjectMemberDetailView(APIView):
    """Owner-only: remove a member from a project."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, user_id):
        project = get_object_or_404(Project, pk=pk)
        if project.owner_id != request.user.id:
            raise PermissionDenied('Only the project owner can remove members.')
        if int(user_id) == project.owner_id:
            return Response(
                {'detail': 'The project owner cannot be removed from the project.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        member = get_object_or_404(User, pk=user_id)
        project.members.remove(member)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

class TaskListCreateView(generics.ListCreateAPIView):
    """List the tasks on a project's board, or add a new task to it."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_project(self):
        project = get_object_or_404(Project, pk=self.kwargs['project_id'])
        if not project.members.filter(id=self.request.user.id).exists():
            raise PermissionDenied('You do not have access to this project.')
        return project

    def get_queryset(self):
        queryset = self.get_project().tasks.all()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['project'] = self.get_project()
        return context

    def perform_create(self, serializer):
        serializer.save(project=self.get_project(), created_by=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a single task."""
    queryset = Task.objects.select_related('project', 'assigned_to', 'created_by')
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        task = Task.objects.filter(pk=self.kwargs.get('pk')).select_related('project').first()
        if task:
            context['project'] = task.project
        return context

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if not obj.project.members.filter(id=request.user.id).exists():
            self.permission_denied(request, message='You do not have access to this task.')
        if request.method == 'DELETE' and request.user.id not in (
            obj.created_by_id, obj.project.owner_id
        ):
            self.permission_denied(
                request,
                message='Only the task creator or the project owner can delete this task.',
            )


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class CommentListCreateView(generics.ListCreateAPIView):
    """List the comments on a task, or add a new one."""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_task(self):
        task = get_object_or_404(Task, pk=self.kwargs['task_id'])
        if not task.project.members.filter(id=self.request.user.id).exists():
            raise PermissionDenied('You do not have access to this task.')
        return task

    def get_queryset(self):
        return self.get_task().comments.all()

    def perform_create(self, serializer):
        serializer.save(task=self.get_task(), user=self.request.user)


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve a comment, or (author-only) edit/delete it."""
    queryset = Comment.objects.select_related('task__project', 'user')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if not obj.task.project.members.filter(id=request.user.id).exists():
            self.permission_denied(request, message='You do not have access to this comment.')
        if request.method in ('PUT', 'PATCH', 'DELETE') and obj.user_id != request.user.id:
            self.permission_denied(
                request, message='You can only edit or delete your own comments.'
            )
