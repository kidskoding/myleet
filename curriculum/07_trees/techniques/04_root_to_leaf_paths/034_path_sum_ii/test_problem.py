from solution import path_sum_ii
from tree_node import TreeNode


def build_small_path_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4), right=TreeNode(5)),
        right=TreeNode(3, left=TreeNode(6), right=TreeNode(7)),
    )


def build_path_sum_ii_tree() -> TreeNode:
    return TreeNode(
        5,
        left=TreeNode(4, left=TreeNode(11, left=TreeNode(7), right=TreeNode(2))),
        right=TreeNode(
            8,
            left=TreeNode(13),
            right=TreeNode(4, left=TreeNode(5), right=TreeNode(1)),
        ),
    )


def test_path_sum_ii_empty_tree():
    assert path_sum_ii(None, 0) == []


def test_path_sum_ii_single_valid_path():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert path_sum_ii(root, 6) == [[1, 2, 3]]


def test_path_sum_ii_multiple_paths():
    root = TreeNode(
        1,
        left=TreeNode(2, left=TreeNode(4)),
        right=TreeNode(3, right=TreeNode(3)),
    )

    assert sorted(path_sum_ii(root, 7)) == [[1, 2, 4], [1, 3, 3]]


def test_path_sum_ii_no_valid_path():
    root = build_small_path_tree()

    assert path_sum_ii(root, 100) == []


def test_path_sum_ii_leetcode_sample_tree():
    assert sorted(path_sum_ii(build_path_sum_ii_tree(), 22)) == [
        [5, 4, 11, 2],
        [5, 8, 4, 5],
    ]


def test_path_sum_ii_partial_path_does_not_count():
    root = TreeNode(1, left=TreeNode(2, left=TreeNode(3)))

    assert path_sum_ii(root, 3) == []


def test_path_sum_ii_handles_negative_values():
    root = TreeNode(1, left=TreeNode(-2, left=TreeNode(1)), right=TreeNode(-3))

    assert path_sum_ii(root, 0) == [[1, -2, 1]]
