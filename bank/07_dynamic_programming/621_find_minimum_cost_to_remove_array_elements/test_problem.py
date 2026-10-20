from solution import min_cost


def test_min_cost_example_one():
    assert min_cost([6, 2, 8, 4]) == 12


def test_min_cost_example_two():
    assert min_cost([2, 1, 3, 3]) == 5


def test_min_cost_single():
    assert min_cost([7]) == 7


def test_min_cost_two_elements():
    assert min_cost([3, 9]) == 9


def test_min_cost_three_pair_the_large_ones():
    assert min_cost([1, 5, 3]) == 6


def test_min_cost_longer():
    assert min_cost([4, 1, 7, 3, 9, 2, 8]) == 21
