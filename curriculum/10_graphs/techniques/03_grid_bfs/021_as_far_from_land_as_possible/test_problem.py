from solution import max_distance


def test_max_distance_normal_case():
    assert max_distance([[1, 0, 1], [0, 0, 0], [1, 0, 1]]) == 2


def test_max_distance_all_land():
    assert max_distance([[1, 1], [1, 1]]) == -1
