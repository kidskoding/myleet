from solution import minimum_time


def test_minimum_time_normal_case():
    assert minimum_time(3, [[1, 3], [2, 3]], [3, 2, 5]) == 8


def test_minimum_time_no_relations():
    assert minimum_time(1, [], [5]) == 5
