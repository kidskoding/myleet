from solution import maximum_value_sum


def test_maximum_value_sum_one_operation():
    assert maximum_value_sum([1, 2, 1], 3, [[0, 1], [0, 2]]) == 6


def test_maximum_value_sum_two_nodes():
    assert maximum_value_sum([2, 3], 7, [[0, 1]]) == 9


def test_maximum_value_sum_no_operation_helps():
    assert maximum_value_sum([7, 7, 7, 7, 7, 7], 3, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]) == 42


def test_maximum_value_sum_odd_gainers_pay_smallest_cost():
    assert maximum_value_sum([0, 0, 0], 5, [[0, 1], [1, 2]]) == 10


def test_maximum_value_sum_far_apart_nodes_on_path():
    assert maximum_value_sum([0, 7, 7, 0], 7, [[0, 1], [1, 2], [2, 3]]) == 28
