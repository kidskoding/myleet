from solution import min_cost


def test_min_cost_reorder_is_free():
    assert min_cost([10, 20], [20, 10]) == 0


def test_min_cost_one_paid_swap():
    assert min_cost([10, 10], [20, 20]) == 1


def test_min_cost_impossible():
    assert min_cost([10, 20], [30, 40]) == -1


def test_min_cost_odd_total_count():
    assert min_cost([1, 2, 3], [1, 2, 4]) == -1


def test_min_cost_already_identical():
    assert min_cost([5, 5, 5, 5], [5, 5, 5, 5]) == 0


def test_min_cost_two_swaps():
    assert min_cost([1, 1, 2, 2], [3, 3, 4, 4]) == 2
    assert min_cost([1, 1, 1, 1], [2, 2, 2, 2]) == 2
