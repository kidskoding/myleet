from solution import find_buildings


def test_find_buildings_mixed():
    assert find_buildings([4, 2, 3, 1]) == [0, 2, 3]


def test_find_buildings_strictly_decreasing():
    assert find_buildings([4, 3, 2, 1]) == [0, 1, 2, 3]


def test_find_buildings_tallest_last():
    assert find_buildings([1, 3, 2, 4]) == [3]


def test_find_buildings_equal_heights_block():
    assert find_buildings([2, 2, 2]) == [2]


def test_find_buildings_single():
    assert find_buildings([5]) == [0]


def test_find_buildings_skips_shorter():
    assert find_buildings([6, 1, 5, 2, 3]) == [0, 2, 4]
