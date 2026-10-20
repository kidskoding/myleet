from collections import deque


def validate_binary_tree_nodes(n: int, left_child: list[int], right_child: list[int]) -> bool:
    parents = [0] * n
    for child in left_child + right_child:
        if child != -1:
            parents[child] += 1
            if parents[child] > 1:
                return False
    roots = [i for i in range(n) if parents[i] == 0]
    if len(roots) != 1:
        return False
    seen = {roots[0]}
    queue = deque([roots[0]])
    while queue:
        node = queue.popleft()
        for child in (left_child[node], right_child[node]):
            if child != -1 and child not in seen:
                seen.add(child)
                queue.append(child)
    return len(seen) == n
