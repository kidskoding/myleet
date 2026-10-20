from solution import check_ways


def test_check_ways_unique_chain():
    assert check_ways([[1, 2], [2, 3]]) == 1


def test_check_ways_interchangeable_nodes():
    assert check_ways([[1, 2], [2, 3], [1, 3]]) == 2


def test_check_ways_impossible():
    assert check_ways([[1, 2], [2, 3], [2, 4], [1, 5]]) == 0


def test_check_ways_single_pair():
    assert check_ways([[1, 2]]) == 2


def test_check_ways_star():
    assert check_ways([[1, 2], [1, 3], [1, 4]]) == 1


def test_check_ways_no_root():
    assert check_ways([[1, 2], [3, 4]]) == 0


def test_check_ways_branching_tree():
    assert check_ways([[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4]]) == 1
