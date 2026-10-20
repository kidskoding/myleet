from binary_tree import build_tree_from_level_order
from solution import get_directions


def test_get_directions_through_root():
    root = build_tree_from_level_order([5, 1, 2, 3, None, 6, 4])
    assert get_directions(root, 3, 6) == "UURL"


def test_get_directions_parent_to_child():
    assert get_directions(build_tree_from_level_order([2, 1]), 2, 1) == "L"


def test_get_directions_reverse_path():
    root = build_tree_from_level_order([5, 1, 2, 3, None, 6, 4])
    assert get_directions(root, 6, 3) == "UULL"


def test_get_directions_siblings():
    assert get_directions(build_tree_from_level_order([1, 2, 3]), 2, 3) == "UR"


def test_get_directions_up_to_ancestor():
    assert get_directions(build_tree_from_level_order([1, 2, None, 3]), 3, 1) == "UU"


def test_get_directions_down_from_root():
    root = build_tree_from_level_order([1, 2, 3, None, None, 4, 5])
    assert get_directions(root, 1, 5) == "RR"
