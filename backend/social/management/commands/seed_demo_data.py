"""
Creates a handful of demo users, posts, follows, likes, and comments
so you can try out the app right away without registering by hand.

Usage:
    python manage.py seed_demo_data

Demo accounts (all use the password below):
    alice / demopass123
    bob   / demopass123
    carla / demopass123
"""

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from social.models import Comment, Follow, Like, Post, Profile

DEMO_PASSWORD = 'demopass123'

DEMO_USERS = [
    {'username': 'alice', 'bio': 'Coffee, code, and cats. ☕️'},
    {'username': 'bob', 'bio': 'Weekend hiker. Full-time dev.'},
    {'username': 'carla', 'bio': 'Photography is my love language. 📸'},
]

DEMO_POSTS = [
    ('alice', "Just shipped my first Django project! 🎉"),
    ('alice', "Anyone have good recipe recommendations for a rainy day?"),
    ('bob', "Made it to the summit this morning. Worth the 5am wake-up."),
    ('carla', "New camera lens arrived today, can't wait to test it out."),
]

DEMO_COMMENTS = [
    ('bob', 0, "Congrats! That's awesome."),
    ('carla', 0, "Well deserved 👏"),
    ('alice', 2, "Wow, that view!"),
]


class Command(BaseCommand):
    help = 'Seeds the database with demo users, posts, follows, likes, and comments.'

    def handle(self, *args, **options):
        users_by_username = {}

        for user_data in DEMO_USERS:
            user, created = User.objects.get_or_create(username=user_data['username'])
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user '{user.username}'"))
            else:
                self.stdout.write(f"User '{user.username}' already exists, skipping creation.")

            Profile.objects.update_or_create(
                user=user,
                defaults={'bio': user_data['bio']}
            )
            users_by_username[user.username] = user

        # Everyone follows everyone else
        for follower in users_by_username.values():
            for following in users_by_username.values():
                if follower != following:
                    Follow.objects.get_or_create(follower=follower, following=following)

        # Create posts
        created_posts = []
        for username, caption in DEMO_POSTS:
            post, created = Post.objects.get_or_create(
                author=users_by_username[username],
                caption=caption,
            )
            created_posts.append(post)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created post by '{username}'"))

        # Add a few likes
        for post in created_posts:
            for user in users_by_username.values():
                if user != post.author:
                    Like.objects.get_or_create(post=post, user=user)

        # Add comments
        for username, post_index, text in DEMO_COMMENTS:
            if post_index < len(created_posts):
                Comment.objects.get_or_create(
                    post=created_posts[post_index],
                    author=users_by_username[username],
                    text=text,
                )

        self.stdout.write(self.style.SUCCESS('\nDone! Demo accounts (all share one password):'))
        for username in users_by_username:
            self.stdout.write(f"  {username} / {DEMO_PASSWORD}")
