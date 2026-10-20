from solution import min_cost


def test_min_cost_example():
    assert min_cost([[17, 2, 17], [16, 16, 5], [14, 3, 19]]) == 10


def test_min_cost_single_house():
    assert min_cost([[7, 6, 2]]) == 2


def test_min_cost_no_houses():
    assert min_cost([]) == 0


def test_min_cost_two_houses():
    assert min_cost([[1, 5, 3], [2, 9, 4]]) == 5


def test_min_cost_greedy_fails():
    assert min_cost([[1, 2, 100], [1, 100, 100]]) == 3
