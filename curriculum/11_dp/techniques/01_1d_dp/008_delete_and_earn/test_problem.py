from solution import delete_and_earn


def test_delete_and_earn_small():
    assert delete_and_earn([3, 4, 2]) == 6


def test_delete_and_earn_with_repeats():
    assert delete_and_earn([2, 2, 3, 3, 3, 4]) == 9
