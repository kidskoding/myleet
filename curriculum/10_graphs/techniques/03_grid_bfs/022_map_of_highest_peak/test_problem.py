from solution import highest_peak


def test_highest_peak_normal_case():
    assert highest_peak([[0, 1], [0, 0]]) == [[1, 0], [2, 1]]


def test_highest_peak_all_water():
    assert highest_peak([[0, 0], [0, 0]]) == [[0, 0], [0, 0]]
