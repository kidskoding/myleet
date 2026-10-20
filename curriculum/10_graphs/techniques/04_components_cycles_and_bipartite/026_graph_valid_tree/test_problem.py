from solution import valid_tree


def test_valid_tree_true():
    assert valid_tree(5, [[0, 1], [0, 2], [0, 3], [1, 4]]) is True


def test_valid_tree_cycle_false():
    assert valid_tree(5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]]) is False


def test_valid_tree_disconnected_false():
    assert valid_tree(4, [[0, 1], [2, 3]]) is False
