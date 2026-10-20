from solution import minimum_cost


def test_minimum_cost_example_one():
    assert minimum_cost([1, 1], [4, 5], [[1, 2, 3, 3, 2], [3, 4, 4, 5, 1]]) == 5


def test_minimum_cost_direct_walk_best():
    roads = [[5, 7, 3, 2, 1], [3, 2, 3, 4, 4], [3, 3, 5, 5, 5], [3, 4, 5, 6, 6]]
    assert minimum_cost([3, 2], [5, 7], roads) == 7


def test_minimum_cost_example_three():
    roads = [[4, 2, 1, 1, 3], [1, 2, 7, 4, 4], [10, 3, 6, 1, 2], [6, 1, 1, 2, 3]]
    assert minimum_cost([1, 1], [10, 4], roads) == 8


def test_minimum_cost_road_too_expensive():
    assert minimum_cost([1, 1], [3, 3], [[1, 1, 3, 3, 10]]) == 4


def test_minimum_cost_road_from_start():
    assert minimum_cost([1, 1], [5, 5], [[1, 1, 5, 5, 1]]) == 1


def test_minimum_cost_chained_roads():
    roads = [[1, 1, 5, 5, 1], [5, 5, 9, 9, 1]]
    assert minimum_cost([1, 1], [9, 9], roads) == 2
