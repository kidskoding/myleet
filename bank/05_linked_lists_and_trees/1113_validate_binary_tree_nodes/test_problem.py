from solution import validate_binary_tree_nodes


def test_validate_binary_tree_nodes_valid():
    assert validate_binary_tree_nodes(4, [1, -1, 3, -1], [2, -1, -1, -1]) is True


def test_validate_binary_tree_nodes_two_parents():
    assert validate_binary_tree_nodes(4, [1, -1, 3, -1], [2, 3, -1, -1]) is False


def test_validate_binary_tree_nodes_cycle_without_root():
    assert validate_binary_tree_nodes(2, [1, 0], [-1, -1]) is False


def test_validate_binary_tree_nodes_single_node():
    assert validate_binary_tree_nodes(1, [-1], [-1]) is True


def test_validate_binary_tree_nodes_forest():
    assert validate_binary_tree_nodes(3, [-1, -1, -1], [-1, -1, -1]) is False


def test_validate_binary_tree_nodes_root_plus_detached_cycle():
    assert validate_binary_tree_nodes(4, [1, 0, 3, -1], [-1, -1, -1, -1]) is False


def test_validate_binary_tree_nodes_root_not_zero():
    assert validate_binary_tree_nodes(3, [-1, -1, 0], [-1, -1, 1]) is True
