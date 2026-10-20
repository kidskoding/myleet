from solution import maximum_subtree_size


def test_maximum_subtree_size_mixed_star():
    assert maximum_subtree_size([[0, 1], [0, 2], [0, 3]], [1, 1, 2, 3]) == 1


def test_maximum_subtree_size_uniform_star():
    assert maximum_subtree_size([[0, 1], [0, 2], [0, 3]], [1, 1, 1, 1]) == 4


def test_maximum_subtree_size_inner_subtree():
    assert maximum_subtree_size([[0, 1], [0, 2], [2, 3], [2, 4]], [1, 2, 3, 3, 3]) == 3


def test_maximum_subtree_size_single_node():
    assert maximum_subtree_size([], [7]) == 1


def test_maximum_subtree_size_chain_below_root():
    assert maximum_subtree_size([[0, 1], [1, 2], [2, 3]], [1, 2, 2, 2]) == 3


def test_maximum_subtree_size_reversed_edges():
    assert maximum_subtree_size([[1, 0], [2, 1]], [5, 5, 5]) == 3
