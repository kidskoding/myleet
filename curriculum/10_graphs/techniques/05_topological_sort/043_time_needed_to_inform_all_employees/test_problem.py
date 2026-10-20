from solution import num_of_minutes


def test_num_of_minutes_normal_case():
    assert num_of_minutes(6, 2, [2, 2, -1, 2, 2, 2], [0, 0, 1, 0, 0, 0]) == 1


def test_num_of_minutes_single_employee():
    assert num_of_minutes(1, 0, [-1], [0]) == 0
