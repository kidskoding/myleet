from solution import find_max_val


def test_find_max_val_peak_between_restrictions():
    assert find_max_val(10, [[3, 1], [8, 1]], [2, 2, 3, 1, 4, 5, 1, 1, 2]) == 6


def test_find_max_val_climbs_after_restriction():
    assert find_max_val(8, [[3, 2]], [3, 5, 2, 4, 2, 3, 1]) == 12


def test_find_max_val_two_elements():
    assert find_max_val(2, [[1, 1]], [5]) == 1


def test_find_max_val_loose_restriction():
    assert find_max_val(3, [[1, 10]], [2, 3]) == 5


def test_find_max_val_restriction_on_last_pulls_back():
    assert find_max_val(4, [[3, 1]], [5, 5, 5]) == 6
