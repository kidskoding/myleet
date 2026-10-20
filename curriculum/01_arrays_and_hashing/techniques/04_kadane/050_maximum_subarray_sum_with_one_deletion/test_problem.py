from solution import maximum_sum


def test_maximum_sum_deletes_one_negative():
    assert maximum_sum([1, -2, 0, 3]) == 4


def test_maximum_sum_deletion_not_enough():
    assert maximum_sum([1, -2, -2, 3]) == 3


def test_maximum_sum_all_negative():
    assert maximum_sum([-1, -1, -1, -1]) == -1


def test_maximum_sum_deletes_from_the_middle():
    assert maximum_sum([2, 1, -2, -5, -2]) == 3
