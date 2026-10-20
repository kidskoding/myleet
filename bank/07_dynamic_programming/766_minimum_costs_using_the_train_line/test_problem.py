from solution import minimum_costs


def test_minimum_costs_switch_mid_route():
    assert minimum_costs([1, 6, 9, 5], [5, 2, 3, 10], 8) == [1, 7, 14, 19]


def test_minimum_costs_express_from_start():
    assert minimum_costs([11, 5, 13], [7, 10, 6], 3) == [10, 15, 24]


def test_minimum_costs_single_stop():
    assert minimum_costs([5], [1], 10) == [5]


def test_minimum_costs_express_everywhere():
    assert minimum_costs([10, 10, 10], [1, 1, 1], 2) == [3, 4, 5]


def test_minimum_costs_switch_late():
    assert minimum_costs([1, 100], [100, 1], 1) == [1, 3]
