from rest_framework.permissions import BasePermission


class IsProjectMember(BasePermission):
    """
    Grants access only to users who are a member (owners are always
    added as members) of the related project.
    """
    message = 'You do not have access to this project.'

    def has_object_permission(self, request, view, obj):
        project = obj if hasattr(obj, 'members') else obj.project
        return project.members.filter(id=request.user.id).exists()


class IsCommentOwner(BasePermission):
    """Only the person who wrote a comment may edit or delete it."""
    message = 'You can only edit or delete your own comments.'

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id
