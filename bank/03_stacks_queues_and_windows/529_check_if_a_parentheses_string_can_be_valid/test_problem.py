from solution import can_be_valid


def test_can_be_valid_flip_unlocked():
    assert can_be_valid("))()))", "010100") is True


def test_can_be_valid_already_valid():
    assert can_be_valid("()()", "0000") is True


def test_can_be_valid_odd_length():
    assert can_be_valid(")", "0") is False


def test_can_be_valid_mostly_locked():
    assert can_be_valid("(((())(((())", "111111010111") is True


def test_can_be_valid_locked_closer_first():
    assert can_be_valid(")(", "10") is False


def test_can_be_valid_locked_opener_last():
    assert can_be_valid("()((", "0001") is False
