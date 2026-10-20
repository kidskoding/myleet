from collections import deque

from solution import TreeNode, min_camera_cover


def build_tree(values: list[int | None]) -> TreeNode | None:
    if not values:
        return None
    root = TreeNode(values[0])
    queue = deque([root])
    index = 1
    while queue and index < len(values):
        node = queue.popleft()
        if index < len(values) and values[index] is not None:
            node.left = TreeNode(values[index])
            queue.append(node.left)
        index += 1
        if index < len(values) and values[index] is not None:
            node.right = TreeNode(values[index])
            queue.append(node.right)
        index += 1
    return root


def test_min_camera_cover_one_camera():
    assert min_camera_cover(build_tree([0, 0, None, 0, 0])) == 1


def test_min_camera_cover_two_cameras():
    assert min_camera_cover(build_tree([0, 0, None, 0, None, 0, None, None, 0])) == 2
