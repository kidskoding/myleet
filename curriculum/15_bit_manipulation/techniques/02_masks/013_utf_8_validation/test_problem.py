from solution import valid_utf8


def test_valid_utf8_two_byte_sequence():
    assert valid_utf8([197, 130, 1]) is True


def test_valid_utf8_bad_continuation():
    assert valid_utf8([235, 140, 4]) is False


def test_valid_utf8_four_byte_sequence():
    assert valid_utf8([240, 162, 138, 147]) is True
