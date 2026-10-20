from solution import check_possibility


def test_check_possibility_lower_first():
    assert check_possibility([4, 2, 3]) is True


def test_check_possibility_two_drops():
    assert check_possibility([4, 2, 1]) is False


def test_check_possibility_single():
    assert check_possibility([1]) is True


def test_check_possibility_cannot_fix_either_side():
    assert check_possibility([3, 4, 2, 3]) is False


def test_check_possibility_raise_right():
    assert check_possibility([5, 7, 1, 8]) is True


def test_check_possibility_negative_values():
    assert check_possibility([-1, 4, 2, 3]) is True
