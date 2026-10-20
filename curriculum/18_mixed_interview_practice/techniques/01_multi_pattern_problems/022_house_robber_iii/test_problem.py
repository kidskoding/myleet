from collections import deque

from solution import TreeNode, rob


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


def test_rob_skips_children():
    assert rob(build_tree([3, 2, 3, None, 3, None, 1])) == 7


def test_rob_takes_children_instead():
    assert rob(build_tree([3, 4, 5, 1, 3, None, 1])) == 9
