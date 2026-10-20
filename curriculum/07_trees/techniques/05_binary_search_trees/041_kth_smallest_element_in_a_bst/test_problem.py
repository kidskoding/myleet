from binary_tree import build_tree_from_level_order
from solution import kth_smallest


def test_kth_smallest_first():
    assert kth_smallest(build_tree_from_level_order([3, 1, 4, None, 2]), 1) == 1


def test_kth_smallest_middle():
    root = build_tree_from_level_order([5, 3, 6, 2, 4, None, None, 1])
    assert kth_smallest(root, 3) == 3
