from solution import num_rescue_boats


def test_num_rescue_boats_normal():
    assert num_rescue_boats([3, 2, 2, 1], 3) == 3


def test_num_rescue_boats_all_pair():
    assert num_rescue_boats([3, 5, 3, 4], 5) == 4


def test_num_rescue_boats_single_person():
    assert num_rescue_boats([5], 5) == 1


def test_num_rescue_boats_empty():
    assert num_rescue_boats([], 5) == 0
