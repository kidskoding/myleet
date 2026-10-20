from solution import is_strobogrammatic


def test_is_strobogrammatic_six_nine():
    assert is_strobogrammatic("69") is True


def test_is_strobogrammatic_eights():
    assert is_strobogrammatic("88") is True


def test_is_strobogrammatic_bad_digit():
    assert is_strobogrammatic("962") is False


def test_is_strobogrammatic_single_digits():
    assert is_strobogrammatic("1") is True
    assert is_strobogrammatic("8") is True
    assert is_strobogrammatic("6") is False
    assert is_strobogrammatic("2") is False


def test_is_strobogrammatic_odd_length():
    assert is_strobogrammatic("818") is True
    assert is_strobogrammatic("619") is True
    assert is_strobogrammatic("609") is True
    assert is_strobogrammatic("101") is True


def test_is_strobogrammatic_mismatched_pair():
    assert is_strobogrammatic("10") is False
    assert is_strobogrammatic("66") is False
