from solution import maximum_or


def test_maximum_or_example_one():
    assert maximum_or([12, 9], 1) == 30


def test_maximum_or_example_two():
    assert maximum_or([8, 1, 2], 2) == 35


def test_maximum_or_single_element():
    assert maximum_or([3], 4) == 48


def test_maximum_or_shift_smaller_element_wins():
    assert maximum_or([7, 6], 1) == 15


def test_maximum_or_duplicates_keep_other_copy():
    assert maximum_or([5, 5], 1) == 15
