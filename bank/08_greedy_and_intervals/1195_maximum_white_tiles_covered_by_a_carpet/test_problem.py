from solution import maximum_white_tiles


def test_maximum_white_tiles_example_one():
    assert maximum_white_tiles([[1, 5], [10, 11], [12, 18]], 9) == 9


def test_maximum_white_tiles_example_two():
    assert maximum_white_tiles([[10, 11], [1, 1]], 2) == 2


def test_maximum_white_tiles_single_interval():
    assert maximum_white_tiles([[1, 100]], 10) == 10


def test_maximum_white_tiles_carpet_covers_all():
    assert maximum_white_tiles([[1, 2], [4, 5]], 10) == 4


def test_maximum_white_tiles_short_carpet():
    assert maximum_white_tiles([[1, 5], [10, 15]], 1) == 1
