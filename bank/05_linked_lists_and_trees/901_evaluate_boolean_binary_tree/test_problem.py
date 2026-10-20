from binary_tree import build_tree_from_level_order
from solution import evaluate_tree


def test_evaluate_tree_example():
    assert evaluate_tree(build_tree_from_level_order([2, 1, 3, None, None, 0, 1])) is True


def test_evaluate_tree_single_false_leaf():
    assert evaluate_tree(build_tree_from_level_order([0])) is False


def test_evaluate_tree_single_true_leaf():
    assert evaluate_tree(build_tree_from_level_order([1])) is True


def test_evaluate_tree_and_with_false():
    assert evaluate_tree(build_tree_from_level_order([3, 1, 0])) is False


def test_evaluate_tree_or_of_falses():
    assert evaluate_tree(build_tree_from_level_order([2, 0, 0])) is False


def test_evaluate_tree_nested_operators():
    assert evaluate_tree(build_tree_from_level_order([3, 2, 1, 1, 0])) is True
