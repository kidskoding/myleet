from solution import num_rescue_boats


def test_num_rescue_boats_single_person():
    assert num_rescue_boats([3], 3) == 1


def test_num_rescue_boats_pairs_fit():
    assert num_rescue_boats([3, 2, 2, 1], 3) == 3


def test_num_rescue_boats_all_pair():
    assert num_rescue_boats([1, 2], 3) == 1
