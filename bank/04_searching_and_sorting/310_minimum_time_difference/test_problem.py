from solution import find_min_difference


def test_find_min_difference_across_midnight():
    assert find_min_difference(["23:59", "00:00"]) == 1


def test_find_min_difference_duplicate():
    assert find_min_difference(["00:00", "23:59", "00:00"]) == 0


def test_find_min_difference_simple():
    assert find_min_difference(["12:00", "13:30"]) == 90


def test_find_min_difference_half_day():
    assert find_min_difference(["01:00", "13:00"]) == 720


def test_find_min_difference_wrap_is_smallest():
    assert find_min_difference(["05:31", "22:08", "00:35"]) == 147
