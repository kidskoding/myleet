from solution import odd_even_jumps


def test_odd_even_jumps_normal():
    assert odd_even_jumps([10, 13, 12, 14, 15]) == 2


def test_odd_even_jumps_more_starts():
    assert odd_even_jumps([2, 3, 1, 1, 4]) == 3


def test_odd_even_jumps_descending_helps():
    assert odd_even_jumps([5, 1, 3, 4, 2]) == 3
