from solution import find_min_arrow_shots


def test_find_min_arrow_shots_empty():
    assert find_min_arrow_shots([]) == 0


def test_find_min_arrow_shots_single_balloon():
    assert find_min_arrow_shots([[1, 2]]) == 1


def test_find_min_arrow_shots_normal():
    assert find_min_arrow_shots([[10, 16], [2, 8], [1, 6], [7, 12]]) == 2


def test_find_min_arrow_shots_no_overlap():
    assert find_min_arrow_shots([[1, 2], [3, 4], [5, 6], [7, 8]]) == 4
