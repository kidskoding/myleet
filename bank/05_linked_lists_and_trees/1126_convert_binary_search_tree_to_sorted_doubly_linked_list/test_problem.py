from binary_tree import build_tree_from_level_order
from solution import tree_to_doubly_list


def walk(head, step, limit=100):
    values = [head.val]
    node = step(head)
    while node is not head and len(values) <= limit:
        values.append(node.val)
        node = step(node)
    return values


def forward(head):
    return walk(head, lambda node: node.right)


def backward(head):
    return walk(head.left, lambda node: node.left)


def test_tree_to_doubly_list_empty():
    assert tree_to_doubly_list(None) is None


def test_tree_to_doubly_list_single_node_points_to_itself():
    root = build_tree_from_level_order([7])
    head = tree_to_doubly_list(root)
    assert head is root
    assert head.left is head
    assert head.right is head


def test_tree_to_doubly_list_five_nodes():
    head = tree_to_doubly_list(build_tree_from_level_order([4, 2, 5, 1, 3]))
    assert forward(head) == [1, 2, 3, 4, 5]
    assert backward(head) == [5, 4, 3, 2, 1]


def test_tree_to_doubly_list_three_nodes():
    head = tree_to_doubly_list(build_tree_from_level_order([2, 1, 3]))
    assert forward(head) == [1, 2, 3]
    assert backward(head) == [3, 2, 1]


def test_tree_to_doubly_list_reuses_tree_nodes():
    root = build_tree_from_level_order([2, 1, 3])
    smallest = root.left
    largest = root.right
    head = tree_to_doubly_list(root)
    assert head is smallest
    assert head.left is largest
    assert largest.right is smallest
    assert head.right is root


def test_tree_to_doubly_list_left_skewed():
    head = tree_to_doubly_list(build_tree_from_level_order([5, 4, None, 3, None, 1]))
    assert forward(head) == [1, 3, 4, 5]
    assert backward(head) == [5, 4, 3, 1]
