from binary_tree import build_tree_from_level_order
from solution import distance_k


def test_distance_k_normal():
    root = build_tree_from_level_order([3, 5, 1, 6, 2, 0, 8, None, None, 7, 4])
    assert sorted(distance_k(root, root.left, 2)) == [1, 4, 7]


def test_distance_k_zero_is_the_target():
    root = build_tree_from_level_order([1])
    assert distance_k(root, root, 0) == [1]


def test_distance_k_beyond_tree():
    root = build_tree_from_level_order([1])
    assert distance_k(root, root, 3) == []
