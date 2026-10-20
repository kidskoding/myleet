from collections import deque

from tree_node import TreeNode


def get_directions(root: TreeNode | None, start_value: int, dest_value: int) -> str:
    if root is None:
        return ""
    parent: dict[int, tuple[int, str]] = {}
    queue = deque([root])
    while queue:
        node = queue.popleft()
        for child, step in ((node.left, "L"), (node.right, "R")):
            if child is not None:
                parent[child.val] = (node.val, step)
                queue.append(child)

    def path_from_root(value: int) -> str:
        steps: list[str] = []
        while value in parent:
            value, step = parent[value]
            steps.append(step)
        return "".join(reversed(steps))

    to_start = path_from_root(start_value)
    to_dest = path_from_root(dest_value)
    common = 0
    while common < min(len(to_start), len(to_dest)) and to_start[common] == to_dest[common]:
        common += 1
    return "U" * (len(to_start) - common) + to_dest[common:]
