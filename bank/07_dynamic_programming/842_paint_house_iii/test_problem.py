from solution import min_cost

COST = [[1, 10], [10, 1], [10, 1], [1, 10], [5, 1]]


def test_min_cost_example_all_unpainted():
    assert min_cost([0, 0, 0, 0, 0], COST, 5, 2, 3) == 9


def test_min_cost_example_some_painted():
    assert min_cost([0, 2, 1, 2, 0], COST, 5, 2, 3) == 11


def test_min_cost_example_impossible():
    assert min_cost([3, 1, 2, 3], [[1, 1, 1]] * 4, 4, 3, 3) == -1


def test_min_cost_single_painted_house():
    assert min_cost([1], [[5]], 1, 1, 1) == 0


def test_min_cost_single_unpainted_house():
    assert min_cost([0], [[3, 2]], 1, 2, 1) == 2


def test_min_cost_too_many_neighborhoods_needed():
    assert min_cost([0, 0], [[1, 1], [1, 1]], 2, 2, 3) == -1
