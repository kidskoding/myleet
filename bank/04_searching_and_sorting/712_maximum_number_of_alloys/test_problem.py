from solution import max_number_of_alloys


def test_max_number_of_alloys_example_one():
    assert max_number_of_alloys(3, 2, 15, [[1, 1, 1], [1, 1, 10]], [0, 0, 0], [1, 2, 3]) == 2


def test_max_number_of_alloys_stock_helps_second_machine():
    assert max_number_of_alloys(3, 2, 15, [[1, 1, 1], [1, 1, 10]], [0, 0, 100], [1, 2, 3]) == 5


def test_max_number_of_alloys_example_three():
    assert max_number_of_alloys(2, 3, 10, [[2, 1], [1, 2], [1, 1]], [1, 1], [5, 5]) == 2


def test_max_number_of_alloys_zero_budget_uses_stock():
    assert max_number_of_alloys(2, 1, 0, [[2, 3]], [7, 9], [1, 1]) == 3


def test_max_number_of_alloys_cannot_make_any():
    assert max_number_of_alloys(1, 1, 4, [[1]], [0], [5]) == 0
