from solution import prison_after_n_days


def test_prison_after_n_days_example():
    assert prison_after_n_days([0, 1, 0, 1, 1, 0, 0, 1], 7) == [0, 0, 1, 1, 0, 0, 0, 0]


def test_prison_after_n_days_one_day():
    assert prison_after_n_days([0, 1, 0, 1, 1, 0, 0, 1], 1) == [0, 1, 1, 0, 0, 0, 0, 0]


def test_prison_after_n_days_huge_n():
    assert prison_after_n_days([1, 0, 0, 1, 0, 0, 1, 0], 1000000000) == [0, 0, 1, 1, 1, 1, 1, 0]


def test_prison_after_n_days_all_empty():
    assert prison_after_n_days([0] * 8, 3) == [0, 0, 0, 1, 1, 0, 0, 0]


def test_prison_after_n_days_does_not_mutate_input():
    cells = [1, 1, 0, 1, 1, 0, 1, 1]
    prison_after_n_days(cells, 5)
    assert cells == [1, 1, 0, 1, 1, 0, 1, 1]
