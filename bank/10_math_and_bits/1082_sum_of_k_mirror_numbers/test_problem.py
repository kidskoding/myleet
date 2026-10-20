from solution import k_mirror


def test_k_mirror_base_two():
    assert k_mirror(2, 5) == 25


def test_k_mirror_base_three():
    assert k_mirror(3, 7) == 499


def test_k_mirror_base_seven():
    assert k_mirror(7, 17) == 20379000


def test_k_mirror_first_only():
    assert k_mirror(2, 1) == 1


def test_k_mirror_base_nine():
    assert k_mirror(9, 10) == 509
