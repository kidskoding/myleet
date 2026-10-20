from solution import can_be_increasing


def test_can_be_increasing_remove_peak():
    assert can_be_increasing([1, 2, 10, 5, 7]) is True


def test_can_be_increasing_two_drops():
    assert can_be_increasing([2, 3, 1, 2]) is False


def test_can_be_increasing_all_equal():
    assert can_be_increasing([1, 1, 1]) is False


def test_can_be_increasing_already_increasing():
    assert can_be_increasing([1, 2, 3]) is True


def test_can_be_increasing_remove_valley():
    assert can_be_increasing([105, 924, 32, 968]) is True


def test_can_be_increasing_remove_first():
    assert can_be_increasing([100, 21, 100]) is True
