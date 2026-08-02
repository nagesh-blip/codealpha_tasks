"""
Handles account creation, login, and logout.

The frontend calls these endpoints with fetch(), receives a token back,
and stores that token in localStorage. Every future request sends that
token in the "Authorization: Token <token>" header.
"""

from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Profile
from .serializers import RegisterSerializer


def get_or_create_profile(user):
    """Every user should have a Profile. This makes sure one always exists."""
    profile, _created = Profile.objects.get_or_create(user=user)
    return profile


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _created = Token.objects.get_or_create(user=user)
        return Response(
            {'token': token.key, 'username': user.username},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '')
    password = request.data.get('password', '')

    if not username or not password:
        return Response(
            {'error': 'Please enter a username and password.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)
    if user is None:
        return Response(
            {'error': 'Invalid username or password.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    get_or_create_profile(user)
    token, _created = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'message': 'Logged out successfully.'})
