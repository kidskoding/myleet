from solution import max_satisfied


def test_max_satisfied_uses_window():
    customers = [1, 0, 1, 2, 1, 1, 7, 5]
    grumpy = [0, 1, 0, 1, 0, 1, 0, 1]

    assert max_satisfied(customers, grumpy, 3) == 16


def test_max_satisfied_single_minute():
    assert max_satisfied([1], [0], 1) == 1
