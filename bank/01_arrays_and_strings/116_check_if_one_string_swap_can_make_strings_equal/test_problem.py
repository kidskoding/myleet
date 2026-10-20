from solution import are_almost_equal


def test_are_almost_equal_one_swap():
    assert are_almost_equal("bank", "kanb") is True


def test_are_almost_equal_different_letters():
    assert are_almost_equal("attack", "defend") is False


def test_are_almost_equal_already_equal():
    assert are_almost_equal("kelb", "kelb") is True


def test_are_almost_equal_needs_two_swaps():
    assert are_almost_equal("abcd", "dcba") is False


def test_are_almost_equal_two_mismatches_not_crossing():
    assert are_almost_equal("aa", "ac") is False
    assert are_almost_equal("ab", "ba") is True
