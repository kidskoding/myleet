from solution import check_ones_segment


def test_check_ones_segment_two_segments():
    assert check_ones_segment("1001") is False


def test_check_ones_segment_one_segment():
    assert check_ones_segment("110") is True


def test_check_ones_segment_single_char():
    assert check_ones_segment("1") is True


def test_check_ones_segment_trailing_zeros():
    assert check_ones_segment("111000") is True


def test_check_ones_segment_alternating():
    assert check_ones_segment("1010") is False
