from django.urls import path

from . import authentication, views

urlpatterns = [
    # Auth
    path('auth/register/', authentication.register_view),
    path('auth/login/', authentication.login_view),
    path('auth/logout/', authentication.logout_view),

    # Profiles
    path('users/me/', views.my_profile_view),
    path('users/search/', views.search_users_view),
    path('users/<str:username>/', views.user_profile_view),
    path('users/<str:username>/follow/', views.follow_toggle_view),

    # Posts
    path('posts/', views.posts_view),
    path('posts/<int:post_id>/', views.delete_post_view),
    path('posts/<int:post_id>/like/', views.like_toggle_view),
    path('posts/<int:post_id>/comments/', views.comments_view),
]
