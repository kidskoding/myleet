from solution import maximum_beauty


def test_maximum_beauty_one_complete():
    assert maximum_beauty([1, 3, 1, 1], 7, 6, 12, 1) == 14


def test_maximum_beauty_leave_one_incomplete():
    assert maximum_beauty([2, 4, 5, 3], 10, 5, 2, 6) == 30


def test_maximum_beauty_already_complete():
    assert maximum_beauty([5, 6], 1, 5, 10, 3) == 20


def test_maximum_beauty_cannot_complete_any():
    assert maximum_beauty([1, 1], 1, 10, 100, 2) == 2


def test_maximum_beauty_complete_all_when_full_is_big():
    assert maximum_beauty([1, 2], 5, 4, 100, 1) == 200


def test_maximum_beauty_single_garden_partial_only():
    assert maximum_beauty([1], 2, 10, 5, 3) == 9
