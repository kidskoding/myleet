from solution import minimum_jumps


def test_minimum_jumps_normal():
    assert minimum_jumps([14, 4, 18, 1, 15], 3, 15, 9) == 3


def test_minimum_jumps_unreachable():
    assert minimum_jumps([8, 3, 16, 6, 12, 20], 15, 13, 11) == -1


def test_minimum_jumps_backwards_helps():
    assert minimum_jumps([1, 6, 2, 14, 5, 17, 4], 16, 9, 7) == 2
