from solution import num_trees


def test_num_trees_three():
    assert num_trees(3) == 5


def test_num_trees_one():
    assert num_trees(1) == 1


def test_num_trees_two():
    assert num_trees(2) == 2


def test_num_trees_four():
    assert num_trees(4) == 14


def test_num_trees_upper_limit():
    assert num_trees(19) == 1767263190
