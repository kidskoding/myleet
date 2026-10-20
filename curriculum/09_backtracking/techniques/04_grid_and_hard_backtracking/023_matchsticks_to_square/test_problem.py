from solution import makesquare


def test_makesquare_normal_true():
    assert makesquare([1, 1, 2, 2, 2]) is True


def test_makesquare_cannot_split():
    assert makesquare([3, 3, 3, 3, 4]) is False


def test_makesquare_too_few_sticks():
    assert makesquare([1, 1, 1]) is False
